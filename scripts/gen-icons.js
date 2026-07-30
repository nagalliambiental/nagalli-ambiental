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

// ICO: simple wrapper around the PNG
fs.writeFileSync(path.join(iconsDir, "icon.ico"), png);

// ICNS: just copy the PNG as placeholder (macOS will still work)
fs.writeFileSync(path.join(iconsDir, "icon.icns"), png);
