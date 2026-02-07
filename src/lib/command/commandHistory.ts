// command/commandHistory.ts

class CommandHistory {
  private commands: string[] = [];
  private currentIndex: number = -1;
  private maxHistory: number = 100;
  private storageKey: string = 'mrst_command_history';

  constructor() {
    this.loadFromStorage();
  }

  add(command: string): void {
    // Don't add empty commands or duplicates of the last command
    if (!command.trim() || command === this.commands[this.commands.length - 1]) {
      return;
    }

    this.commands.push(command);
    
    // Limit history size
    if (this.commands.length > this.maxHistory) {
      this.commands.shift();
    }
    
    // Reset index to end
    this.currentIndex = this.commands.length;
    
    this.saveToStorage();
  }

  navigateUp(): string | null {
    if (this.commands.length === 0) {
      return null;
    }

    if (this.currentIndex > 0) {
      this.currentIndex--;
    } else {
      this.currentIndex = 0;
    }

    return this.commands[this.currentIndex];
  }

  navigateDown(): string | null {
    if (this.commands.length === 0) {
      return null;
    }

    if (this.currentIndex < this.commands.length - 1) {
      this.currentIndex++;
      return this.commands[this.currentIndex];
    } else {
      this.currentIndex = this.commands.length;
      return '';
    }
  }

  getAll(): string[] {
    return [...this.commands];
  }

  clear(): void {
    this.commands = [];
    this.currentIndex = -1;
    this.saveToStorage();
  }

  private saveToStorage(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.storageKey, JSON.stringify(this.commands));
      }
    } catch (error) {
      console.warn('Failed to save command history to localStorage:', error);
    }
  }

  private loadFromStorage(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(this.storageKey);
        if (stored) {
          this.commands = JSON.parse(stored);
          this.currentIndex = this.commands.length;
        }
      }
    } catch (error) {
      console.warn('Failed to load command history from localStorage:', error);
    }
  }
}

// Singleton instance
export const commandHistory = new CommandHistory();