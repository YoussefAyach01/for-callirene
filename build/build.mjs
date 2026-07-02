/**
 * Build script for Callirene's birthday site.
 *
 * 1. Compresses every photo in assets/photos/ and inlines them as base64
 * 2. Inlines assets/song.mp3 as base64 (skipped gracefully if missing)
 * 3. Injects both into src/site.html
 * 4. Encrypts the result with StatiCrypt (AES-256) -> docs/index.html
 *
 * Usage:  node build/build.mjs <password>
 *    or:  set SITE_PASSWORD env var and run `npm run build`
 */
import { readFile, writeFile, readdir, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const p = (...s) => path.join(root, ...s);

const password = process.argv[2] || process.env.SITE_PASSWORD;
if (!password) {
  console.error('❌ No password. Usage: node build/build.mjs <password>');
  process.exit(1);
}
if (password.length < 4) {
  console.error('❌ Password too short — use at least 4 characters.');
  process.exit(1);
}

/* ---------- 1. photos ---------- */
const PHOTO_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.heic', '.avif']);
let photos = [];
if (existsSync(p('assets', 'photos'))) {
  const files = (await readdir(p('assets', 'photos')))
    .filter(f => PHOTO_EXT.has(path.extname(f).toLowerCase()))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  // captions: assets/captions.txt — one caption per line, same order as
  // the (alphabetically sorted) photos. Lines starting with # are ignored.
  let captions = [];
  if (existsSync(p('assets', 'captions.txt'))) {
    captions = (await readFile(p('assets', 'captions.txt'), 'utf8'))
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('#'));
  }

  for (let i = 0; i < files.length; i++) {
    const file = p('assets', 'photos', files[i]);
    const buf = await sharp(file)
      .rotate() // respect EXIF orientation
      .resize({ width: 1000, height: 1000, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 78, mozjpeg: true })
      .toBuffer();
    photos.push({
      src: `data:image/jpeg;base64,${buf.toString('base64')}`,
      caption: captions[i] || '',
    });
    console.log(`📸 ${files[i]} -> ${(buf.length / 1024).toFixed(0)} KB`);
  }
}
if (!photos.length) console.log('⚠️  No photos found in assets/photos/ — gallery will show placeholders.');

/* ---------- 2. song ---------- */
let songDataUri = '';
if (existsSync(p('assets', 'song.mp3'))) {
  const buf = await readFile(p('assets', 'song.mp3'));
  songDataUri = `data:audio/mpeg;base64,${buf.toString('base64')}`;
  console.log(`🎵 song.mp3 -> ${(buf.length / 1024 / 1024).toFixed(1)} MB`);
} else {
  console.log('⚠️  No assets/song.mp3 — music player will hide itself.');
}

/* ---------- 3. inject into the page ---------- */
let html = await readFile(p('src', 'site.html'), 'utf8');
const before = html.length;
html = html.replace('/*__PHOTOS__*/[]', JSON.stringify(photos));
html = html.replace('/*__SONG__*/"../assets/song.mp3"', JSON.stringify(songDataUri));
if (html.length === before && (photos.length || songDataUri)) {
  console.error('❌ Injection markers not found in src/site.html — did they get edited?');
  process.exit(1);
}

const tmpDir = p('build', 'tmp');
await rm(tmpDir, { recursive: true, force: true });
await mkdir(tmpDir, { recursive: true });
await writeFile(path.join(tmpDir, 'index.html'), html);
console.log(`📄 Inlined page: ${(html.length / 1024 / 1024).toFixed(1)} MB`);

/* ---------- 4. encrypt ---------- */
// resolve staticrypt's CLI entry so we can run it with plain `node`
// (avoids Windows npx/.cmd spawning issues)
const scPkg = JSON.parse(await readFile(p('node_modules', 'staticrypt', 'package.json'), 'utf8'));
const scBin = p('node_modules', 'staticrypt', typeof scPkg.bin === 'string' ? scPkg.bin : Object.values(scPkg.bin)[0]);

await mkdir(p('docs'), { recursive: true });
execFileSync(process.execPath, [
  scBin,
  path.join(tmpDir, 'index.html'),
  '-p', password,
  '-d', p('docs'),
  '--short',
  '--remember', '365',
  '--template-title', 'For Salma 💗',
  '--template-instructions', 'Something special is locked in here… Un secret pour toi ✨ Enter the magic word:',
  '--template-button', 'Open 💗',
  '--template-placeholder', 'The magic word…',
  '--template-error', 'Not quite… try again 💗',
  '--template-color-primary', '#f26bad',
  '--template-color-secondary', '#fff4fa',
  '--template-remember', 'Remember me on this phone',
], { stdio: 'inherit', cwd: root });

// clean up the plaintext temp file — it must never be committed
await rm(tmpDir, { recursive: true, force: true });

console.log('\n✅ Done! Encrypted site written to docs/index.html');
console.log(`🔑 Password: ${password}`);
console.log('👉 Preview: open docs/index.html in a browser and enter the password.');
