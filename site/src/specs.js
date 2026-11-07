// Parses the asset spec list straight out of the product's script.js, so the dashboard never
// retypes a size. Throws (and so fails the build) if the array is reformatted beyond recognition.
export function parseSpecs(source) {
  const block = source.match(/const specs = \[([\s\S]*?)\];/);
  if (!block) throw new Error('specs array not found in script.js');
  const specs = [...block[1].matchAll(/\{\s*name:\s*"([^"]+)",\s*width:\s*(\d+),\s*height:\s*(\d+)\s*\}/g)].map(([, name, w, h]) => {
    const width = +w, height = +h;
    // same file-name rule as script.js generateAssets
    return { name, width, height, aspect: width / height, pixels: width * height, fileName: `refract_${name.replace(/\s+/g, '_').toLowerCase()}.png` };
  });
  const entries = (block[1].match(/\{/g) || []).length;
  if (!specs.length || specs.length !== entries) throw new Error(`parsed ${specs.length} of ${entries} spec entries in script.js`);
  return specs;
}

// Reads the "Generated Assets" table in README.md: | **Name** | `W x H` | ... |
export function parseReadmeSizes(readme) {
  return [...readme.matchAll(/\|\s*\*\*([^*]+)\*\*\s*\|\s*`(\d+)\s*x\s*(\d+)`/g)].map(([, name, w, h]) => ({ name, width: +w, height: +h }));
}
