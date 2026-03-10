const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const prisma = new PrismaClient();

const migrationsDir = path.join(__dirname, 'migrations');

function runCommand(command) {
    execSync(command, { stdio: 'inherit' });
}

async function ensureMigrationTable() {
    await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "_AppMigrations" (
            "name" TEXT PRIMARY KEY,
            "executedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
}

async function isApplied(name) {
    const rows = await prisma.$queryRawUnsafe(
        'SELECT 1 FROM "_AppMigrations" WHERE "name" = $1 LIMIT 1',
        name
    );
    return rows.length > 0;
}

async function markApplied(name) {
    await prisma.$executeRawUnsafe(
        'INSERT INTO "_AppMigrations" ("name") VALUES ($1) ON CONFLICT ("name") DO NOTHING',
        name
    );
}

function getSqlFiles() {
    if (!fs.existsSync(migrationsDir)) return [];
    return fs
        .readdirSync(migrationsDir)
        .filter((file) => file.endsWith('.sql'))
        .sort();
}

async function runMigrations() {
    console.log('🔄 Running database migrations...\n');

    try {
        await prisma.$queryRawUnsafe('SELECT 1');
        await ensureMigrationTable();

        const migrationFiles = getSqlFiles();

        if (migrationFiles.length === 0) {
            console.log('ℹ️ No custom SQL migrations found in prisma/migrations');
            return;
        }

        for (const migrationFile of migrationFiles) {
            const alreadyApplied = await isApplied(migrationFile);
            if (alreadyApplied) {
                console.log(`⏭️  Skipping already applied migration: ${migrationFile}`);
                continue;
            }

            const fullPath = path.join('prisma', 'migrations', migrationFile);
            console.log(`▶️  Applying migration: ${migrationFile}`);
            runCommand(`npx prisma db execute --schema prisma/schema.prisma --file "${fullPath}"`);
            await markApplied(migrationFile);
            console.log(`✅ Applied: ${migrationFile}\n`);
        }

        console.log('✅ Migration process completed successfully');
    } catch (error) {
        console.error('❌ Migration process failed:', error.message || error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

runMigrations();
