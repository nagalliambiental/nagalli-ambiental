const fs = require("fs");
const path = require("path");

const iconsDir = path.resolve(__dirname, "..", "src-tauri", "icons");

// Minimal 1x1 blue PNG (base64)
const pngBase64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

const png = Buffer.from(pngBase64, "base64");

const sizes = [
  { name: "32x32.png", size: 32 },
  { name: "128x128.png", size: 128 },
  { name: "128x128@2x.png", size: 256 },
];

fs.mkdirSync(iconsDir, { recursive: true });

for (const { name } of sizes) {
  fs.writeFileSync(path.join(iconsDir, name), png);
}

// ICO file format (valid for Windows RC)
function createIco(pngData) {
  const count = 1;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);       // reserved
  header.writeUInt16LE(1, 2);       // type: 1 = icon
  header.writeUInt16LE(count, 4);   // image count

  const dirEntry = Buffer.alloc(16);
  dirEntry.writeUInt8(0, 0);        // width  (0 = 256)
  dirEntry.writeUInt8(0, 1);        // height (0 = 256)
  dirEntry.writeUInt8(0, 2);        // colors (0 = no palette)
  dirEntry.writeUInt8(0, 3);        // reserved
  dirEntry.writeUInt16LE(1, 4);     // color planes
  dirEntry.writeUInt16LE(32, 6);    // bits per pixel
  dirEntry.writeUInt32LE(pngData.length, 8);  // image size
  dirEntry.writeUInt32LE(6 + 16, 12);         // offset = header + dir

  return Buffer.concat([header, dirEntry, pngData]);
}

fs.writeFileSync(path.join(iconsDir, "icon.ico"), createIco(png));

// ICNS: just copy the PNG as placeholder
fs.writeFileSync(path.join(iconsDir, "icon.icns"), png);
