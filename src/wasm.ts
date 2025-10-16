// eslint-disable-next-line import/no-relative-packages
import init, { decrypt, derive_key as deriveKey, encrypt } from './wasm/note_boi_wasm';

export class Wasm {
  static async deriveKey(
    password: CryptoKey,
    salt: Uint8Array,
    keyUsages: Array<'encrypt' | 'decrypt'>
  ): Promise<CryptoKey> {
    await init();

    return deriveKey(password, salt, keyUsages);
  }

  static async encrypt(iv: Uint8Array, key: CryptoKey, data: Uint8Array) {
    await init();

    return encrypt(iv, key, data);
  }

  static async decrypt(iv: Uint8Array, key: CryptoKey, data: Uint8Array) {
    await init();

    return decrypt(iv, key, data);
  }
}
