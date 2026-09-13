import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const SVG_PATH = path.join(process.cwd(), 'public', 'icon.svg');
const PUBLIC_DIR = path.join(process.cwd(), 'public');

const SIZES = [
  { name: 'pwa-192x192.png', size: 192 },
  { name: 'pwa-512x512.png', size: 512 },
  { name: 'pwa-maskable-512x512.png', size: 512 },
];

async function generateIcons() {
  try {
    if (!fs.existsSync(SVG_PATH)) {
      console.error('Source icon.svg not found in public directory');
      process.exit(1);
    }

    const svgBuffer = fs.readFileSync(SVG_PATH);

    for (const { name, size } of SIZES) {
      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(path.join(PUBLIC_DIR, name));
      
      console.log(`Generated ${name}`);
    }

    console.log('Successfully generated all PWA icons!');
  } catch (err) {
    console.error('Error generating icons:', err);
    process.exit(1);
  }
}

generateIcons();