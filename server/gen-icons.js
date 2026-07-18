// Genera los iconos PNG de la PWA a partir del escudo (public/logo.png).
// Ejecutar: node gen-icons.js
const sharp = require('sharp');
const path = require('path');

const OUT = path.join(__dirname, 'public', 'icons');
const SRC = path.join(__dirname, 'public', 'logo.png');
const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };

// Compone el escudo centrado sobre un cuadrado de fondo blanco.
// pad = margen relativo alrededor (zona segura para los iconos "maskable").
async function makeIcon(size, pad, out) {
  const inner = Math.round(size * (1 - pad * 2));
  const logo = await sharp(SRC)
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: WHITE } })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toFile(out);
}

async function run() {
  await makeIcon(512, 0.08, path.join(OUT, 'icon-512.png'));
  await makeIcon(192, 0.08, path.join(OUT, 'icon-192.png'));
  await makeIcon(180, 0.08, path.join(OUT, 'icon-180.png'));
  // "maskable": más margen porque el sistema recorta los bordes.
  await makeIcon(512, 0.18, path.join(OUT, 'icon-maskable-512.png'));
  console.log('Iconos generados desde el escudo en', OUT);
}
run().catch((e) => { console.error(e); process.exit(1); });
