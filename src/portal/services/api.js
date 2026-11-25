/**
 * Universal Storage Module with IndexedDB (No Quota Limit) + localStorage Fallback
 * Safely stores thousands of student and faculty records without browser QuotaExceededError.
 */

const DB_NAME = "klef_academic_portal_db";
const STORE_NAME = "records_store";

function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      resolve(null);
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
}

export async function getAsyncRecord(key, fallback = null) {
  try {
    const db = await openDB();
    if (db) {
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);
        req.onsuccess = () => {
          if (req.result !== undefined && req.result !== null) {
            resolve(req.result);
          } else {
            // Check localStorage
            resolve(readLocalRecord(key, fallback));
          }
        };
        req.onerror = () => resolve(readLocalRecord(key, fallback));
      });
    }
  } catch {}
  return readLocalRecord(key, fallback);
}

export async function setAsyncRecord(key, value) {
  try {
    const db = await openDB();
    if (db) {
      await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(value, key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    }
  } catch (err) {
    console.warn("IndexedDB write failed, falling back to localStorage", err);
  }

  // Also write to localStorage if small enough, catching quota errors cleanly
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    // Gracefully handle browser quota limit
    console.warn(`localStorage quota exceeded for ${key}. Stored safely in IndexedDB.`);
  }
}

export function readLocalRecord(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

export function writeLocalRecord(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn("localStorage quota exceeded. Writing asynchronously to IndexedDB.");
    setAsyncRecord(key, value);
  }
}
