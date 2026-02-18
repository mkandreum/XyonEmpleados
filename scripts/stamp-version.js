import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

async function main() {
  const root = path.resolve(process.cwd());
  const indexPath = path.join(root, 'index.html');

  const buildVersion = process.env.BUILD_VERSION
    || Math.floor(Date.now() / 1000).toString();

  const buildTime = new Date().toISOString();

  // 1. Stamp index.html
  const html = await fs.readFile(indexPath, 'utf8');
  if (html.includes('__BUILD_VERSION__')) {
    const stamped = html.replace(/__BUILD_VERSION__/g, buildVersion);
    await fs.writeFile(indexPath, stamped, 'utf8');
    console.log(`[stamp-version] Stamped index.html with version ${buildVersion}`);
  } else {
    console.warn('[stamp-version] Placeholder __BUILD_VERSION__ not found in index.html; skipping');
  }

  // 2. Write version.json for backend /api/version endpoint
  const versionJson = { version: buildVersion, buildTime };
  const backendVersionPath = path.join(root, 'backend', 'version.json');
  await fs.writeFile(backendVersionPath, JSON.stringify(versionJson, null, 2), 'utf8');
  console.log(`[stamp-version] Wrote backend/version.json: ${JSON.stringify(versionJson)}`);
}

main().catch((err) => {
  console.error('[stamp-version] Failed to stamp version', err);
  process.exit(1);
});
