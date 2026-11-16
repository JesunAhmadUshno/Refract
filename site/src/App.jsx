import { useMemo, useState, useEffect, useRef, useId, useCallback } from 'react';
import scriptSrc from '../../script.js?raw';
import indexSrc from '../../index.html?raw';
import readmeSrc from '../../README.md?raw';
import { parseSpecs } from './specs.js';
import { fitRect, distortion, coverage, alphaCounts } from './fit.js';

const SPECS = parseSpecs(scriptSrc);
const REPO = 'https://github.com/JesunAhmadUshno/Refract';
const blob = (p, line) => `${REPO}/blob/main/${p}${line ? `#L${line}` : ''}`;
const fmt = (n) => Math.round(n).toLocaleString('en-US');
const pct = (x, d = 1) => `${(x * 100).toFixed(d)}%`;
const signed = (x) => `${x > 0 ? '+' : x < 0 ? '−' : ''}${pct(Math.abs(x))}`;
const ratio = (a) => (Number.isInteger(a) ? `${a}:1` : `${a.toFixed(2)}:1`);
// line numbers are found in the committed files at build time, so citations cannot drift
const lineOf = (src, needle) => {
  const i = src.split('\n').findIndex((l) => l.includes(needle));
  if (i < 0) throw new Error(`citation target not found: ${needle}`);
  return i + 1;
};
const L = {
  specs: lineOf(scriptSrc, 'const specs = ['),
  fill: lineOf(scriptSrc, 'ctx.fillRect('),
  draw: lineOf(scriptSrc, 'ctx.drawImage('),
  all: lineOf(scriptSrc, 'Promise.all('),
  revoke: lineOf(scriptSrc, 'revokeObjectURL'),
  key: lineOf(scriptSrc, "addEventListener('keydown'"),
  alert: lineOf(scriptSrc, 'alert('),
  jszip: lineOf(indexSrc, 'jszip.min.js'),
  noAlpha: lineOf(readmeSrc, 'carry no transparency'),
  badge: lineOf(readmeSrc, 'license-MIT'),
};
const TOTAL_PX = SPECS.reduce((a, s) => a + s.pixels, 0);
const WIDEST = SPECS.reduce((a, s) => (s.aspect > a.aspect ? s : a));
const NARROWEST = SPECS.reduce((a, s) => (s.aspect < a.aspect ? s : a));

const SECTIONS = [['top', 'Overview', '◎'], ['specs', 'Spec sheet', '▤'], ['generate', 'Generator', '▶'], ['fit', 'Fit modes', '⧉'], ['matrix', 'Distortion', '▦'], ['alpha', 'Alpha audit', '◐'], ['review', 'Review', '✓']];

/* ---------- procedural test pattern: the default input, drawn in the browser ---------- */
function drawPattern(w, h, transparent = false) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  if (!transparent) { g.fillStyle = '#f3efe7'; g.fillRect(0, 0, w, h); }
  const step = Math.max(w, h) / 16;
  g.strokeStyle = transparent ? 'rgba(36,87,214,.55)' : 'rgba(27,25,21,.18)'; g.lineWidth = Math.max(1, step / 40);
  for (let x = 0; x <= w; x += step) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
  for (let y = 0; y <= h; y += step) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
  const r = Math.min(w, h) * 0.4;
  g.fillStyle = '#2457d6'; g.beginPath(); g.arc(w / 2, h / 2, r, 0, Math.PI * 2); g.fill();
  g.fillStyle = transparent ? 'rgba(255,170,120,.5)' : '#ffaa78'; g.beginPath(); g.arc(w / 2, h / 2, r * 0.55, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#fff'; g.font = `600 ${Math.round(r * 0.22)}px Inter, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(`${w}×${h}`, w / 2, h / 2);
  const s = Math.min(w, h) * 0.12;
  [['TL', 0, 0], ['TR', w - s, 0], ['BL', 0, h - s], ['BR', w - s, h - s]].forEach(([t, x, y]) => {
    g.fillStyle = '#1b1915'; g.fillRect(x, y, s, s);
    g.fillStyle = '#fff'; g.font = `700 ${Math.round(s * 0.36)}px Inter, sans-serif`; g.fillText(t, x + s / 2, y + s / 2);
  });
  return c;
}

