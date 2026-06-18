// Custom Supabase storage adapter using IndexedDB.
//
// localStorage is NOT reliably persistent across iOS WKWebView cold-starts —
// the OS can evict it under memory pressure. Capacitor Preferences (NSUserDefaults)
// was the previous solution but it depends on the Capacitor bridge being ready
// at module-load time, which is a race condition we can't win reliably.
//
// IndexedDB IS persistent across cold-starts in iOS WKWebView (iOS 16+) and
// requires no native plugin. It's async, which matches Supabase's storage interface.

export const AUTH_KEY_PREFIXES = ['sb-', 'supabase.', 'supabase-']

export interface SupabaseAuthStorage {
  getItem(key: string): Promise<string | null>
  setItem(key: string, value: string): Promise<void>
  removeItem(key: string): Promise<void>
}

const IDB_DB_NAME = 'fp_auth'
const IDB_STORE = 'kv'

class IndexedDBStorage implements SupabaseAuthStorage {
  private dbPromise: Promise<IDBDatabase> | null = null

  private openDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise
    this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(IDB_DB_NAME, 1)
      req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE)
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => {
        this.dbPromise = null // allow retry
        reject(req.error)
      }
    })
    return this.dbPromise
  }

  async getItem(key: string): Promise<string | null> {
    try {
      const db = await this.openDB()
      return await new Promise<string | null>((resolve, reject) => {
        const req = db.transaction(IDB_STORE, 'readonly').objectStore(IDB_STORE).get(key)
        req.onsuccess = () => resolve(req.result ?? null)
        req.onerror = () => reject(req.error)
      })
    } catch {
      try { return localStorage.getItem(key) } catch { return null }
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      const db = await this.openDB()
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, 'readwrite')
        tx.objectStore(IDB_STORE).put(value, key)
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      })
    } catch {
      try { localStorage.setItem(key, value) } catch {}
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      const db = await this.openDB()
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, 'readwrite')
        tx.objectStore(IDB_STORE).delete(key)
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      })
    } catch {
      try { localStorage.removeItem(key) } catch {}
    }
  }

  // Wipes all entries — called by resetClient on sign-out
  clearAll(): void {
    this.dbPromise = null
    try { indexedDB.deleteDatabase(IDB_DB_NAME) } catch {}
  }
}

// Only instantiate client-side. IndexedDB doesn't exist in Node (SSR).
const idbStorage = typeof window !== 'undefined' && typeof indexedDB !== 'undefined'
  ? new IndexedDBStorage()
  : null

export const supabaseAuthStorage: SupabaseAuthStorage | undefined = idbStorage ?? undefined

export function clearAuthStorage(): void {
  idbStorage?.clearAll()
}
