const sharp = require('sharp');
const path = require('path');

const src = path.resolve('C:/Users/MostafaAliMohamedElS/.gemini/antigravity-ide/brain/c0851916-fc71-43ee-8fe4-673a4789808d/app_icon_512_1788692349606.jpg');
const dest = path.resolve('E:/purchasing system/public');

async function generate() {
  const sizes = [
    { name: 'icon-192x192.png', size: 192 },
    { name: 'icon-512x512.png', size: 512 },
    { name: 'apple-touch-icon.png', size: 180 },
  ];

  for (const { name, size } of sizes) {
    await sharp(src)
      .resize(size, size, { fit: 'cover' })
      .png()
      .toFile(path.join(dest, name));
    console.log(`Created ${name} (${size}x${size})`);
  }

  // Maskable icon with safe zone padding
  const maskableSize = 512;
  const iconSize = Math.round(maskableSize * 0.7);
  const padding = Math.round((maskableSize - iconSize) / 2);

  const resizedIcon = await sharp(src)
    .resize(iconSize, iconSize, { fit: 'cover' })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: maskableSize,
      height: maskableSize,
      channels: 4,
      background: { r: 15, g: 23, b: 42, alpha: 1 }
    }
  })
    .composite([{ input: resizedIcon, left: padding, top: padding }])
    .png()
    .toFile(path.join(dest, 'maskable-icon-512x512.png'));
  console.log('Created maskable-icon-512x512.png (512x512 with safe zone)');

  // favicon
  await sharp(src)
    .resize(32, 32, { fit: 'cover' })
    .png()
    .toFile(path.join(dest, 'favicon-32x32.png'));
  console.log('Created favicon-32x32.png (32x32)');

  console.log('All icons generated!');
}

generate().catch(console.error);