/* ---------- the product pipeline, same steps as script.js renderAsset ---------- */
function renderAsset(src, spec, { flatten = true, mode = 'stretch' } = {}) {
  const c = document.createElement('canvas');
  c.width = spec.width; c.height = spec.height;
  const g = c.getContext('2d');
  if (flatten) { g.fillStyle = '#ffffff'; g.fillRect(0, 0, spec.width, spec.height); }
  const f = fitRect(src.width, src.height, spec.width, spec.height, mode);
  g.drawImage(src, f.sx, f.sy, f.sw, f.sh, f.dx, f.dy, f.dw, f.dh);
  return c;
}
const toPng = (canvas) => new Promise((res) => canvas.toBlob(res, 'image/png'));

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('in')); return; }
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.08 });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);
}

function MenuBar() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(t); }, []);
  return (
    <div className="menubar" role="banner">
      <span className="apple" aria-hidden="true">◆</span>
      <a className="app" href="#top">Refract Lab</a>
      <a className="m" href="../">Open Refract</a>
      <a className="m" href={blob('script.js')}>script.js</a>
      <a className="m" href={blob('docs/research-review.md')}>Review</a>
      <span className="spacer" />
      <span className="status"><i /> Runs in your browser</span>
      <a href={REPO}>GitHub ↗</a>
      <span className="clock">{now.toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' })}</span>
    </div>
  );
}

function Dock() {
  const [active, setActive] = useState('top');
  useEffect(() => {
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && setActive(e.target.id)), { rootMargin: '-45% 0px -50% 0px' });
    SECTIONS.forEach(([id]) => { const el = document.getElementById(id); if (el) io.observe(el); });
    return () => io.disconnect();
  }, []);
  return (
    <nav className="dock" aria-label="Sections">
      {SECTIONS.map(([id, label, icon]) => (
        <a key={id} href={`#${id}`} className={active === id ? 'on' : ''} aria-current={active === id ? 'true' : undefined}>
          <span className="ico" aria-hidden="true">{icon}</span><span className="lbl">{label}</span>
        </a>
      ))}
    </nav>
  );
}

function Range({ label, value, min, max, step, onChange, show }) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label} <span>{show}</span></label>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} />
    </div>
  );
}

export default function App() {
  useReveal();
  const [dims, setDims] = useState({ w: 1600, h: 900 });
  const [upload, setUpload] = useState(null); // { bitmap, name }
  const source = useMemo(() => (upload ? upload.bitmap : drawPattern(dims.w, dims.h)), [upload, dims]);
  const label = upload ? `${upload.name} (${source.width}×${source.height})` : `test pattern ${dims.w}×${dims.h}`;
  const setSize = useCallback((d) => { setUpload(null); setDims(d); }, []);
  const onFile = useCallback(async (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const bitmap = await createImageBitmap(file);
    setUpload({ bitmap, name: file.name });
    setDims({ w: bitmap.width, h: bitmap.height });
  }, []);
  return (
    <div className="wrap"><a className="skip" href="#top">Skip to content</a>
      <MenuBar />
      <div className="glow" aria-hidden="true" />
      <Hero />
      <SpecSheet />
      <Generator source={source} label={label} onFile={onFile} upload={upload} onReset={() => setUpload(null)} />
      <FitModes source={source} label={label} />
      <Matrix dims={dims} setSize={setSize} upload={upload} />
      <AlphaAudit />
      <Review />
      <Dock />
      <footer>
        Every size on this page is parsed from <code>script.js</code> at build time. Every image is drawn and measured in your browser; nothing is uploaded anywhere.
      <nav className="support" aria-label="Support this work"><a href="https://github.com/sponsors/JesunAhmadUshno">Sponsor this work</a><a href="https://github.com/sponsors/JesunAhmadUshno">Donate</a><a href="https://buymeacoffee.com/jesun">Buy Me a Coffee</a><a href="https://calendly.com/jesunahmadushno/30min">Work with me</a></nav></footer>
    </div>
  );
}

