const sharp = require('sharp');
const path = require('path');

const SOURCE = path.join(__dirname, '..', 'src', 'assets', 'logo.png');

const ANDROID_DENSITIES = [
  { dir: 'mipmap-mdpi',    iconSize: 48,  fgSize: 108 },
  { dir: 'mipmap-hdpi',    iconSize: 72,  fgSize: 162 },
  { dir: 'mipmap-xhdpi',   iconSize: 96,  fgSize: 216 },
  { dir: 'mipmap-xxhdpi',  iconSize: 144, fgSize: 324 },
  { dir: 'mipmap-xxxhdpi', iconSize: 192, fgSize: 432 },
];

const BG_COLOR = { r: 255, g: 255, b: 255, alpha: 1 };

async function generate() {
  const tasks = [];

  for (const { dir, iconSize, fgSize } of ANDROID_DENSITIES) {
    const resDir = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res', dir);

    // ic_launcher.png — square icon on white background (legacy launchers)
    // Logo fills ~92% of canvas — minimal padding
    const flatLogoSize = Math.round(iconSize * 0.92);
    const flatPadding = Math.round((iconSize - flatLogoSize) / 2);
    const flatLogoBuffer = await sharp(SOURCE)
      .resize(flatLogoSize, flatLogoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();

    tasks.push(
      sharp({
        create: { width: iconSize, height: iconSize, channels: 4, background: BG_COLOR },
      })
        .png()
        .composite([{ input: flatLogoBuffer, left: flatPadding, top: flatPadding }])
        .toFile(path.join(resDir, 'ic_launcher.png'))
        .then(() => console.log(`  ${dir}/ic_launcher.png (${iconSize}x${iconSize})`))
    );

    // ic_launcher_round.png — circular crop, same enlarged logo
    tasks.push(
      sharp({
        create: { width: iconSize, height: iconSize, channels: 4, background: BG_COLOR },
      })
        .png()
        .composite([{ input: flatLogoBuffer, left: flatPadding, top: flatPadding }])
        .toFile(path.join(resDir, 'ic_launcher_round.png'))
        .then(() => console.log(`  ${dir}/ic_launcher_round.png (${iconSize}x${iconSize})`))
    );

    // ic_launcher_foreground.png — adaptive icon foreground
    // Adaptive icons get center-cropped by the OS mask (~66% "safe zone"),
    // so 0.82 here renders visually similar in size to the flat icon above.
    const logoSize = Math.round(fgSize * 0.82);
    const padding = Math.round((fgSize - logoSize) / 2);

    const logoBuffer = await sharp(SOURCE)
      .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();

    tasks.push(
      sharp({
        create: {
          width: fgSize,
          height: fgSize,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
      })
        .png()
        .composite([{ input: logoBuffer, left: padding, top: padding }])
        .toFile(path.join(resDir, 'ic_launcher_foreground.png'))
        .then(() => console.log(`  ${dir}/ic_launcher_foreground.png (${fgSize}x${fgSize})`))
    );
  }

  // Web icons
  const webDir = path.join(__dirname, '..', 'public', 'web');

  tasks.push(
    sharp(SOURCE)
      .resize(192, 192, { fit: 'contain', background: BG_COLOR })
      .png()
      .toFile(path.join(webDir, 'icon-192.png'))
      .then(() => console.log('  public/web/icon-192.png (192x192)'))
  );

  tasks.push(
    sharp(SOURCE)
      .resize(512, 512, { fit: 'contain', background: BG_COLOR })
      .png()
      .toFile(path.join(webDir, 'icon-512.png'))
      .then(() => console.log('  public/web/icon-512.png (512x512)'))
  );
  tasks.push(
    sharp(SOURCE)
      .resize(48, 48, { fit: 'contain', background: BG_COLOR })
      .png()
      .toFile(path.join(webDir, 'favicon.png'))
      .then(() => console.log('  public/web/favicon.png (48x48)'))
  );

  // Maskable icons keep the same official logo inside the Android/PWA safe zone.
  for (const size of [192, 512]) {
    const safeLogoSize = Math.round(size * 0.64);
    const safePadding = Math.round((size - safeLogoSize) / 2);
    const safeLogo = await sharp(SOURCE)
      .resize(safeLogoSize, safeLogoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();

    tasks.push(
      sharp({ create: { width: size, height: size, channels: 4, background: BG_COLOR } })
        .png()
        .composite([{ input: safeLogo, left: safePadding, top: safePadding }])
        .toFile(path.join(webDir, `icon-${size}-maskable.png`))
        .then(() => console.log(`  public/web/icon-${size}-maskable.png (${size}x${size})`))
    );
  }


  tasks.push(
    sharp(SOURCE)
      .resize(180, 180, { fit: 'contain', background: BG_COLOR })
      .png()
      .toFile(path.join(webDir, 'apple-touch-icon.png'))
      .then(() => console.log('  public/web/apple-touch-icon.png (180x180)'))
  );

  // Solid white background + monochrome (black silhouette) layers for adaptive icons
  // These are required by mipmap-anydpi-v26/ic_launcher.xml alongside the foreground
  for (const { dir, fgSize } of ANDROID_DENSITIES) {
    const resDir = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res', dir);

    tasks.push(
      sharp({
        create: { width: fgSize, height: fgSize, channels: 4, background: BG_COLOR },
      })
        .png()
        .toFile(path.join(resDir, 'ic_launcher_background.png'))
        .then(() => console.log(`  ${dir}/ic_launcher_background.png (${fgSize}x${fgSize}, solid white)`))
    );

    const logoSize = Math.round(fgSize * 0.82);
    const padding = Math.round((fgSize - logoSize) / 2);

    const monoBuffer = await sharp(SOURCE)
      .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .greyscale()
      .png()
      .toBuffer();

    tasks.push(
      sharp({
        create: { width: fgSize, height: fgSize, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
      })
        .png()
        .composite([{ input: monoBuffer, left: padding, top: padding }])
        .toFile(path.join(resDir, 'ic_launcher_monochrome.png'))
        .then(() => console.log(`  ${dir}/ic_launcher_monochrome.png (${fgSize}x${fgSize})`))
    );
  }

  await Promise.all(tasks);
  console.log('\nAll icons generated successfully.');
}

generate().catch((err) => {
  console.error('Icon generation failed:', err);
  process.exit(1);
});
