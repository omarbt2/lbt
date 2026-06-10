import { copyFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const densities = ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi'];
const files = [
  'ic_launcher.png',
  'ic_launcher_background.png', 
  'ic_launcher_foreground.png',
  'ic_launcher_monochrome.png',
  'ic_launcher_round.png',
];

const src = 'public/android/res';
const dest = 'android/app/src/main/res';

for (const density of densities) {
  const destDir = join(dest, `mipmap-${density}`);
  mkdirSync(destDir, { recursive: true });
  
  for (const file of files) {
    const srcPath = join(src, `mipmap-${density}`, file);
    const destPath = join(destDir, file);
    if (existsSync(srcPath)) {
      copyFileSync(srcPath, destPath);
      console.log(`✅ Copied: mipmap-${density}/${file}`);
    }
  }
}

// Copy anydpi-v26 (adaptive icons XML)
const anydpiSrc = join(src, 'mipmap-anydpi-v26');
const anydpiDest = join(dest, 'mipmap-anydpi-v26');
mkdirSync(anydpiDest, { recursive: true });
['ic_launcher.xml', 'ic_launcher_round.xml'].forEach(f => {
  const s = join(anydpiSrc, f);
  if (existsSync(s)) {
    copyFileSync(s, join(anydpiDest, f));
    console.log(`✅ Copied: mipmap-anydpi-v26/${f}`);
  }
});

console.log('🎉 All icons copied successfully!');
