import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const buildDir = path.join(rootDir, "electron", "build");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="80" fill="#1a120b"/>
  <rect x="60" y="60" width="392" height="392" rx="40" fill="#2d1f14"/>
  <rect x="100" y="120" width="140" height="180" rx="16" fill="#4a3728"/>
  <rect x="100" y="320" width="140" height="60" rx="8" fill="#8b7355"/>
  <rect x="260" y="120" width="60" height="60" rx="12" fill="#c9a86c"/>
  <rect x="340" y="120" width="60" height="60" rx="12" fill="#c9a86c"/>
  <rect x="260" y="200" width="80" height="80" rx="12" fill="#c9a86c"/>
  <rect x="260" y="300" width="60" height="60" rx="12" fill="#c9a86c"/>
  <rect x="340" y="300" width="60" height="60" rx="12" fill="#c9a86c"/>
  <text x="256" y="440" font-family="sans-serif" font-size="48" font-weight="bold" fill="#f3e6cf" text-anchor="middle">MV</text>
</svg>`;

async function createIco(pngBuffers) {
  const numImages = pngBuffers.length;
  const headerSize = 6 + numImages * 16;
  let offset = headerSize;

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(numImages, 4);

  const entries = Buffer.alloc(numImages * 16);
  const imageData = [];

  for (let i = 0; i < pngBuffers.length; i++) {
    const buf = pngBuffers[i];
    const metadata = await sharp(buf).metadata();
    const width = metadata.width;
    const height = metadata.height;
    const size = width === 256 ? 0 : width;
    entries.writeUInt8(size, i * 16);
    entries.writeUInt8(size, i * 16 + 1);
    entries.writeUInt8(0, i * 16 + 2);
    entries.writeUInt8(0, i * 16 + 3);
    entries.writeUInt16LE(0, i * 16 + 4);
    entries.writeUInt16LE(1, i * 16 + 6);
    entries.writeUInt32LE(buf.length, i * 16 + 8);
    entries.writeUInt32LE(offset, i * 16 + 12);
    offset += buf.length;
    imageData.push(buf);
  }

  return Buffer.concat([header, entries, ...imageData]);
}

async function generateIcons() {
  const buffer = Buffer.from(svg);

  for (const size of [16, 24, 32, 48, 64, 128, 256, 512]) {
    await sharp(buffer)
      .resize(size, size)
      .png()
      .toFile(path.join(buildDir, `icon-${size}.png`));
    console.log(`Created icon-${size}.png`);
  }

  await sharp(buffer)
    .resize(256, 256)
    .png()
    .toFile(path.join(buildDir, "icon.png"));
  console.log("Created icon.png");

  const ico16 = await sharp(buffer).resize(16, 16).png().toBuffer();
  const ico32 = await sharp(buffer).resize(32, 32).png().toBuffer();
  const ico48 = await sharp(buffer).resize(48, 48).png().toBuffer();
  const ico256 = await sharp(buffer).resize(256, 256).png().toBuffer();

  const icoBuffer = await createIco([ico16, ico32, ico48, ico256]);
  fs.writeFileSync(path.join(buildDir, "icon.ico"), icoBuffer);
  console.log("Created icon.ico");

  await sharp(buffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(buildDir, "icon.icns"));
  console.log("Created icon.icns (PNG - macOS builder will convert if needed)");

  console.log("\n✓ All icons generated in electron/build/");
}

generateIcons().catch(console.error);