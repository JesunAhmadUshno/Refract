// Known-answer self-check, run by `npm run build`: spec parsing and fit math against the repo files.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseSpecs, parseReadmeSizes } from './specs.js';
import { fitRect, distortion, coverage, alphaCounts } from './fit.js';

const read = (p) => fs.readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const specs = parseSpecs(read('script.js'));
// script.js lines 11-14
assert.deepEqual(specs.map((s) => [s.name, s.width, s.height]), [['Screenshot', 1280, 800], ['Small Promo', 440, 280], ['Marquee Promo', 1400, 560], ['Store Icon', 128, 128]]);
assert.equal(specs.reduce((a, s) => a + s.pixels, 0), 1947584);
assert.equal(specs[2].aspect, 2.5);
assert.equal(specs[1].fileName, 'refract_small_promo.png');
// README table must describe the same sizes as the code
const readme = Object.fromEntries(parseReadmeSizes(read('README.md')).map((r) => [r.name, [r.width, r.height]]));
for (const s of specs) assert.deepEqual(readme[s.name], [s.width, s.height], `README size for ${s.name}`);
assert.throws(() => parseSpecs('const specs = [ { name: "A", width: 1 } ];'), /parsed 0 of 1/);

// stretch: the exact call script.js makes, drawImage(img, 0, 0, w, h)
assert.deepEqual(fitRect(1920, 1080, 128, 128, 'stretch'), { sx: 0, sy: 0, sw: 1920, sh: 1080, dx: 0, dy: 0, dw: 128, dh: 128 });
// cover 16:9 -> square: centre 1080x1080 crop
assert.deepEqual(fitRect(1920, 1080, 128, 128, 'cover'), { sx: 420, sy: 0, sw: 1080, sh: 1080, dx: 0, dy: 0, dw: 128, dh: 128 });
// contain 16:9 -> square: 128x72 letterboxed band
assert.deepEqual(fitRect(1920, 1080, 128, 128, 'contain'), { sx: 0, sy: 0, sw: 1920, sh: 1080, dx: 0, dy: 28, dw: 128, dh: 72 });
// contain tall source -> wide target pillarboxes
assert.deepEqual(fitRect(1000, 2000, 1400, 560, 'contain'), { sx: 0, sy: 0, sw: 1000, sh: 2000, dx: 560, dy: 0, dw: 280, dh: 560 });
// same aspect: every mode is the identity mapping
for (const m of ['stretch', 'cover', 'contain']) assert.deepEqual(fitRect(2560, 1600, 1280, 800, m), fitRect(2560, 1600, 1280, 800, 'stretch'));
assert.throws(() => fitRect(1, 1, 1, 1, 'zoom'));

// distortion: 16:9 into the icon is squashed 43.75%, into the 2.5:1 marquee stretched ~40.6%
assert.equal(distortion(1920, 1080, 128, 128), -0.4375);
assert.equal(Math.round(distortion(1920, 1080, 1400, 560) * 1000) / 10, 40.6);
assert.equal(distortion(1280, 800, 1280, 800), 0);
assert.equal(coverage(1920, 1080, 128, 128), 0.5625);

assert.deepEqual(alphaCounts(Uint8ClampedArray.from([0, 0, 0, 255, 9, 9, 9, 0, 1, 1, 1, 254])), { opaque: 1, transparent: 2 });
console.log('fit ok', { assets: specs.length, totalPixels: 1947584 });
