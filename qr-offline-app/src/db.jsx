const DB_NAME = "crate_tracking_db";
const DB_VERSION = 1;
const STORE_NAME = "transactions";

export function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = function (event) {
      const db = event.target.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, {
          keyPath: "id",
        });
      }
    };

    request.onsuccess = function (event) {
      resolve(event.target.result);
    };

    request.onerror = function () {
      reject(request.error);
    };
  });
}

export async function saveTransaction(data) {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    store.add(data);

    tx.oncomplete = function () {
      resolve(true);
    };

    tx.onerror = function () {
      reject(tx.error);
    };
  });
}

export async function getAllTransactions() {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);

    const request = store.getAll();

    request.onsuccess = function () {
      resolve(request.result);
    };

    request.onerror = function () {
      reject(request.error);
    };
  });
}

export async function getPendingTransactions() {
  const all = await getAllTransactions();

  return all.filter((item) => item.sync_status === "PENDING");
}

export async function markAsSynced(id) {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    const getRequest = store.get(id);

    getRequest.onsuccess = function () {
      const data = getRequest.result;

      if (!data) {
        reject("Transaction not found");
        return;
      }

      data.sync_status = "SYNCED";
      data.synced_at = new Date().toISOString();

      store.put(data);
    };

    tx.oncomplete = function () {
      resolve(true);
    };

    tx.onerror = function () {
      reject(tx.error);
    };
  });
}