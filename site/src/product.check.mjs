// Smoke test for the product itself: runs ../../script.js in a stubbed DOM (node:vm, no browser)
// and checks the fixed behaviour: ZIP gated until all 4 PNGs exist, cards in spec order,
// white flatten before drawImage, object URLs revoked on re-upload, one JSZip tag in index.html.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { parseSpecs } from './specs.js';

const root = new URL('../../', import.meta.url);
const source = fs.readFileSync(new URL('script.js', root), 'utf8');
const html = fs.readFileSync(new URL('index.html', root), 'utf8');
const specs = parseSpecs(source);

assert.equal((html.match(/jszip\.min\.js/g) || []).length, 1, 'index.html must load JSZip exactly once');
assert.match(html, /id="drop-zone"[^>]*role="button"[^>]*tabindex="0"/, 'drop zone must be keyboard reachable');

function el(tag = 'div') {
  const handlers = {};
  return {
    tag, handlers, children: [], attrs: {}, style: {}, classList: { add() {}, remove() {} }, disabled: false, textContent: '', innerHTML: '',
    addEventListener(t, f) { handlers[t] = f; },
    appendChild(c) { this.children.push(c); },
    setAttribute(k, v) { this.attrs[k] = v; },
    click() { this.handlers.click?.({ stopPropagation() {} }); },
  };
}
const ids = { 'drop-zone': el(), 'file-input': el('input'), 'results-area': el(), 'download-all': el('button'), 'status-text': el('span') };
const grid = el();
Object.defineProperty(grid, 'innerHTML', { set(v) { if (v === '') grid.children = []; }, get() { return ''; } });
const calls = [];
const zipFiles = [];
const pendingBlobs = [];
let ready;
const document = {
  addEventListener: (t, f) => { ready = f; },
  getElementById: (id) => ids[id],
  querySelector: (s) => (s === '.grid-container' ? grid : el('button')),
  createElement: (tag) => {
    if (tag !== 'canvas') return el(tag);
    const c = { width: 0, height: 0 };
    c.getContext = () => ({ set fillStyle(v) { calls.push(['fillStyle', v]); }, fillRect: (...a) => calls.push(['fillRect', c.width, c.height, ...a]), drawImage: (img, ...a) => calls.push(['drawImage', c.width, c.height, ...a]) });
    c.toBlob = (cb) => pendingBlobs.push(() => cb({ w: c.width, h: c.height }));
    return c;
  },
};
const revoked = [];
let urlN = 0;
const ctx = {
  document,
  alert: (m) => { throw new Error(`alert: ${m}`); },
  JSZip: class { file(n, b) { zipFiles.push(n); } },
  URL: { createObjectURL: () => `blob:${++urlN}`, revokeObjectURL: (u) => revoked.push(u) },
  FileReader: class { readAsDataURL() { this.onload({ target: { result: 'data:' } }); } },
  Image: class { set src(v) { this.onload(); } },
};
vm.createContext(ctx);
vm.runInContext(source, ctx);
ready();

const upload = () => ids['file-input'].handlers.change({ target: { files: [{ type: 'image/png' }] } });
const flush = () => new Promise((r) => setTimeout(r, 0));

upload();
assert.equal(pendingBlobs.length, specs.length, 'one canvas per spec');
assert.equal(ids['download-all'].disabled, true, 'ZIP must stay disabled while PNGs are still encoding');
// finish encoding in reverse order: the slowest-first case that used to scramble cards
pendingBlobs.splice(1).reverse().forEach((f) => f());
await flush();
assert.equal(ids['download-all'].disabled, true, 'still disabled with one PNG outstanding');
pendingBlobs.shift()();
await flush();
assert.equal(ids['download-all'].disabled, false, 'ZIP enabled once all PNGs exist');
assert.equal(ids['status-text'].textContent, 'Processing Complete');
assert.deepEqual(zipFiles, specs.map((s) => s.fileName), 'ZIP holds every asset, in spec order');
assert.deepEqual(grid.children.map((c) => c.attrs['aria-label']), specs.map((s) => `Download ${s.fileName}`), 'cards in spec order');
assert.ok(grid.children.every((c) => c.tag === 'button'), 'cards are real buttons');
for (const s of specs) {
  const i = calls.findIndex((c) => c[0] === 'fillRect' && c[1] === s.width && c[2] === s.height);
  const j = calls.findIndex((c) => c[0] === 'drawImage' && c[1] === s.width && c[2] === s.height);
  assert.ok(i >= 0 && i < j, `${s.name}: flatten before drawImage`);
  assert.deepEqual(calls[j].slice(3), [0, 0, s.width, s.height], `${s.name}: stretch to exact size`);
}

upload();
assert.deepEqual(revoked, ['blob:1', 'blob:2', 'blob:3', 'blob:4'], 'previous object URLs revoked on re-upload');
assert.equal(ids['download-all'].disabled, true, 'ZIP disabled again for the new run');
console.log('product ok', { assets: specs.length, files: zipFiles.slice(0, specs.length) });
