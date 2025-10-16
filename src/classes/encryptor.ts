// eslint-disable-next-line import/no-relative-packages
import { Wasm } from '../wasm';

import { Note } from './note';

const SALT_LENGTH = 16;
const IV_LENGTH = 12;

const enc = new TextEncoder();
const dec = new TextDecoder();

function buffToBase64(buff: Uint8Array): string {
  return window.btoa(buff.reduce((data, byte) => data + String.fromCharCode(byte), ''));
}

function base64ToBuff(b64: string): Uint8Array {
  return Uint8Array.from(window.atob(b64), (c) => c.charCodeAt(0));
}

export class Encryptor {
  static generatePasswordKey(password: string) {
    if (password === '') {
      throw new Error('Password cannot be empty');
    }

    return crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, [
      'deriveKey',
    ]);
  }

  static async #encryptData(secretData: string, passwordKey: CryptoKey): Promise<string> {
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const derivedKey = await Wasm.deriveKey(passwordKey, salt, ['encrypt']);
    const encryptedContent = await Wasm.encrypt(iv, derivedKey, enc.encode(secretData));
    const encryptedContentArr = new Uint8Array(encryptedContent);
    const buff = new Uint8Array(SALT_LENGTH + IV_LENGTH + encryptedContentArr.byteLength);

    buff.set(salt, 0);
    buff.set(iv, SALT_LENGTH);
    buff.set(encryptedContentArr, SALT_LENGTH + IV_LENGTH);

    return buffToBase64(buff);
  }

  static async #decryptData(
    encryptedData: string,
    passwordKey: CryptoKey
  ): Promise<string> {
    const encryptedDataBuff = base64ToBuff(encryptedData);
    const salt = encryptedDataBuff.slice(0, SALT_LENGTH);
    const iv = encryptedDataBuff.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const data = encryptedDataBuff.slice(SALT_LENGTH + IV_LENGTH);
    const derivedKey = await Wasm.deriveKey(passwordKey, salt, ['decrypt']);
    const decryptedContent = await Wasm.decrypt(iv, derivedKey, data);

    return dec.decode(decryptedContent);
  }

  static encryptNotes(notes: Note[], passwordKey: CryptoKey): Promise<EncryptedNote[]> {
    const encryptedNotePromises = notes.map(async (nt) => {
      const encryptedNoteContent = await this.#encryptData(
        JSON.stringify(nt.content),
        passwordKey
      );

      const encryptedNote: EncryptedNote = {
        ...nt,
        content: encryptedNoteContent,
      };

      return encryptedNote;
    });

    return Promise.all(encryptedNotePromises);
  }

  static decryptNotes(
    notes: (EncryptedNote | Note)[],
    passwordKey: CryptoKey
  ): Promise<Note[]> {
    const decryptedNotePromises = notes.map(async (nt) => {
      if (typeof nt.content !== 'string') {
        return nt as Note;
      }

      const decryptedNoteContent = await this.#decryptData(nt.content, passwordKey);

      const decryptedNote: Note = {
        ...nt,
        content: JSON.parse(decryptedNoteContent),
      };

      return decryptedNote;
    });

    return Promise.all(decryptedNotePromises);
  }
}

//// Types

export type EncryptedNote = Omit<Note, 'content'> & {
  content: string;
};
