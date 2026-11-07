// Fit geometry for one source image going into one target size.
// stretch = what script.js does (whole source onto whole target, aspect not kept)
// cover   = scale until the target is filled, crop the overflow (centred)
// contain = scale until the source fits, letterbox the rest (centred)
// Returns drawImage arguments: source rect (sx, sy, sw, sh) -> destination rect (dx, dy, dw, dh).
export function fitRect(srcW, srcH, dstW, dstH, mode) {
  if (mode === 'stretch') return { sx: 0, sy: 0, sw: srcW, sh: srcH, dx: 0, dy: 0, dw: dstW, dh: dstH };
  const srcA = srcW / srcH, dstA = dstW / dstH;
  if (mode === 'cover') {
    const sw = srcA > dstA ? srcH * dstA : srcW, sh = srcA > dstA ? srcH : srcW / dstA;
    return { sx: (srcW - sw) / 2, sy: (srcH - sh) / 2, sw, sh, dx: 0, dy: 0, dw: dstW, dh: dstH };
  }
  if (mode === 'contain') {
    const dw = srcA > dstA ? dstW : dstH * srcA, dh = srcA > dstA ? dstW / srcA : dstH;
    return { sx: 0, sy: 0, sw: srcW, sh: srcH, dx: (dstW - dw) / 2, dy: (dstH - dh) / 2, dw, dh };
  }
  throw new Error(`unknown fit mode ${mode}`);
}

// How a stretch deforms the picture: horizontal scale / vertical scale - 1.
// A circle comes out as an ellipse whose width/height is 1 + distortion.
// > 0 = stretched wide, < 0 = squashed narrow, 0 = aspect kept.
export const distortion = (srcW, srcH, dstW, dstH) => (dstW / srcW) / (dstH / srcH) - 1;

// Share of the source kept by cover (= share of the target filled by contain).
export const coverage = (srcW, srcH, dstW, dstH) => { const r = (srcW / srcH) / (dstW / dstH); return Math.min(r, 1 / r); };

// RGBA byte array -> counts of fully opaque and not-fully-opaque pixels.
export function alphaCounts(data) {
  let transparent = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i] < 255) transparent++;
  return { opaque: data.length / 4 - transparent, transparent };
}
