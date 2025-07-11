export class KeyStore {
  static readonly #dbName = 'NoteBoi';
  static readonly #storeName = 'crypto-key';

  static #db?: IDBDatabase;
  static #key?: CryptoKey;

  static async #getDb(): Promise<IDBDatabase | void> {
    if (this.#db) return this.#db;

    const openRequest = window.indexedDB.open(this.#dbName);

    openRequest.onupgradeneeded = () => {
      this.#db = openRequest.result;

      if (!this.#db.objectStoreNames.contains(this.#storeName)) {
        this.#db.createObjectStore(this.#storeName);
      }

      console.log('DB upgraded');
    };

    this.#db = await promisifyRequest(openRequest);

    return this.#db ?? console.error('Failed to open IndexedDB');
  }

  static async reset(): Promise<void> {
    if (this.#db) {
      const deleteRequest = this.#db
        .transaction([this.#storeName], 'readwrite', {
          durability: 'strict',
        })
        .objectStore(this.#storeName)
        .clear();

      await promisifyRequest(deleteRequest);

      this.#db?.close();
    }

    this.#db = undefined;
    this.#key = undefined;

    console.log('Store reset');
  }

  static async storeKey(key: CryptoKey): Promise<void> {
    const db = await this.#getDb();
    if (!db) return;

    const transaction = db.transaction([this.#storeName], 'readwrite', {
      durability: 'strict',
    });

    const store = transaction.objectStore(this.#storeName);
    const request = store.put(key, this.#storeName);

    await promisifyRequest(request);

    this.#key = key;

    console.log('Stored key');
  }

  static async getKey(): Promise<CryptoKey | void> {
    if (this.#key) return this.#key;

    const db = await this.#getDb();
    if (!db) return;

    const transaction = db.transaction([this.#storeName], 'readonly', {
      durability: 'strict',
    });

    const store = transaction.objectStore(this.#storeName);
    const request = store.get(this.#storeName);

    return promisifyRequest<CryptoKey>(request);
  }
}

function promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((res, rej) => {
    request.onsuccess = () => {
      res(request.result);
    };

    request.onerror = () => {
      console.error(request.error);

      rej(request.error);
    };

    setTimeout(() => {
      rej(new Error('Request timed out'));
    }, 10000);
  });
}
