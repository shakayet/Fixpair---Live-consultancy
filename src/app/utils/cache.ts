import NodeCache from 'node-cache';
import { logger } from '../../shared/logger';

/**
 * Reusable In-Memory Cache Utility
 */
class CacheService {
  private cache: NodeCache;
  private hits: number = 0;
  private misses: number = 0;

  constructor(ttlSeconds: number = 600) {
    this.cache = new NodeCache({
      stdTTL: ttlSeconds,
      checkperiod: ttlSeconds * 0.2,
      useClones: false,
    });
  }

  /**
   * Get data from cache
   */
  get<T>(key: string): T | undefined {
    const start = Date.now();
    const value = this.cache.get<T>(key);

    if (value) {
      this.hits++;
      logger.info(`[CACHE] HIT: ${key} (${Date.now() - start}ms)`);
    } else {
      this.misses++;
      logger.info(`[CACHE] MISS: ${key}`);
    }

    return value;
  }

  /**
   * Get cache stats
   */
  getStats() {
    const total = this.hits + this.misses;
    const ratio = total === 0 ? 0 : (this.hits / total) * 100;
    return {
      hits: this.hits,
      misses: this.misses,
      hitRatio: `${ratio.toFixed(2)}%`,
      keys: this.cache.keys().length,
    };
  }

  /**
   * Set data in cache
   */
  set<T>(key: string, value: T, ttl?: number): boolean {
    return this.cache.set(key, value, ttl || 600);
  }

  /**
   * Delete key from cache
   */
  del(key: string | string[]): number {
    return this.cache.del(key);
  }

  /**
   * Clear cache by prefix
   */
  clearByPrefix(prefix: string): void {
    const keys = this.cache.keys();
    const keysToDelete = keys.filter(key => key.startsWith(prefix));
    if (keysToDelete.length > 0) {
      this.cache.del(keysToDelete);
      logger.info(
        `[CACHE] Invalidated ${keysToDelete.length} keys with prefix: ${prefix}`,
      );
    }
  }

  /**
   * Flush all cache
   */
  flush(): void {
    this.cache.flushAll();
    logger.info('[CACHE] Flushed all keys');
  }
}

// Export a singleton instance
export const cacheHelper = new CacheService();
