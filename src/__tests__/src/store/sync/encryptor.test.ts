import { Encryptor, KeyStore } from '../../../../store/sync';
import { mockDb } from '../../../api';
import localNotes from '../../../notes.json';

describe('Encryptor', () => {
  describe('setPasswordKey', () => {
    it('Generates and stores a CryptoKey from the given password', async () => {
      const password = '1';

      await Encryptor.setPasswordKey(password);

      const passwordKey = await KeyStore.getKey();

      assert.isDefined(passwordKey);
    });
  });

  describe('encryptNotes', () => {
    it('Sets password key if password is given', async () => {
      const setPasswordKeySpy = vi.spyOn(Encryptor, 'setPasswordKey');

      await Encryptor.encryptNotes([], '1');

      expect(setPasswordKeySpy).toHaveBeenCalled();
    });

    it("Doesn't set password key if no password is given", async () => {
      const setPasswordKeySpy = vi.spyOn(Encryptor, 'setPasswordKey');

      await Encryptor.encryptNotes([]);

      expect(setPasswordKeySpy).not.toHaveBeenCalled();
    });

    it('Encrypts notes', async () => {
      const encryptedNotes = await Encryptor.encryptNotes(localNotes, '1');

      expect(encryptedNotes).toHaveLength(localNotes.length);

      encryptedNotes.forEach((note) => {
        assert.isString(note.content);
      });
    });
  });

  describe('decryptNotes', () => {
    it('Sets password key if password is given', async () => {
      const setPasswordKeySpy = vi.spyOn(Encryptor, 'setPasswordKey');

      await Encryptor.decryptNotes([], '1');

      expect(setPasswordKeySpy).toHaveBeenCalled();
    });

    it("Doesn't set password key if no password is given", async () => {
      const setPasswordKeySpy = vi.spyOn(Encryptor, 'setPasswordKey');

      await Encryptor.decryptNotes([]);

      expect(setPasswordKeySpy).not.toHaveBeenCalled();
    });

    it('Decrypts notes', async () => {
      const decryptedNotes = await Encryptor.decryptNotes(mockDb.encryptedNotes, '1');

      assert.lengthOf(decryptedNotes, mockDb.encryptedNotes.length);

      decryptedNotes.forEach((note) => {
        assert.isObject(note.content);
      });
    });
  });
});
