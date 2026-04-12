import { DeletedNote } from '../api';

import { Note, NoteContent, RawNote } from './note';

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
  static generatePasswordKey(password: string): Promise<CryptoKey | never> {
    if (password === '') {
      throw new Error('Password cannot be empty');
    }

    return crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, [
      'deriveKey',
    ]);
  }

  static #deriveKey(
    passwordKey: CryptoKey,
    salt: BufferSource,
    keyUsage: Array<'encrypt' | 'decrypt'>
  ): Promise<CryptoKey> {
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      passwordKey,
      { name: 'AES-GCM', length: 256 },
      false,
      keyUsage
    );
  }

  static async #encryptData(secretData: string, passwordKey: CryptoKey): Promise<string> {
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const derivedKey = await this.#deriveKey(passwordKey, salt, ['encrypt']);
    const encryptedContent = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      derivedKey,
      enc.encode(secretData)
    );

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
    const derivedKey = await this.#deriveKey(passwordKey, salt, ['decrypt']);
    const decryptedContent = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      derivedKey,
      data
    );

    return dec.decode(decryptedContent);
  }

  static encryptNotes<T extends { content: NoteContent; [key: string]: unknown }>(
    notes: T[],
    passwordKey: CryptoKey
  ): Promise<(T & { content: string })[]> {
    const encryptedNotePromises = notes.map(async (nt) => {
      const encryptedNoteContent = await this.#encryptData(
        JSON.stringify(nt.content),
        passwordKey
      );

      const encryptedNote = {
        ...nt,
        content: encryptedNoteContent,
      };

      return encryptedNote;
    });

    return Promise.all(encryptedNotePromises);
  }

  static decryptNotes<
    T extends EncryptedNote | Note | EncryptedDeletedNote | DeletedNote,
    R = T extends EncryptedNote | Note ? Note : DeletedNote,
  >(notes: T[], passwordKey: CryptoKey): Promise<R[]> {
    const decryptedNotePromises = notes.map(async (nt) => {
      if (typeof nt.content !== 'string') {
        return nt as unknown as R;
      }

      const decryptedNoteContent = await this.#decryptData(nt.content, passwordKey);
      const parsedDecryptedNoteContent = JSON.parse(decryptedNoteContent);

      const decryptedNote =
        // TODO: add isDeletedNote helper?
        'deleted_at' in nt
          ? {
              ...nt,
              content: parsedDecryptedNoteContent,
            }
          : new Note({
              ...nt,
              content: parsedDecryptedNoteContent,
            });

      return decryptedNote as R;
    });

    return Promise.all(decryptedNotePromises);
  }
}

//// Types

export type EncryptedNote = Omit<RawNote, 'content'> & {
  content: string;
};

export type EncryptedDeletedNote = Omit<DeletedNote, 'content'> & {
  content: string;
};
