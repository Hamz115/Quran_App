/**
 * Local-first cache for QuranTrack
 *
 * Uses localStorage to cache API responses for instant loading.
 * Implements stale-while-revalidate pattern:
 * - Returns cached data immediately
 * - Fetches fresh data in background
 * - Updates cache for next visit
 */

const CACHE_PREFIX = 'qt:';
const STALE_TIME_MS = 5 * 60 * 1000;  // 5 minutes - trigger background refresh
const MAX_AGE_MS = 60 * 60 * 1000;    // 1 hour - force network fetch

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

/**
 * Get data from cache
 * Returns null if not found or expired beyond max age
 */
export function getFromCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;

    const entry: CacheEntry<T> = JSON.parse(raw);
    const age = Date.now() - entry.timestamp;

    // If beyond max age, treat as not cached
    if (age > MAX_AGE_MS) {
      localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }

    return entry.data;
  } catch {
    return null;
  }
}

/**
 * Check if cached data is stale (needs background refresh)
 */
export function isCacheStale(key: string): boolean {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return true;

    const entry = JSON.parse(raw);
    const age = Date.now() - entry.timestamp;
    return age > STALE_TIME_MS;
  } catch {
    return true;
  }
}

/**
 * Save data to cache
 */
export function saveToCache<T>(key: string, data: T): void {
  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  } catch (err) {
    // localStorage full or disabled - ignore
    console.warn('Cache save failed:', err);
  }
}

/**
 * Remove specific cache entry
 */
export function removeFromCache(key: string): void {
  localStorage.removeItem(CACHE_PREFIX + key);
}

/**
 * Clear all QuranTrack cache entries
 */
export function clearAllCache(): void {
  const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX));
  keys.forEach(k => localStorage.removeItem(k));
  console.log('Cache cleared:', keys.length, 'entries');
}

/**
 * Invalidate cache entries matching a pattern
 * e.g., invalidateCache('classes') removes qt:classes:*
 */
export function invalidateCache(pattern: string): void {
  const fullPattern = CACHE_PREFIX + pattern;
  const keys = Object.keys(localStorage).filter(k => k.startsWith(fullPattern));
  keys.forEach(k => localStorage.removeItem(k));
}

/**
 * Cache-first fetch helper
 * Returns cached data immediately if available, fetches fresh in background
 *
 * @param key Cache key
 * @param fetcher Async function to fetch fresh data
 * @param onUpdate Optional callback when fresh data arrives (for UI update)
 */
export async function cacheFirst<T>(
  key: string,
  fetcher: () => Promise<T>,
  onUpdate?: (data: T) => void
): Promise<T> {
  const cached = getFromCache<T>(key);
  const isStale = isCacheStale(key);

  // If we have cached data
  if (cached !== null) {
    // If stale, fetch fresh in background
    if (isStale) {
      // Don't await - let it run in background
      fetcher()
        .then(fresh => {
          saveToCache(key, fresh);
          if (onUpdate) onUpdate(fresh);
        })
        .catch(err => console.warn('Background refresh failed:', err));
    }
    return cached;
  }

  // No cache - must fetch
  const fresh = await fetcher();
  saveToCache(key, fresh);
  return fresh;
}

/**
 * Network-first fetch helper
 * Tries network first, falls back to cache on failure
 * Use for critical/real-time data
 */
export async function networkFirst<T>(
  key: string,
  fetcher: () => Promise<T>
): Promise<T> {
  try {
    const fresh = await fetcher();
    saveToCache(key, fresh);
    return fresh;
  } catch (err) {
    // Network failed - try cache
    const cached = getFromCache<T>(key);
    if (cached !== null) {
      console.log('Network failed, using cache for', key);
      return cached;
    }
    throw err; // No cache either - propagate error
  }
}
