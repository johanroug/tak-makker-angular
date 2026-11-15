export const MAX_IMAGE_REQUEST_BYTES = 4_300_000;
export class ImageInputError extends Error {}

/** Validate inline uploads only; never fetch client-controlled URLs. */
export function validateImageInput(body: Record<string, unknown>): { messageId: string; images: { id: string; dataUrl: string }[] } | undefined {
  if (body.images === undefined) return undefined;
  if (!Array.isArray(body.images) || !body.images.length || body.images.length > 3 ||
      typeof body.messageId !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.messageId)) {
    throw new ImageInputError('Send højst 3 billeder knyttet til en gyldig besked.');
  }
  const ids = new Set<string>();
  const images = body.images.map((image: unknown) => {
    if (!image || typeof image !== 'object') throw new ImageInputError('Ugyldigt billede.');
    const { id, dataUrl } = image as Record<string, unknown>;
    if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id) || ids.has(id) || typeof dataUrl !== 'string' || dataUrl.length > 1_400_000)
      throw new ImageInputError('Ugyldigt billede eller for stor fil.');
    ids.add(id);
    const match = /^data:image\/(webp|jpeg);base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl);
    if (!match || match[2].length % 4) throw new ImageInputError('Billeder skal være JPEG eller WebP.');
    let raw: string;
    try { raw = atob(match[2]); } catch { throw new ImageInputError('Billedet kunne ikke læses.'); }
    if (!raw.length || raw.length > 1024 * 1024) throw new ImageInputError('Billedet må højst fylde 1 MB efter optimering.');
    const bytes = Uint8Array.from(raw, char => char.charCodeAt(0));
    const dimensions = imageDimensions(bytes, match[1]);
    if (!dimensions || dimensions.some(size => size < 1 || size > 1600)) throw new ImageInputError('Ugyldigt billede. Længste side må højst være 1600 px.');
    return { id, dataUrl };
  });
  return { messageId: body.messageId, images };
}

function imageDimensions(bytes: Uint8Array, type: string): [number, number] | undefined {
  if (type === 'jpeg') {
    if (bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes.at(-2) !== 0xff || bytes.at(-1) !== 0xd9) return;
    for (let offset = 2; offset + 8 < bytes.length;) {
      if (bytes[offset++] !== 0xff) return;
      while (bytes[offset] === 0xff) offset++;
      const marker = bytes[offset++];
      const size = bytes[offset] * 256 + bytes[offset + 1];
      if (size < 2 || offset + size > bytes.length) return;
      if ([0xc0, 0xc1, 0xc2].includes(marker)) return [bytes[offset + 5] * 256 + bytes[offset + 6], bytes[offset + 3] * 256 + bytes[offset + 4]];
      offset += size;
    }
    return;
  }
  if (bytes.length < 30 || String.fromCharCode(...bytes.slice(0, 4)) !== 'RIFF' || String.fromCharCode(...bytes.slice(8, 12)) !== 'WEBP') return;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(4, true) + 8 !== bytes.length) return;
  const chunk = String.fromCharCode(...bytes.slice(12, 16));
  if (chunk === 'VP8X') return [1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16), 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16)];
  if (chunk === 'VP8 ' && bytes[23] === 0x9d && bytes[24] === 1 && bytes[25] === 0x2a) return [view.getUint16(26, true) & 0x3fff, view.getUint16(28, true) & 0x3fff];
  if (chunk === 'VP8L' && bytes[20] === 0x2f) return [1 + bytes[21] + ((bytes[22] & 0x3f) << 8), 1 + (bytes[22] >> 6) + (bytes[23] << 2) + ((bytes[24] & 0xf) << 10)];
}

export async function readImageRequest(request: Request): Promise<Record<string, unknown>> {
  if (Number(request.headers.get('content-length')) > MAX_IMAGE_REQUEST_BYTES) throw new ImageInputError('Billedpakken er for stor.');
  const reader = request.body?.getReader();
  if (!reader) throw new ImageInputError('Tom forespørgsel.');
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_IMAGE_REQUEST_BYTES) { await reader.cancel(); throw new ImageInputError('Billedpakken er for stor.'); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    const body = JSON.parse(new TextDecoder().decode(bytes));
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error();
    return body;
  } catch (error) {
    if (error instanceof ImageInputError) throw error;
    throw new ImageInputError('Forespørgslen kunne ikke læses.');
  } finally { reader.releaseLock(); }
}
