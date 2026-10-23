const svgNamespace = 'http://www.w3.org/2000/svg';
const elements = new Set(['svg', 'g', 'path', 'rect', 'circle', 'ellipse', 'polygon', 'polyline', 'line', 'text', 'tspan', 'defs', 'linearGradient', 'radialGradient', 'stop', 'clipPath', 'mask', 'use', 'symbol', 'title', 'desc']);
const properties = ['fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-dasharray', 'stroke-dashoffset', 'fill-rule', 'clip-rule', 'opacity', 'fill-opacity', 'stroke-opacity', 'stop-color', 'stop-opacity', 'color', 'font-size', 'font-family', 'font-weight', 'text-anchor', 'dominant-baseline', 'display', 'visibility'];

function safeValue(value: string): boolean {
  return !/@|expression|javascript|data:|https?:|\/\//i.test(value)
    && [...value.matchAll(/url\(([^)]+)\)/gi)].every(match => /^['"]?#[\w:.-]+['"]?$/.test(match[1].trim()));
}

export function prepareSvg(source: string, color: string | null = null): string {
  if (source.length > 200_000 || /<!DOCTYPE|<!ENTITY/i.test(source)) throw new Error('SVG-filen er for stor eller indeholder ikke-understøttede data.');
  if (color !== null && !/^#[0-9a-f]{6}$/i.test(color)) throw new Error('Vælg en gyldig logofarve.');
  const doc = new DOMParser().parseFromString(source, 'image/svg+xml');
  const root = doc.documentElement;
  if (root.localName !== 'svg' || root.namespaceURI !== svgNamespace || doc.querySelector('parsererror')) throw new Error('SVG-filen kunne ikke læses.');
  if (root.querySelectorAll('*').length > 5000) throw new Error('SVG-logoet er for komplekst. Vælg en enklere fil.');

  // Resolve ordinary exported class styles before removing stylesheets.
  for (const sheet of Array.from(root.querySelectorAll('style'))) {
    for (const rule of (sheet.textContent ?? '').matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      if (rule[1].includes('@')) continue;
      const style = document.createElement('span').style;
      style.cssText = rule[2];
      try {
        for (const node of Array.from(root.querySelectorAll(rule[1].trim()))) {
          for (const property of properties) {
            const value = style.getPropertyValue(property);
            if (value && safeValue(value) && !node.hasAttribute(property) && !(node as SVGElement).style?.getPropertyValue(property)) node.setAttribute(property, value);
          }
        }
      } catch { /* Ignore unsupported selectors from exported stylesheets. */ }
    }
    sheet.remove();
  }

  for (const node of [root, ...Array.from(root.querySelectorAll('*'))]) {
    if (!elements.has(node.localName) || node.namespaceURI !== svgNamespace) { node.remove(); continue; }
    const inline = (node as SVGElement).style;
    for (const property of properties) {
      const value = inline?.getPropertyValue(property);
      if (value && safeValue(value)) node.setAttribute(property, value);
    }
    for (const attribute of Array.from(node.attributes)) {
      if (attribute.namespaceURI === 'http://www.w3.org/2000/xmlns/') continue;
      const name = attribute.localName;
      if (name.toLowerCase().startsWith('on') || name === 'style' || name === 'base' || !safeValue(attribute.value)
        || (name === 'href' && !/^#[\w:.-]+$/.test(attribute.value))) node.removeAttributeNode(attribute);
    }
  }

  const viewBox = root.getAttribute('viewBox')?.trim().split(/[\s,]+/).map(Number);
  let width = viewBox?.[2] ?? Number.parseFloat(root.getAttribute('width') ?? '');
  let height = viewBox?.[3] ?? Number.parseFloat(root.getAttribute('height') ?? '');
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0 || width > 1_000_000 || height > 1_000_000
    || (viewBox && (viewBox.length !== 4 || !viewBox.every(Number.isFinite)))) throw new Error('SVG-logoet skal have en gyldig viewBox eller bredde og højde.');
  if (!viewBox) root.setAttribute('viewBox', `0 0 ${width} ${height}`);
  const scale = Math.min(600 / width, 240 / height);
  width = Math.max(1, Math.round(width * scale));
  height = Math.max(1, Math.round(height * scale));
  root.setAttributeNS('http://www.w3.org/2000/xmlns/', 'xmlns', svgNamespace);
  root.setAttribute('width', String(width));
  root.setAttribute('height', String(height));
  if (color) {
    root.setAttribute('color', color);
    if (!['none', 'transparent'].includes(root.getAttribute('fill')?.trim() ?? '')) root.setAttribute('fill', color);
    for (const node of [root, ...Array.from(root.querySelectorAll('*'))]) {
      if (node.hasAttribute('fill') && !['none', 'transparent'].includes(node.getAttribute('fill')!.trim())) node.setAttribute('fill', color);
      if (node.hasAttribute('stroke') && !['none', 'transparent'].includes(node.getAttribute('stroke')!.trim())) node.setAttribute('stroke', color);
      if (node.hasAttribute('stop-color')) node.setAttribute('stop-color', color);
      if (node.hasAttribute('color')) node.setAttribute('color', color);
    }
  }
  return new XMLSerializer().serializeToString(root);
}

export async function svgToPng(source: string, color: string | null): Promise<string> {
  const svg = prepareSvg(source, color);
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Browseren kunne ikke behandle SVG-logoet.');
    context.drawImage(image, 0, 0);
    const result = canvas.toDataURL('image/png');
    if (result.length > 300_000) throw new Error('Logoet fylder for meget. Vælg en enklere SVG-fil.');
    return result;
  } finally { URL.revokeObjectURL(url); }
}
