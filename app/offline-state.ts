const DB_NAME = "miguelitos-pos";
const STORE_NAME = "offline-state";
const DB_VERSION = 2;
const SNAPSHOT_KEY = "current";

export type OfflineState = {
  user: {
    user_id: string;
    name: string;
    role: string;
  };
  products: any[];
  settings: any;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains("offline-sales")) {
        db.createObjectStore("offline-sales", { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveOfflineState(data: any) {
  const snapshot: OfflineState = {
    user: {
      user_id: data.user.user_id,
      name: data.user.name,
      role: data.user.role,
    },
    products: data.products,
    settings: data.settings,
  };

  const db = await openDb();

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(snapshot, SNAPSHOT_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  db.close();
}

export async function getOfflineState(): Promise<OfflineState | null> {
  const db = await openDb();

  const snapshot = await new Promise<OfflineState | undefined>(
    (resolve, reject) => {
      const request = db
        .transaction(STORE_NAME)
        .objectStore(STORE_NAME)
        .get(SNAPSHOT_KEY);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    },
  );

  db.close();
  return snapshot || null;
}
export async function clearOfflineState() {
  const db = await openDb();

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(SNAPSHOT_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  db.close();
}