function Hero() {
  return (
    <header className="card hero window" id="top" data-title="Refract - README">
      <div className="head">
        <p className="eyebrow">Chrome Web Store asset generator · engineering lab</p>
        <span className="pill info">● 100% client-side</span>
      </div>
      <h1>One image in, <em>{SPECS.length} store assets</em> out, and what the stretch does to it.</h1>
      <p className="sub">
        Refract takes one picture and redraws it on an HTML canvas at each size it targets for a Chrome Web Store listing, all inside the browser.
        It stretches the picture to each exact size, so a source with a different shape gets squashed or widened.
        This lab runs that same pipeline live on a test pattern or your own file, and measures the distortion.
      </p>
      <div className="actions">
        <a className="btn primary" href="#generate">Run the generator</a>
        <a className="btn ghost" href="../">Open the Refract app</a>
        <span className="hint">Sizes parsed from <code>script.js</code> line {L.specs}</span>
      </div>
      <div className="tiles">
        <div className="tile"><div className="num">{SPECS.length}</div><div className="cap">PNG assets per source image</div></div>
        <div className="tile"><div className="num">{(TOTAL_PX / 1e6).toFixed(2)} MP</div><div className="cap">{fmt(TOTAL_PX)} output pixels in total</div></div>
        <div className="tile"><div className="num">{ratio(WIDEST.aspect)}</div><div className="cap">widest target: {WIDEST.name} {WIDEST.width}×{WIDEST.height}</div></div>
        <div className="tile"><div className="num">{ratio(NARROWEST.aspect)}</div><div className="cap">narrowest target: {NARROWEST.name} {NARROWEST.width}×{NARROWEST.height}</div></div>
      </div>
    </header>
  );
}

