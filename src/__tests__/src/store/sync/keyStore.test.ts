import { KeyStore } from '../../../../store/sync';

const key = await window.crypto.subtle.generateKey(
  { name: 'AES-GCM', length: 256 },
  true,
  ['decrypt']
);

describe('KeyStore', () => {
  describe('reset', () => {
    it('Resets the store', async () => {
      await KeyStore.storeKey(key);

      let storedKey = await KeyStore.getKey();

      assert.strictEqual(storedKey, key);

      await KeyStore.reset();

      const dbs = await window.indexedDB.databases();

      assert.lengthOf(dbs, 1); // Should only close the db, not delete it

      storedKey = await KeyStore.getKey();

      assert.isUndefined(storedKey);
    });
  });

  describe('storeKey', () => {
    it('Stores the given key in the store', async () => {
      await KeyStore.storeKey(key);

      const storedKey = await KeyStore.getKey();

      assert.strictEqual(storedKey, key);
    });
  });

  describe('getKey', () => {
    it('Retrieves the key from the store', async () => {
      await KeyStore.storeKey(key);

      const storedKey = await KeyStore.getKey();

      assert.strictEqual(storedKey, key);
    });
  });
});
