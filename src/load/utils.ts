import fs from 'fs';

export class TpsRegulator {
  private availableTokens: number;
  private interval: NodeJS.Timeout | null = null;

  constructor(private maxTps: number, private refillInterval: number = 1000) {
    this.availableTokens = maxTps;
  }

  start() {
    this.interval = setInterval(() => {
      this.availableTokens = Math.min(this.availableTokens + this.maxTps, this.maxTps);
    }, this.refillInterval);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  async waitForToken(): Promise<void> {
    while (this.availableTokens <= 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    this.availableTokens--;
  }
}

export class MetricsLogger {
  constructor(private logFile: string) {}

  log(message: string) {
    const timestamp = new Date().toISOString();
    fs.appendFileSync(this.logFile, `${timestamp} - ${message}\n`);
  }
}

export async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}