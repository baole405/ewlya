import * as fs from 'fs';
import * as path from 'path';

export interface CommandStatEntry {
  commandName: string;
  count: number;
  lastUsedAt: string;
  lastUsedBy: string;
  users: Record<string, number>;
}

export class CommandTrackerService {
  private static filePath = path.join(process.cwd(), 'scratch', 'command_usage.json');
  private static cache: Record<string, CommandStatEntry> | null = null;

  private static ensureLoaded(): Record<string, CommandStatEntry> {
    if (this.cache !== null) {
      return this.cache;
    }

    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        this.cache = JSON.parse(raw);
      } else {
        this.cache = {};
        this.save();
      }
    } catch (err) {
      console.error('⚠️ Failed to load command_usage.json, initializing empty cache:', err);
      this.cache = {};
    }

    return this.cache;
  }

  private static save(): void {
    if (!this.cache) return;
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.cache, null, 2), 'utf-8');
    } catch (err) {
      console.error('⚠️ Failed to persist command_usage.json:', err);
    }
  }

  static recordUsage(commandName: string, userId: string, username: string): void {
    const data = this.ensureLoaded();

    if (!data[commandName]) {
      data[commandName] = {
        commandName,
        count: 0,
        lastUsedAt: new Date().toISOString(),
        lastUsedBy: username,
        users: {}
      };
    }

    const entry = data[commandName];
    entry.count += 1;
    entry.lastUsedAt = new Date().toISOString();
    entry.lastUsedBy = username;
    entry.users[userId] = (entry.users[userId] || 0) + 1;

    this.save();
  }

  static getStats(): CommandStatEntry[] {
    const data = this.ensureLoaded();
    return Object.values(data).sort((a, b) => b.count - a.count);
  }

  static getTopCommands(limit = 10): CommandStatEntry[] {
    return this.getStats().slice(0, limit);
  }

  static getZeroUsageCommands(registeredCommandNames: string[]): string[] {
    const data = this.ensureLoaded();
    return registeredCommandNames.filter(name => !data[name] || data[name].count === 0);
  }

  static getTotalInvocations(): number {
    const data = this.ensureLoaded();
    return Object.values(data).reduce((acc, curr) => acc + curr.count, 0);
  }
}
