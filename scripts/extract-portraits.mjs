/**
 * Crops doctor portraits out of the social posters in `designs/`.
 *
 * The client supplied composed posters, not clean headshots, so each portrait
 * is cropped from its poster and normalised to a 4:5 card image. The two
 * doctors without a solo poster are cropped from the team poster and are
 * therefore much lower resolution — they are placeholders until real photos
 * arrive.
 *
 * Run: node scripts/extract-portraits.mjs
 */
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

const OUT = 'public/images/team';
const OUT_W = 800;
const OUT_H = 1000; // 4:5

/** left/top/width/height in source pixels. */
const crops = [
  { file: 'designs/dr1.jpg', out: 'manar-mobarez.jpg', left: 95, top: 45, width: 400, height: 500 },
  { file: 'designs/dr2.jpg', out: 'amira-maher.jpg', left: 180, top: 130, width: 640, height: 800 },
  { file: 'designs/dr3.jpg', out: 'mostafa-elghandour.jpg', left: 150, top: 150, width: 390, height: 487 },
  { file: 'designs/dr4.jpg', out: 'alia-zayda.jpg', left: 180, top: 120, width: 640, height: 800 },
  { file: 'designs/dr5.jpg', out: 'mai-hesham.jpg', left: 130, top: 90, width: 560, height: 700 },
  // From the team poster — card 3 of 7 (left to right).
  { file: 'designs/all drs.jpg', out: 'nadine-kamel.jpg', left: 378, top: 498, width: 152, height: 190 },
  // From the team poster — card 6 of 7.
  { file: 'designs/all drs.jpg', out: 'reham-mohieldin.jpg', left: 888, top: 498, width: 152, height: 190 },
];

await mkdir(OUT, { recursive: true });

for (const c of crops) {
  await sharp(c.file)
    .extract({ left: c.left, top: c.top, width: c.width, height: c.height })
    .resize(OUT_W, OUT_H, { fit: 'cover', position: 'top' })
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(`${OUT}/${c.out}`);
  console.log('wrote', `${OUT}/${c.out}`);
}
