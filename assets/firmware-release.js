const MAX_SIZE = 16 * 1024 * 1024;
const PREFIX = 'MAYDAY_OBI_META_V1|';

export function inspectFirmware(bytes, kind) {
  const offset = kind === 'factory' ? 0x10000 : 0;
  const esp = pos => bytes[pos] === 0xe9 && bytes[pos + 12] === 9 && bytes[pos + 13] === 0;
  const app = pos => esp(pos) && bytes[pos + 32] === 0x32 && bytes[pos + 33] === 0x54 &&
    bytes[pos + 34] === 0xcd && bytes[pos + 35] === 0xab;
  if (bytes.length > MAX_SIZE || !app(offset) ||
      (kind === 'factory' && (!esp(0) || bytes[0x8000] !== 0xaa || bytes[0x8001] !== 0x50))) {
    throw new Error('invalid_image');
  }
  const text = new TextDecoder('latin1').decode(bytes.subarray(offset));
  const matches = [...text.matchAll(/MAYDAY_OBI_META_V1\|board=([a-z0-9_-]+)\|version=(v\.?\d+(?:\.\d+)*[a-z]*)\|build=(\d{4}\.\d{2}\.\d{2}-\d{4})\|END/g)];
  if (!matches.length && !text.includes(PREFIX)) return null;
  if (matches.length !== 1 || matches[0][1] !== 'jc3248w535') throw new Error('invalid_metadata');
  return {version: matches[0][2].replace(/^v\./, 'v'), build: matches[0][3], board: matches[0][1]};
}

export async function readFirmwareRelease(baseURL, legacyManifest, signal, fetcher = fetch) {
  const stamp = Date.now().toString();
  async function read(name) {
    const url = new URL(name, baseURL);
    url.searchParams.set('release', stamp);
    const response = await fetcher(url, {cache: 'no-store', signal});
    if (response.status === 404) return null;
    if (!response.ok) throw new Error('network');
    if (Number(response.headers.get('Content-Length')) > MAX_SIZE) throw new Error('invalid_image');
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length > MAX_SIZE) throw new Error('invalid_image');
    return bytes;
  }
  const factory = await read('firmware.factory.bin');
  if (!factory) {
    // Legacy-only fallback for the historical v1.10c single merged-image release.
    const oldPart = legacyManifest.builds?.find(item => item.chipFamily === 'ESP32-S3')?.parts?.[0];
    if (oldPart?.path !== 'firmware.bin' || oldPart.offset !== 0) throw new Error('missing_factory');
    const old = await read('firmware.bin');
    if (!old) throw new Error('unavailable');
    const metadata = inspectFirmware(old, 'factory');
    if (!metadata && !/^v\.?\d+(?:\.\d+)*[a-z]*$/.test(legacyManifest.version || '')) throw new Error('invalid_metadata');
    return {version: metadata?.version || legacyManifest.version, build: metadata?.build || '',
      factoryBytes: old, appBytes: null, legacy: true};
  }
  const factoryMetadata = inspectFirmware(factory, 'factory');
  const app = await read('firmware.bin');
  if (!app) throw new Error('release_pair');
  const appMetadata = inspectFirmware(app, 'app');
  if (!factoryMetadata || !appMetadata) throw new Error('invalid_metadata');
  if (factoryMetadata.version !== appMetadata.version || factoryMetadata.build !== appMetadata.build ||
      factoryMetadata.board !== appMetadata.board || factory.length < 0x10000 + app.length) {
    throw new Error('release_pair');
  }
  for (let i = 0; i < app.length; i++) {
    if (app[i] !== factory[0x10000 + i]) throw new Error('release_pair');
  }
  return {...factoryMetadata, factoryBytes: factory, appBytes: app, legacy: false};
}
