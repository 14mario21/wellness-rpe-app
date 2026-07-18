// Genera los iconos PNG de la PWA a partir de un SVG. Ejecutar: node gen-icons.js
const sharp = require('sharp');
const path = require('path');

const OUT = path.join(__dirname, 'public', 'icons');

const pulse = (scale) => {
  const g = scale < 1
    ? `<g transform="translate(256,256) scale(${scale}) translate(-256,-256)">`
    : '<g>';
  return `${g}
    <polyline points="40,256 150,256 205,140 265,388 320,256 472,256"
      fill="none" stroke="#22c55e" stroke-width="30"
      stroke-linecap="round" stroke-linejoin="round"/>
    </g>`;
};

// icon "any": esquinas redondeadas, pulso a tamaño completo.
const svgAny = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="#0f172a"/>
  ${pulse(1)}
</svg>`;

// icon "maskable": fondo a sangre completa, contenido dentro de la zona segura (70%).
const svgMaskable = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#0f172a"/>
  ${pulse(0.7)}
</svg>`;

async function run() {
  await sharp(Buffer.from(svgAny)).resize(512, 512).png().toFile(path.join(OUT, 'icon-512.png'));
  await sharp(Buffer.from(svgAny)).resize(192, 192).png().toFile(path.join(OUT, 'icon-192.png'));
  await sharp(Buffer.from(svgAny)).resize(180, 180).png().toFile(path.join(OUT, 'icon-180.png'));
  await sharp(Buffer.from(svgMaskable)).resize(512, 512).png().toFile(path.join(OUT, 'icon-maskable-512.png'));
  console.log('Iconos generados en', OUT);
}
run().catch((e) => { console.error(e); process.exit(1); });
