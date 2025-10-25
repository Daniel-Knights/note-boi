// eslint-disable-next-line import/no-relative-packages
import init, { derive_key as deriveKey } from './wasm/note_boi_wasm';

let wasmInitialized = false;

async function ensureWasmInit() {
  if (wasmInitialized) return;

  await init();

  wasmInitialized = true;
}

export class Wasm {
  static async deriveKey(
    passwordKey: CryptoKey,
    salt: Uint8Array,
    keyUsages: KeyUsage[]
  ): Promise<CryptoKey> {
    await ensureWasmInit();

    const passwordArrayBuffer = await crypto.subtle.exportKey('raw', passwordKey);
    const passwordBytes = new Uint8Array(passwordArrayBuffer);
    const derivedKey = deriveKey(passwordBytes, salt);

    return crypto.subtle.importKey(
      'raw',
      new Uint8Array(derivedKey),
      { name: 'AES-GCM' },
      false,
      keyUsages
    );
  }
}
