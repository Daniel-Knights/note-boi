import { KeyStore } from '../../../classes';

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

    it('Throws error when unable to get DB', async () => {
      // Spy on indexedDB.open to return a request that fails
      const openSpy = vi.spyOn(window.indexedDB, 'open').mockImplementation(() => {
        const request = {
          error: new Error('Unable to get DB'),
        } as IDBOpenDBRequest;

        setTimeout(() => {
          request.onerror!({} as Event);
        });

        return request;
      });

      try {
        let errorThrown = false;

        try {
          await KeyStore.storeKey(key);
        } catch (err) {
          errorThrown = true;
          assert.include((err as Error).message, 'Unable to get DB');
        }

        assert.isTrue(errorThrown, 'Should throw error when DB is unavailable');
      } finally {
        openSpy.mockRestore();
      }
    });
  });

  describe('getKey', () => {
    it('Retrieves the key from the store', async () => {
      await KeyStore.storeKey(key);

      const storedKey = await KeyStore.getKey();

      assert.strictEqual(storedKey, key);
    });

    it('Throws error when unable to get DB', async () => {
      // Spy on indexedDB.open to return a request that fails
      const openSpy = vi.spyOn(window.indexedDB, 'open').mockImplementation(() => {
        const request = {
          error: new Error('Unable to get DB'),
        } as IDBOpenDBRequest;

        setTimeout(() => {
          request.onerror!({} as Event);
        });

        return request;
      });

      try {
        let errorThrown = false;

        try {
          await KeyStore.getKey();
        } catch (err) {
          errorThrown = true;
          assert.include((err as Error).message, 'Unable to get DB');
        }

        assert.isTrue(errorThrown, 'Should throw error when DB is unavailable');
      } finally {
        openSpy.mockRestore();
      }
    });
  });
});
