/**
 * IndexedDB 存储服务
 * 用于跨 Origin 传递大体积图片 Blob 数据
 * sessionId 有效期 30 分钟，过期自动清理
 */

const DB_NAME = 'BulkPicPorter';
const DB_VERSION = 1;
const STORE_NAME = 'sessions';
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 分钟

export interface SessionData {
  id: string;
  blobs: Blob[];
  createdAt: number;
  filename?: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * 存储图片 Blob，返回 sessionId
 */
export async function saveSession(
  blobs: Blob[]
): Promise<string> {
  const db = await openDB();
  const id = `bp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  const data: SessionData = {
    id,
    blobs,
    createdAt: Date.now(),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.add(data);
    req.onsuccess = () => resolve(id);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

/**
 * 读取 sessionId 对应的图片数据
 */
export async function getSession(id: string): Promise<SessionData | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(id);
    req.onsuccess = () => {
      const data = req.result as SessionData | undefined;
      if (!data) {
        resolve(null);
        return;
      }
      // 检查是否过期
      if (Date.now() - data.createdAt > SESSION_TTL_MS) {
        resolve(null);
        deleteSession(id); // 异步清理
        return;
      }
      resolve(data);
    };
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

/**
 * 删除指定 session
 */
export async function deleteSession(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

/**
 * 清理所有过期 session（在 background.ts 中定期调用）
 */
export async function cleanExpiredSessions(): Promise<void> {
  const db = await openDB();
  const cutoff = Date.now() - SESSION_TTL_MS;

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('createdAt');
    const range = IDBKeyRange.upperBound(cutoff);
    const req = index.openCursor(range);

    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
  });
}
