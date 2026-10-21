// IndexedDB: the browser's built-in database. It can store binary data (our private key
// as bytes) and survives reloads. Each website gets its own, so other sites can't read it.
//
// Stores:
//   identity  { userId, publicKey, privateKey }      one key pair per account on this device
//   verified  { id: "me:peer", publicKey, verifiedAt } safety numbers I've confirmed
const DB_NAME = 'private-chat';
const DB_VERSION = 1;

let dbPromise = null;

function openDb() {
  dbPromise ||= new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    // Runs the first time (or when DB_VERSION goes up): create the stores.
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('identity')) db.createObjectStore('identity', { keyPath: 'userId' });
      if (!db.objectStoreNames.contains('verified')) db.createObjectStore('verified', { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

// Tiny promise wrapper around one IndexedDB request.
async function run(storeName, mode, makeRequest) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = makeRequest(db.transaction(storeName, mode).objectStore(storeName));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export const getIdentity = (userId) => run('identity', 'readonly', (store) => store.get(userId));

export const saveIdentity = (userId, { publicKey, privateKey }) =>
  run('identity', 'readwrite', (store) => store.put({ userId, publicKey, privateKey }));

export const getVerified = (myId, peerId) => run('verified', 'readonly', (store) => store.get(`${myId}:${peerId}`));

export const setVerified = (myId, peerId, publicKey) =>
  run('verified', 'readwrite', (store) =>
    store.put({ id: `${myId}:${peerId}`, publicKey, verifiedAt: new Date().toISOString() }),
  );

export const clearVerified = (myId, peerId) => run('verified', 'readwrite', (store) => store.delete(`${myId}:${peerId}`));
