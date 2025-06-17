import { Encryptor } from '../../../classes';
import { getDummyNotes, getEncryptedNotes, isNote, passwordKey } from '../../utils';

describe('Encryptor', () => {
  describe('generatePasswordKey', () => {
    it('Generates a password key', async () => {
      const key = await Encryptor.generatePasswordKey('1');

      assert.instanceOf(key, CryptoKey);
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
    const encryptedNotes = await Encryptor.encryptNotes(getDummyNotes(), passwordKey);

    assert.lengthOf(encryptedNotes, getDummyNotes().length);

    encryptedNotes.forEach((note) => {
      assert.isString(note.content);
    });
  });

  describe('decryptNotes', () => {
    it('Decrypts notes', async () => {
      const encryptedNotes = getEncryptedNotes();
      const decryptedNotes = await Encryptor.decryptNotes(encryptedNotes, passwordKey);

      assert.lengthOf(decryptedNotes, encryptedNotes.length);

      decryptedNotes.forEach((nt) => {
        assert.isTrue(isNote(nt));
      });
    });

    it('Handles unencrypted notes', async () => {
      const decryptedNotes = await Encryptor.decryptNotes(getDummyNotes(), passwordKey);

      assert.lengthOf(decryptedNotes, getDummyNotes().length);

      decryptedNotes.forEach((nt) => {
        assert.isTrue(isNote(nt));
      });
    });
  });
});
