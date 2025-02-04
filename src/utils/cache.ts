interface CacheEntry<T> {
    data: T;
    timestamp: number;
  }
  
  export class Cache<T> {
    private cache: Map<string, CacheEntry<T>> = new Map();
    private ttl: number;
  
    constructor(ttlSeconds: number = 300) { // 5 minutes default TTL
      this.ttl = ttlSeconds * 1000;
    }
  
    set(key: string, value: T): void {
      this.cache.set(key, {
        data: value,
        timestamp: Date.now()
      });
    }
  
    get(key: string): T | null {
      const entry = this.cache.get(key);
      if (!entry) return null;
  
      const isExpired = Date.now() - entry.timestamp > this.ttl;
      if (isExpired) {
        this.cache.delete(key);
        return null;
      }
  
      return entry.data;
    }
  
    clear(): void {
      this.cache.clear();
    }
  }
  
  