export class RateLimiter {
  private timestamps: number[] = [];
  private readonly limit: number;
  private readonly interval: number;

  constructor(limit: number = 10, intervalMs: number = 1000) {
      this.limit = limit;
      this.interval = intervalMs;
  }

  public async acquire(): Promise<void> {
      const now = Date.now();
      
      // Nettoyer les anciens timestamps
      this.timestamps = this.timestamps.filter(t => now - t < this.interval);
      
      if (this.timestamps.length >= this.limit) {
          const oldestTimestamp = this.timestamps[0];
          const waitTime = this.interval - (now - oldestTimestamp);
          
          if (waitTime > 0) {
              await new Promise(resolve => setTimeout(resolve, waitTime));
          }
      }
      
      this.timestamps.push(Date.now());
  }

  public getRemainingTokens(): number {
      const now = Date.now();
      this.timestamps = this.timestamps.filter(t => now - t < this.interval);
      return this.limit - this.timestamps.length;
  }

  public async waitForAvailableToken(): Promise<void> {
      while (this.getRemainingTokens() === 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
      }
  }
}