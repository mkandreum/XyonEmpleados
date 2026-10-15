/**
 * Automatic, safe database migration — runs on every container start (Coolify, docker compose).
 *
 *  1. Waits for the database and takes an advisory lock (only one container migrates at a time).
 *  2. If anything is pending, makes a pg_dump backup in /app/uploads/backups first (keeps the last N).
 *  3. Fresh database: creates the schema from schema.prisma before the SQL files.
 *  4. Applies pending prisma/migrations/*.sql in name order, recording them in "_AppMigrations".
 *  5. Additive sync with schema.prisma: creates missing tables/columns/indexes/enum values.
 *     Destructive statements (DROP, type changes, renames…) are NEVER run automatically — they are logged.
 *
 * Env:
 *   DATABASE_URL                required
 *   MIGRATION_BACKUPS_DIR       default <app>/uploads/backups
 *   MIGRATION_BACKUPS_KEEP      default 5
 *   MIGRATE_WITHOUT_BACKUP=1    allow migrating when pg_dump is unavailable or fails (not recommended)
 *   MIGRATION_SKIP_SCHEMA_SYNC=1 only run the SQL files
 */
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const APP_DIR = path.join(__dirname, '..');
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');
const SCHEMA = path.join(__dirname, 'schema.prisma');
const BACKUPS_DIR = process.env.MIGRATION_BACKUPS_DIR || path.join(APP_DIR, 'uploads', 'backups');
const KEEP = Math.max(1, parseInt(process.env.MIGRATION_BACKUPS_KEEP || '5', 10) || 5);
const LOCK_KEY = 727001; // arbitrary, app-wide advisory lock id
const PRISMA_BIN = path.join(APP_DIR, 'node_modules', '.bin', process.platform === 'win32' ? 'prisma.cmd' : 'prisma');

const log = (...a) => console.log('[migrate]', ...a);
const warn = (...a) => console.warn('[migrate] ⚠️', ...a);

if (!process.env.DATABASE_URL) {
    console.error('[migrate] ❌ DATABASE_URL is not set');
    process.exit(1);
}

// One connection only, so the session-level advisory lock really belongs to this process.
const withSingleConnection = (url) => url + (url.includes('?') ? '&' : '?') + 'connection_limit=1';
const prisma = new PrismaClient({ datasources: { db: { url: withSingleConnection(process.env.DATABASE_URL) } } });

/** Runs the local Prisma CLI (never `npx`, which could download a different version at runtime). */
function prismaCli(args, { input, quiet } = {}) {
    if (!fs.existsSync(PRISMA_BIN)) {
        throw new Error(`Prisma CLI not found at ${PRISMA_BIN}. "prisma" must be in "dependencies" (not devDependencies).`);
    }
    return execFileSync(PRISMA_BIN, args, {
        cwd: APP_DIR,
        input,
        encoding: 'utf8',
        stdio: [input ? 'pipe' : 'ignore', 'pipe', quiet ? 'pipe' : 'inherit'],
        env: process.env,
        shell: process.platform === 'win32',
    });
}

async function waitForDatabase(retries = 30) {
    for (let i = 1; i <= retries; i++) {
        try {
            await prisma.$queryRawUnsafe('SELECT 1');
            return;
        } catch (e) {
            if (i === retries) throw e;
            log(`database not ready (${i}/${retries}), retrying in 2s…`);
            await new Promise(r => setTimeout(r, 2000));
        }
    }
}

