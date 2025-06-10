import { Encryptor } from '../../../classes';
import { mockDb } from '../../mock';
import localNotes from '../../notes.json';
import { isNote } from '../../utils';

describe('Encryptor', () => {
  describe('generatePasswordKey', () => {
    it('Generates a password key', async () => {
      const passwordKey = await Encryptor.generatePasswordKey('1');

      assert.instanceOf(passwordKey, CryptoKey);
    });

    it('Throws an error for empty password', async () => {
      try {
        await Encryptor.generatePasswordKey('');
      } catch (err) {
        assert.instanceOf(err, Error);
        assert.equal(err.message, 'Password cannot be empty');
      }
    });
  });

  it('encryptNotes', async () => {
    const passwordKey = await Encryptor.generatePasswordKey('1');
    const encryptedNotes = await Encryptor.encryptNotes(localNotes, passwordKey);

    assert.lengthOf(encryptedNotes, localNotes.length);

    encryptedNotes.forEach((note) => {
      assert.isString(note.content);
    });
  });

  describe('decryptNotes', () => {
    it('Decrypts notes', async () => {
      const passwordKey = await Encryptor.generatePasswordKey('1');
      const decryptedNotes = await Encryptor.decryptNotes(
        mockDb.encryptedNotes,
        passwordKey
      );

      assert.lengthOf(decryptedNotes, mockDb.encryptedNotes.length);

      decryptedNotes.forEach((nt) => {
        assert.isTrue(isNote(nt));
      });
    });

    it('Handles unencrypted notes', async () => {
      const passwordKey = await Encryptor.generatePasswordKey('1');
      const decryptedNotes = await Encryptor.decryptNotes(localNotes, passwordKey);

      assert.lengthOf(decryptedNotes, localNotes.length);

      decryptedNotes.forEach((nt) => {
        assert.isTrue(isNote(nt));
      });
    });
  });
});
