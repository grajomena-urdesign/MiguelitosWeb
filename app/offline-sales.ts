const DB_NAME = "miguelitos-pos";
const STORE_NAME = "offline-sales";
const DB_VERSION = 1;

export type OfflineSale = {
  id: string;
  userId: string;
  body: any;
  queuedAt: string;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function queueOfflineSale(sale: OfflineSale) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(sale);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function getOfflineSales(userId: string): Promise<OfflineSale[]> {
  const db = await openDb();
  const rows = await new Promise<OfflineSale[]>((resolve, reject) => {
    const request = db.transaction(STORE_NAME).objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return rows
    .filter(row => row.userId === userId)
    .sort((a, b) => a.queuedAt.localeCompare(b.queuedAt));
}

export async function removeOfflineSale(id: string) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