async function ensureMigrationTable() {
    await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "_AppMigrations" (
            "name" TEXT PRIMARY KEY,
            "executedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
}

async function appliedNames() {
    const rows = await prisma.$queryRawUnsafe('SELECT "name" FROM "_AppMigrations"');
    return new Set(rows.map(r => r.name));
}

function sqlFiles() {
    if (!fs.existsSync(MIGRATIONS_DIR)) return [];
    return fs.readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql')).sort();
}

async function isFreshDatabase() {
    const rows = await prisma.$queryRawUnsafe(`SELECT to_regclass('public."User"') IS NULL AS fresh`);
    return rows[0]?.fresh === true;
}

/** SQL needed to bring the database to schema.prisma (empty string when in sync). */
function schemaDiff() {
    const out = prismaCli([
        'migrate', 'diff',
        '--from-url', process.env.DATABASE_URL,
        '--to-schema-datamodel', SCHEMA,
        '--script',
    ], { quiet: true });
    return out.replace(/^-- This is an empty migration\.\s*$/m, '').trim();
}

const DESTRUCTIVE = [
    /\bDROP\b/i,                         // tables, columns, indexes, types, constraints, defaults
    /\bRENAME\b/i,
    /\bALTER\s+COLUMN\b[^;]*\bTYPE\b/i,  // type changes can lose data
    /\bSET\s+NOT\s+NULL\b/i,             // fails / rewrites existing rows
    /\bTRUNCATE\b|^\s*DELETE\s+FROM\b/im, // ("ON DELETE CASCADE" in foreign keys is fine)
    /^\s*(BEGIN|COMMIT)\b/i,             // enum recreation blocks (drop + recreate)
];

/** Splits Prisma's diff script into statements, keeping only the additive ones. */
function splitDiff(script) {
    const statements = script
        .split(/;\s*(?:\r?\n|$)/)
        .map(s => s.replace(/^\s*--.*$/gm, '').trim())
        .filter(Boolean);
    const safe = [];
    const skipped = [];
    for (const st of statements) (DESTRUCTIVE.some(re => re.test(st)) ? skipped : safe).push(st);
    return { safe, skipped };
}

function executeSql(sql) {
    prismaCli(['db', 'execute', '--schema', SCHEMA, '--stdin'], { input: sql });
}

/** Applies additive schema changes one by one; returns the statements left for a human to review. */
function additiveSync(label) {
    if (process.env.MIGRATION_SKIP_SCHEMA_SYNC === '1') return [];
    const script = schemaDiff();
    if (!script) {
        log(`${label}: schema already in sync`);
        return [];
    }
    const { safe, skipped } = splitDiff(script);
    for (const st of safe) {
        try {
            executeSql(st + ';');
            log(`${label}: ✅ ${st.split('\n')[0].slice(0, 110)}`);
        } catch (e) {
            warn(`${label}: could not apply → ${st.split('\n')[0].slice(0, 110)} (${e.message.split('\n')[0]})`);
        }
    }
    return skipped;
}

function pgDumpAvailable() {
    try {
        execFileSync('pg_dump', ['--version'], { stdio: 'ignore' });
        return true;
    } catch {
        return false;
    }
}

/** pg_dump (custom, compressed format) before changing anything; keeps the newest KEEP files. */
function backup(reason) {
    if (!pgDumpAvailable()) throw new Error('pg_dump is not installed in the image');
    fs.mkdirSync(BACKUPS_DIR, { recursive: true, mode: 0o700 });
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '-');
    const file = path.join(BACKUPS_DIR, `pre-migrate-${stamp}.dump`);
    // libpq does not understand Prisma-only URL params (e.g. ?schema=public)
    const url = new URL(process.env.DATABASE_URL);
    for (const p of ['schema', 'connection_limit', 'pool_timeout', 'pgbouncer']) url.searchParams.delete(p);
    execFileSync('pg_dump', ['--format=custom', '--no-owner', '--file', file, url.toString()], { stdio: ['ignore', 'inherit', 'inherit'] });
    fs.chmodSync(file, 0o600);
    const sizeMb = (fs.statSync(file).size / 1024 / 1024).toFixed(1);
    log(`💾 backup (${reason}) → ${file} (${sizeMb} MB)`);

    const old = fs.readdirSync(BACKUPS_DIR).filter(f => f.startsWith('pre-migrate-') && f.endsWith('.dump')).sort().reverse().slice(KEEP);
    for (const f of old) fs.rmSync(path.join(BACKUPS_DIR, f), { force: true });
}

async function main() {
    log('starting');
    await waitForDatabase();
    await prisma.$executeRawUnsafe(`SELECT pg_advisory_lock(${LOCK_KEY})`);
    log('🔒 lock acquired');
    try {
        await ensureMigrationTable();
        const fresh = await isFreshDatabase();
        const done = await appliedNames();
        const pending = sqlFiles().filter(f => !done.has(f));

        let diffPending = false;
        if (!fresh && process.env.MIGRATION_SKIP_SCHEMA_SYNC !== '1') {
            diffPending = splitDiff(schemaDiff()).safe.length > 0;
        }

        if (!fresh && (pending.length > 0 || diffPending)) {
            try {
                backup(pending.length ? `${pending.length} SQL pendiente(s)` : 'sincronización de esquema');
            } catch (e) {
                if (process.env.MIGRATE_WITHOUT_BACKUP === '1') warn(`backup failed, continuing because MIGRATE_WITHOUT_BACKUP=1: ${e.message}`);
                else throw new Error(`backup failed, nothing was changed: ${e.message}. Set MIGRATE_WITHOUT_BACKUP=1 to override.`);
            }
        }

        // Fresh database: build the schema first so the SQL files find their tables.
        if (fresh) {
            log('fresh database: creating schema from schema.prisma');
            additiveSync('init');
        }

        for (const file of pending) {
            log(`▶️  applying ${file}`);
            executeSql(fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8'));
            await prisma.$executeRawUnsafe('INSERT INTO "_AppMigrations" ("name") VALUES ($1) ON CONFLICT ("name") DO NOTHING', file);
            log(`✅ ${file}`);
        }
        if (!pending.length) log('no pending SQL migrations');

        const skipped = additiveSync('sync');
        if (skipped.length) {
            warn(`${skipped.length} destructive change(s) were NOT applied automatically (review them; they need a manual SQL migration):`);
            for (const st of skipped) warn('   ' + st.split('\n')[0].slice(0, 160));
        }
        log('✅ done');
    } finally {
        await prisma.$executeRawUnsafe(`SELECT pg_advisory_unlock(${LOCK_KEY})`).catch(() => {});
        await prisma.$disconnect();
    }
}

main().catch(async (e) => {
    console.error('[migrate] ❌', e.message || e);
    await prisma.$disconnect().catch(() => {});
    process.exit(1);
});
