const fs = require("fs");
const path = require("path");

const outDir = path.resolve(__dirname, "..", "out");
fs.mkdirSync(outDir, { recursive: true });

const html = `<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="refresh" content="0;url=https://nagalli-ambiental.vercel.app">
</head>
<body>Carregando...</body>
</html>`;

fs.writeFileSync(path.join(outDir, "index.html"), html);
