/**
 * Copy client/dist → server/public so Express can serve the Mini App
 * from a path next to the server code (Railway-friendly).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const src = path.join(root, 'client', 'dist');
const dest = path.join(root, 'server', 'public');

function copyRecursive(from, to) {
  if (!fs.existsSync(from)) {
    console.error('[copy-client] ERROR: client/dist not found at', from);
    console.error('Did vite build succeed?');
    process.exit(1);
  }
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const s = path.join(from, entry.name);
    const d = path.join(to, entry.name);
    if (entry.isDirectory()) copyRecursive(s, d);
    else fs.copyFileSync(s, d);
  }
}

// Clean dest first
if (fs.existsSync(dest)) {
  fs.rmSync(dest, { recursive: true, force: true });
}
copyRecursive(src, dest);
console.log('[copy-client] OK →', dest);
const index = path.join(dest, 'index.html');
if (!fs.existsSync(index)) {
  console.error('[copy-client] index.html missing after copy');
  process.exit(1);
}
console.log('[copy-client] index.html ready');
