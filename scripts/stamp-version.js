import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

async function main() {
  const root = path.resolve(process.cwd());
  const indexPath = path.join(root, 'index.html');

  const buildVersion = process.env.BUILD_VERSION
    || Math.floor(Date.now() / 1000).toString()
    || crypto.randomBytes(6).toString('hex');

  const html = await fs.readFile(indexPath, 'utf8');

  if (!html.includes('__BUILD_VERSION__')) {
    console.warn('[stamp-version] Placeholder __BUILD_VERSION__ not found; skipping');
    return;
  }

  const stamped = html.replace(/__BUILD_VERSION__/g, buildVersion);
  await fs.writeFile(indexPath, stamped, 'utf8');
  console.log(`[stamp-version] Set build version to ${buildVersion}`);
}

main().catch((err) => {
  console.error('[stamp-version] Failed to stamp version', err);
  process.exit(1);
});
