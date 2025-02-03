export class RateLimiter {
  private requests: number;
  private interval: number;
  private queue: Array<() => void> = [];
  private lastIntervalStart: number = Date.now();
  private requestCount: number = 0;

  constructor(requests: number, interval: number) {
    this.requests = requests;
    this.interval = interval;
  }

  public async acquire(): Promise<void> {
    return new Promise((resolve) => {
      this.queue.push(resolve);
      this.processQueue();
    });
  }

  private processQueue(): void {
    const now = Date.now();
    if (now - this.lastIntervalStart > this.interval) {
      this.lastIntervalStart = now;
      this.requestCount = 0;
    }

    if (this.requestCount < this.requests && this.queue.length > 0) {
      this.requestCount++;
      const resolve = this.queue.shift();
      if (resolve) {
        resolve();
      }
      this.processQueue();
    } else {
      setTimeout(() => this.processQueue(), this.interval - (now - this.lastIntervalStart));
    }
  }
}