function SpecSheet() {
  const H = 64, gap = 18, W = 960;
  const scale = (W - gap * (SPECS.length - 1)) / SPECS.reduce((a, s) => a + s.aspect * H, 0);
  const bh = H * Math.min(1, scale);
  let x = 0;
  return (
    <section id="specs" className="card window reveal" data-title="spec-sheet.json">
      <p className="eyebrow">What Refract targets</p>
      <h2>Four sizes, <em>three different shapes</em>.</h2>
      <p className="sub">
        Parsed from the <code>specs</code> array in <a href={blob('script.js', L.specs)}>script.js</a> when this page is built, and checked against the README table.
        These are the sizes Refract produces; this page does not vouch that they match Google’s current requirements.
      </p>
      <div className="scroll-x" style={{ marginTop: 16 }}>
        <table>
          <thead><tr><th>Asset</th><th>Size</th><th>Aspect</th><th>Megapixels</th><th>File</th></tr></thead>
          <tbody>
            {SPECS.map((s) => (
              <tr key={s.name}><td><b>{s.name}</b></td><td className="mono">{s.width}×{s.height}</td><td>{ratio(s.aspect)}</td><td>{(s.pixels / 1e6).toFixed(3)}</td><td className="mono">{s.fileName}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <h3 style={{ marginTop: 22 }}>Each target drawn to scale at the same height</h3>
      <svg className="chart" viewBox={`0 0 ${W} ${bh + 26}`} role="img" aria-label={`Aspect ratios to scale: ${SPECS.map((s) => `${s.name} ${ratio(s.aspect)}`).join(', ')}`}>
        {SPECS.map((s) => {
          const w = s.aspect * bh, x0 = x; x += w + gap;
          return (
            <g key={s.name}>
              <rect x={x0} y="0" width={w} height={bh} rx="6" fill="var(--primary-pale)" stroke="var(--primary)" strokeWidth="1.5" />
              <text x={x0 + w / 2} y={bh / 2 + 4} textAnchor="middle" style={{ fill: 'var(--primary)', fontWeight: 700 }}>{ratio(s.aspect)}</text>
              <text x={x0 + w / 2} y={bh + 18} textAnchor="middle">{s.name}</text>
            </g>
          );
        })}
      </svg>
    </section>
  );
}

function Generator({ source, label, onFile, upload, onReset }) {
  const [out, setOut] = useState([]);
  const [busy, setBusy] = useState(false);
  const inputId = useId();
  const urls = useRef([]);
  const run = useCallback(async () => {
    setBusy(true);
    const t0 = performance.now();
    const results = await Promise.all(SPECS.map(async (spec) => {
      const t = performance.now();
      const png = await toPng(renderAsset(source, spec));
      return { spec, png, url: URL.createObjectURL(png), ms: performance.now() - t };
    }));
    urls.current.forEach((u) => URL.revokeObjectURL(u));
    urls.current = results.map((r) => r.url);
    setOut(results.map((r) => ({ ...r, total: performance.now() - t0 })));
    setBusy(false);
  }, [source]);
  useEffect(() => { const t = setTimeout(run, 250); return () => clearTimeout(t); }, [run]);
  useEffect(() => () => urls.current.forEach((u) => URL.revokeObjectURL(u)), []);
  return (
    <section id="generate" className="card window reveal" data-title="refract.app - generator (live)">
      <div className="head">
        <div>
          <p className="eyebrow">Live · same pipeline as script.js</p>
          <h2>Make all four assets <em>right here</em>.</h2>
        </div>
        <span className="pill good">● Genuine run, not a recording</span>
      </div>
      <p className="sub">
        Each asset is a canvas filled white (<a href={blob('script.js', L.fill)}>line {L.fill}</a>), the source stretched onto it (<a href={blob('script.js', L.draw)}>line {L.draw}</a>), then encoded with <code>toBlob</code> as PNG.
        The default input is a test pattern drawn by this page; pick your own file to try a real image. It never leaves your browser.
      </p>
      <div className="actions">
        <label className="btn ghost filepick" htmlFor={inputId}>Choose an image…</label>
        <input id={inputId} className="visually-hidden" type="file" accept="image/*" aria-label="Choose a source image" onChange={(e) => onFile(e.target.files[0])} />
        {upload && <button className="btn ghost" type="button" onClick={onReset}>Back to test pattern</button>}
        <button className="btn primary" type="button" onClick={run} disabled={busy}>{busy ? 'Rendering…' : 'Regenerate'}</button>
        <span className="hint">Source: {label}</span>
      </div>
      <div className="assets" aria-live="polite">
        {out.map(({ spec, png, url, ms }) => (
          <figure key={spec.name} className="asset">
            <div className="thumb"><img src={url} alt={`${spec.name} output, ${spec.width} by ${spec.height}`} /></div>
            <figcaption>
              <b>{spec.name}</b> <span className="mono">{spec.width}×{spec.height}</span>
              <span className="hint">{(png.size / 1024).toFixed(1)} KB · {ms.toFixed(0)} ms</span>
              <a className="dl" href={url} download={spec.fileName}>Download {spec.fileName}</a>
            </figcaption>
          </figure>
        ))}
      </div>
      <p className="hint">File sizes and timings are measured in this browser for this input; they change with the image and the browser’s PNG encoder.</p>
    </section>
  );
}

function FitCanvas({ source, spec, mode }) {
  const ref = useRef(null);
  const f = fitRect(source.width, source.height, spec.width, spec.height, mode);
  useEffect(() => {
    const c = ref.current, k = Math.min(1, 300 / spec.width, 180 / spec.height);
    c.width = Math.round(spec.width * k); c.height = Math.round(spec.height * k);
    const g = c.getContext('2d');
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, c.width, c.height);
    g.drawImage(source, f.sx, f.sy, f.sw, f.sh, f.dx * k, f.dy * k, f.dw * k, f.dh * k);
    // overlay: a true circle at the source centre, mapped through the same transform
    const r = Math.min(source.width, source.height) * 0.4, ex = f.dw / f.sw, ey = f.dh / f.sh;
    const cx = (f.dx + (source.width / 2 - f.sx) * ex) * k, cy = (f.dy + (source.height / 2 - f.sy) * ey) * k;
    g.strokeStyle = '#c53a3a'; g.lineWidth = 2; g.setLineDash([6, 4]);
    g.beginPath(); g.ellipse(cx, cy, r * ex * k, r * ey * k, 0, 0, Math.PI * 2); g.stroke();
  });
  return <canvas ref={ref} className="fitc" aria-label={`${spec.name} rendered with ${mode}`} />;
}

function FitModes({ source, label }) {
  const [pick, setPick] = useState(SPECS.findIndex((s) => s === NARROWEST));
  const spec = SPECS[pick];
  const d = distortion(source.width, source.height, spec.width, spec.height);
  const cov = coverage(source.width, source.height, spec.width, spec.height);
  const modes = [
    ['stretch', 'Stretch (what Refract does)', `circle becomes an ellipse ${signed(d)} in width`],
    ['cover', 'Cover (crop to fill)', `keeps ${pct(cov)} of the source, crops the rest`],
    ['contain', 'Contain (letterbox)', `picture fills ${pct(cov)} of the asset, bars fill the rest`],
  ];
  return (
    <section id="fit" className="card window reveal" data-title="fit-modes.canvas (live)">
      <div className="head">
        <div>
          <p className="eyebrow">Stretch vs cover vs contain</p>
          <h2>The comment in script.js weighs this choice. <em>Here are all three.</em></h2>
        </div>
        <div className="seg" role="group" aria-label="Target asset">
          {SPECS.map((s, i) => <button key={s.name} type="button" aria-pressed={i === pick} onClick={() => setPick(i)}>{s.name}</button>)}
        </div>
      </div>
      <p className="sub">
        Source: {label}, going into {spec.name} {spec.width}×{spec.height}. The dashed red line is a perfect circle in the source, pushed through each mode’s transform.
        Only stretch bends it; cover and contain trade distortion for cropping or empty bars. Fit math: <a href={blob('site/src/fit.js')}>fit.js</a>, checked on every build.
      </p>
      <div className="fits">
        {modes.map(([m, t, cap]) => (
          <figure key={m} className="tile">
            <h3>{t}</h3>
            <div className="fitbox"><FitCanvas source={source} spec={spec} mode={m} /></div>
            <figcaption className="hint">{m === 'stretch' && Math.abs(d) < 0.0005 ? 'same shape: no distortion' : cap}</figcaption>
          </figure>
        ))}
      </div>
      <div className="scroll-x" style={{ marginTop: 16 }}>
        <table>
          <thead><tr><th>Target</th><th>Stretch distortion</th><th>Cover keeps of source / contain fills of asset</th></tr></thead>
          <tbody>
            {SPECS.map((s) => {
              const dd = distortion(source.width, source.height, s.width, s.height), cc = coverage(source.width, source.height, s.width, s.height);
              return <tr key={s.name}><td><b>{s.name}</b></td><td className={Math.abs(dd) < 0.05 ? 'ok' : 'no'}>{signed(dd)}</td><td>{pct(cc)}</td></tr>;
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Matrix({ dims, setSize, upload }) {
  const cols = Array.from({ length: 26 }, (_, i) => 0.5 + i * 0.1);
  const srcA = dims.w / dims.h;
  const W = 960, l = 128, top = 8, rowH = 40, H = top + SPECS.length * rowH + 30;
  const cw = (W - l) / cols.length;
  const ax = (a) => l + ((a - 0.45) / 2.6) * (W - l);
  const color = (v) => {
    const t = Math.min(1, Math.abs(v)); // 0 = aspect kept, 1 = 100% or more
    return v >= 0 ? `color-mix(in srgb, var(--warn) ${Math.round(8 + t * 82)}%, transparent)` : `color-mix(in srgb, var(--primary) ${Math.round(8 + t * 82)}%, transparent)`;
  };
  return (
    <section id="matrix" className="card window reveal" data-title="distortion-matrix.svg (live calculator)">
      <p className="eyebrow">Distortion calculator</p>
      <h2>Which assets get <em>squashed</em> by your source shape?</h2>
      <p className="sub">
        Distortion = horizontal scale ÷ vertical scale − 1. At +40% a circle comes out 40% wider than tall; at −44% it comes out 44% narrower. Move the sliders, or pick a file in the generator to use its real size.
      </p>
      <div className="grid2" style={{ marginTop: 16 }}>
        <div className="controls" style={{ gridTemplateColumns: '1fr', margin: 0 }}>
          <Range label="Source width" value={dims.w} min={200} max={3000} step={10} onChange={(w) => setSize({ ...dims, w })} show={`${dims.w} px`} />
          <Range label="Source height" value={dims.h} min={200} max={3000} step={10} onChange={(h) => setSize({ ...dims, h })} show={`${dims.h} px`} />
          <p className="hint" style={{ margin: 0 }}>Source aspect {srcA.toFixed(3)}:1{upload ? ` (from ${upload.name})` : ''}. Moving a slider switches back to the test pattern.</p>
        </div>
        <div className="tiles mini">
          {SPECS.map((s) => {
            const v = distortion(dims.w, dims.h, s.width, s.height);
            return <div className="tile" key={s.name}><div className="num" style={{ color: Math.abs(v) < 0.05 ? 'var(--good)' : v > 0 ? 'var(--warn)' : 'var(--primary)' }}>{signed(v)}</div><div className="cap">{s.name}: x ×{(s.width / dims.w).toFixed(3)}, y ×{(s.height / dims.h).toFixed(3)}</div></div>;
          })}
        </div>
      </div>
      <h3 style={{ marginTop: 22 }}>Distortion by source aspect ratio (columns) and asset (rows)</h3>
      <div className="scroll-x heat"><svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Heatmap of stretch distortion for source aspect ratios 0.5 to 3.0 across ${SPECS.length} assets; current source ${srcA.toFixed(2)} to 1`}>
        {SPECS.map((s, r) => (
          <g key={s.name}>
            <text x={l - 10} y={top + r * rowH + rowH / 2 + 4} textAnchor="end">{s.name}</text>
            {cols.map((a) => {
              const v = s.aspect / a - 1;
              return <rect key={a} x={ax(a) - cw / 2 + 1} y={top + r * rowH + 2} width={cw - 2} height={rowH - 4} rx="4" fill={color(v)}><title>{`${s.name}, source ${a.toFixed(1)}:1 → ${signed(v)}`}</title></rect>;
            })}
          </g>
        ))}
        {[0.5, 1, 1.5, 2, 2.5, 3].map((a) => <text key={a} x={ax(a)} y={H - 6} textAnchor="middle">{a}:1</text>)}
        {srcA >= 0.45 && srcA <= 3.05 && <g><line x1={ax(srcA)} x2={ax(srcA)} y1={top - 4} y2={top + SPECS.length * rowH + 4} stroke="var(--text)" strokeWidth="2.5" /><text x={ax(srcA)} y={top + SPECS.length * rowH + 16} textAnchor="middle" style={{ fill: 'var(--text)', fontWeight: 700 }}>you</text></g>}
      </svg></div>
      <div className="legend"><span><i style={{ background: 'var(--primary)' }} />squashed narrow</span><span><i style={{ background: 'var(--warn)' }} />stretched wide</span><span>pale = close to the original shape · full colour = 100% or more</span></div>
    </section>
  );
}

function AlphaAudit() {
  const [rows, setRows] = useState(null);
  const [busy, setBusy] = useState(false);
  const run = useCallback(async () => {
    setBusy(true);
    const src = drawPattern(800, 500, true);
    const res = [];
    for (const spec of SPECS) {
      for (const flatten of [false, true]) {
        // encode to PNG, decode it again, and read the decoded pixels: this tests the file, not the canvas
        const png = await toPng(renderAsset(src, spec, { flatten }));
        const bmp = await createImageBitmap(png);
        const c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height;
        const g = c.getContext('2d'); g.drawImage(bmp, 0, 0);
        res.push({ spec, flatten, ...alphaCounts(g.getImageData(0, 0, c.width, c.height).data) });
      }
    }
    setRows(res); setBusy(false);
  }, []);
  useEffect(() => { const t = setTimeout(run, 400); return () => clearTimeout(t); }, [run]);
  const before = rows?.filter((r) => !r.flatten) ?? [], after = rows?.filter((r) => r.flatten) ?? [];
  const leaked = before.reduce((a, r) => a + r.transparent, 0), left = after.reduce((a, r) => a + r.transparent, 0);
  return (
    <section id="alpha" className="card window reveal" data-title="alpha-audit.log (live)">
      <div className="head">
        <div>
          <p className="eyebrow">Testing a README claim</p>
          <h2>Does the output really have <em>no alpha</em>?</h2>
        </div>
        {rows && <span className={`pill ${left === 0 ? 'good' : 'bad'}`}>● {left === 0 ? 'Claim holds after the fix' : 'Claim fails'}</span>}
      </div>
      <p className="sub">
        The README says the files carry no transparency (<a href={blob('README.md', L.noAlpha)}>README line {L.noAlpha}</a>). The original <code>script.js</code> never filled the canvas, so a transparent source stayed transparent.
        This audit draws a half-transparent test pattern, runs it through both pipelines, encodes each asset to PNG, decodes the PNG and counts pixels with alpha below 255.
      </p>
      <div className="actions"><button className="btn primary" type="button" onClick={run} disabled={busy}>{busy ? 'Auditing…' : 'Run the audit again'}</button><span className="hint">Measured in this browser; another PNG encoder could differ.</span></div>
      <pre className="term" aria-live="polite">
        {!rows ? '$ auditing…' : [
          '$ alpha-audit --source test-pattern-800x500-transparent',
          ...before.map((r, i) => {
            const a = after[i];
            return `${r.spec.name.padEnd(14)} original: ${fmt(r.transparent).padStart(9)} / ${fmt(r.spec.pixels).padStart(9)} px transparent   flattened: ${fmt(a.transparent).padStart(2)}`;
          }),
          `total          original: ${fmt(leaked)} transparent px   flattened: ${fmt(left)}`,
        ].join('\n')}
      </pre>
    </section>
  );
}

function Review() {
  const items = [
    ['Fixed', 'good', 'ZIP could ship partially', <>Download ZIP was enabled before the async <code>toBlob</code> callbacks finished, and “Processing Complete” showed while work was still running. Now gated on <code>Promise.all</code> (<a href={blob('script.js', L.all)}>script.js:{L.all}</a>); cards follow spec order.</>],
    ['Fixed', 'good', 'Alpha claim untested', <>The README promised no alpha but nothing flattened the canvas. White fill added (<a href={blob('script.js', L.fill)}>script.js:{L.fill}</a>); the live audit above checks it.</>],
    ['Fixed', 'good', 'Duplicate JSZip tag, leaked object URLs', <>JSZip now loads once (<a href={blob('index.html', L.jszip)}>index.html:{L.jszip}</a>); previous object URLs are revoked on each upload (<a href={blob('script.js', L.revoke)}>script.js:{L.revoke}</a>).</>],
    ['Fixed', 'good', 'Keyboard access', <>The drop zone answers Enter and Space (<a href={blob('script.js', L.key)}>script.js:{L.key}</a>) and preview cards are real buttons.</>],
    ['Open', 'warn', 'Stretch distorts off-shape sources', <>Every asset is a plain stretch (<a href={blob('script.js', L.draw)}>script.js:{L.draw}</a>). A cover/contain option would fix it, but it changes output, so it is left as a product decision.</>],
    ['Open', 'warn', 'Errors use alert()', <>Invalid files raise a blocking <code>alert</code> (<a href={blob('script.js', L.alert)}>script.js:{L.alert}</a>) instead of an inline, announced message.</>],
    ['Open', 'warn', 'Store sizes not sourced', <>The README now links Google’s image guidelines, but nothing checks the sizes against them, and icon padding guidance is not handled.</>],
    ["Owner's call", 'bad', 'No LICENSE file', <>The README shows an MIT badge (<a href={blob('README.md', L.badge)}>line {L.badge}</a>) but the repo has no LICENSE. Choosing a licence is a legal decision, so it is flagged, not added.</>],
  ];
  return (
    <section id="review" className="card window reveal" data-title="engineering-review.md">
      <p className="eyebrow">Engineering review · limitations</p>
      <h2>What was wrong, what is fixed, <em>what is still open</em>.</h2>
      <p className="sub">
        Full grading in <a href={blob('docs/research-review.md')}>docs/research-review.md</a>. Line numbers here are looked up in the committed files when the page is built.
        Product behaviour is covered by a smoke test that runs <code>script.js</code> in a stubbed DOM: <a href={blob('site/src/product.check.mjs')}>product.check.mjs</a>.
      </p>
      <div className="grid2" style={{ marginTop: 16 }}>
        {items.map(([s, tone, t, d]) => (
          <div className="tile" key={t}>
            <div className="head" style={{ marginBottom: 6 }}><h3>{t}</h3><span className={`pill ${tone}`}>{s}</span></div>
            <p className="hint" style={{ margin: 0, fontSize: 13 }}>{d}</p>
          </div>
        ))}
      </div>
      <p className="hint" style={{ marginTop: 16 }}>
        Limits of this lab: distortion is geometry, not a perceptual quality score; the generator previews show the stretch on whatever you feed it but cannot judge whether it looks acceptable;
        file sizes, timings and the alpha audit are measured in the browser you are using.
      </p>
    </section>
  );
}
