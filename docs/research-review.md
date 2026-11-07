# Refract: engineering and research review

Refract is a product app, not a study: a single static page (`index.html`, `script.js`, `style.css`) that redraws one image at the four sizes it targets for a Chrome Web Store listing. It runs entirely in the browser. This review grades it on a research-style rubric adapted for a product (claims, method, verification, reproducibility, threats, limitations, plus engineering rigor), records what was fixed on branch `site/live-dashboard`, and names exactly what each remaining gap would need.

Line references marked "original" are to commit `ab7d1d6` (the last commit before this branch). Current references are to the files on this branch.

## Grades

| Area | Before | After | Notes |
| :--- | :---: | :---: | :--- |
| Question / purpose | B | B | Clear job: one image in, store assets out. No statement of which store requirements it encodes or where they come from. |
| Claims vs evidence | D | B- | "Smart Resizing" and "24-bit PNG (no alpha)" were unsupported. The resize claim is now described as a stretch; the no-alpha claim is now true by construction and measured by the dashboard's alpha audit. |
| Method (algorithm) | C | C+ | Stretch to exact size (original `script.js:82`, now `script.js:95`). Deterministic and simple, but distorts any off-shape source. The trade-off is now measured (dashboard "Fit modes" and "Distortion"), not changed. |
| Baselines / alternatives | F | B- | No alternative was considered beyond a code comment (original `script.js:79-81`). The dashboard now compares stretch with cover (crop) and contain (letterbox) on the same input, with tested geometry in `site/src/fit.js`. |
| Verification / tests | F | B | No tests existed. Now: `site/src/product.check.mjs` runs `script.js` in a stubbed DOM (ZIP gate, spec order, flatten-before-draw, URL revocation, single JSZip tag, keyboard drop zone); `site/src/fit.check.mjs` checks spec parsing, README/code size agreement and fit math against known answers. Both run in `npm test` and on every Pages build. |
| Uncertainty / measurement | n/a | C | No statistics apply. Browser-measured values (PNG size, encode time, alpha counts) are labelled as measured in the viewer's browser, because they depend on the PNG encoder. |
| Reproducibility | B | A- | Static files, no build for the app. The dashboard pins exact dependency versions, has a lockfile, and its numbers are parsed from `script.js` at build time; citation line numbers are looked up in the committed files, so they cannot drift silently. |
| Threats to validity | F | B- | Listed below and on the dashboard. |
| Related work / sources | F | C | README now links Google's Chrome Web Store image guidelines. Sizes are still not verified against them in code. |
| Limitations stated | F | B | README now says the image is stretched; dashboard has a limitations paragraph. |
| Correctness (engineering) | D | B | ZIP race and premature "Processing Complete" fixed; card order deterministic; object URLs revoked. |
| Accessibility | D | C+ | Drop zone keyboard-operable, preview cards are buttons, status is `aria-live`. `alert()` remains. |
| Hygiene / licensing | C- | C | Duplicate JSZip tag removed; broken clone code block fixed. LICENSE still missing. |

Overall: roughly C+ before, B- after.

## Findings and fixes

1. **ZIP race (fixed).** Original `script.js:85-94` added files to the ZIP inside asynchronous `toBlob` callbacks, while `index.html:35` showed Download ZIP (and `index.html:34` "Processing Complete") as soon as results appeared. An early click could save a partial ZIP. Now `renderAsset` returns a promise per asset, `generateAssets` awaits `Promise.all` (`script.js:103`), then fills the ZIP and cards in spec order and only then enables the button and sets the status text. Covered by `product.check.mjs`, which finishes the encodes in reverse order and asserts the button stays disabled until the last one.
2. **"No alpha" claim (fixed).** The README promised PNGs with no alpha, but nothing flattened the canvas, so transparent sources stayed transparent. Each canvas is now filled white before drawing (`script.js:91`). The dashboard's alpha audit encodes and re-decodes the PNGs in the browser and counts pixels with alpha < 255 for both pipelines. Note: the canvas PNG encoder may still write an RGBA file whose alpha is all 255; the README now claims "no transparency", not a specific bit depth.
3. **Duplicate JSZip tag (fixed).** Original `index.html:43` and `index.html:50` loaded the same library twice. One remains.
4. **Object URL leak and nondeterministic card order (fixed).** URLs from previous runs are revoked; cards follow the spec array.
5. **Keyboard access (partly fixed).** Drop zone has `role="button"`, `tabindex="0"` and an Enter/Space handler; cards are `<button>`s with an `aria-label`. Remaining: `alert()` for invalid files (`script.js:59`), and the Browse button sits inside the drop zone (nested interactive controls).
6. **Stretch distortion (open, product decision).** A 16:9 source going to the 128×128 icon comes out 43.75% narrower than it should; going to the 1400×560 marquee it comes out about 40.6% wider (distortion = horizontal scale ÷ vertical scale − 1; both values are asserted in `fit.check.mjs`). Adding a cover/contain option is cheap with `site/src/fit.js`, but it changes what users get, so it is left for the Owner to decide.
7. **README accuracy (fixed).** "Smart Resizing" now says it stretches; clone command fixed; guideline link added.
8. **No LICENSE (open, Owner's call).** README shows an MIT badge (`README.md:12`) but no LICENSE file exists. Choosing and adding a licence is a legal decision.

## Threats to validity of the dashboard

- **Encoder dependence.** PNG sizes, timings and the alpha audit come from the viewer's browser encoder; another browser may differ.
- **Geometry, not perception.** Distortion is a geometric ratio. It does not say whether a given picture looks acceptable; a texture can hide 10% stretch that a face cannot.
- **Test pattern as default input.** The repo ships no sample image, so the default is a procedural pattern. It shows distortion clearly but is not representative of real artwork.
- **Store requirements not verified.** The dashboard shows the sizes Refract targets, parsed from `script.js`. It does not claim they match Google's current requirements.
- **Stubbed-DOM smoke test.** `product.check.mjs` checks control flow and canvas calls, not real pixels; the dashboard exercises real canvas output in the browser.

## Remaining gaps and what each needs

| Gap | What closing it needs |
| :--- | :--- |
| Real-browser end-to-end test of the app (upload, ZIP contents) | A headless browser test (for example Playwright, already used locally for the dashboard gate) plus a small committed sample image with a known licence. No paid compute; one CI job of about 1 minute. |
| Verify target sizes against the Chrome Web Store | A dated quote or snapshot of Google's image requirements committed to `docs/`, then an assertion in `fit.check.mjs`. Needs a person to read and record the current guidelines. |
| Perceptual quality of stretch vs cover vs contain | A small labelled set of real extension artwork (for example 20 to 50 images with permission to use) and a user preference study or an image-quality metric such as SSIM against a hand-made reference crop. |
| Icon padding guidance (artwork area inside the 128×128 icon) | The documented guideline value plus a product decision on whether Refract should pad icons. |
| Cover/contain option in the app | Owner decision on default behaviour; implementation reuses `site/src/fit.js` (about 20 lines). |
| LICENSE | Owner chooses the licence. |
| The original Python/Pillow script mentioned in the README | The script itself, if it still exists; otherwise drop the sentence. |
