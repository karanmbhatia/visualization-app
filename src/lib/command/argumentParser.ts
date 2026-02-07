// command/argumentParser.ts

import type { ParsedCommand } from './types';

export class ArgumentParser {
  /**
   * Parse a command string like "functionName(arg1, arg2, ...)"
   */
  static parseCommand(input: string): ParsedCommand | null {
    // Trim whitespace
    input = input.trim();

    // Match function call pattern: functionName(args)
    const functionCallMatch = input.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*\((.*)\)\s*$/);
    
    if (!functionCallMatch) {
      // Check if it's just a function name without parentheses
      const simpleMatch = input.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*$/);
      if (simpleMatch) {
        return {
          functionName: simpleMatch[1],
          args: []
        };
      }
      return null;
    }

    const [, functionName, argsString] = functionCallMatch;

    // Parse arguments
    const args = this.parseArguments(argsString);

    return {
      functionName,
      args
    };
  }

  /**
   * Parse argument string into array of values
   */
  private static parseArguments(argsString: string): any[] {
    if (!argsString.trim()) {
      return [];
    }

    const args: any[] = [];
    let currentArg = '';
    let inString = false;
    let stringChar = '';
    let parenDepth = 0;

    for (let i = 0; i < argsString.length; i++) {
      const char = argsString[i];

      if (inString) {
        currentArg += char;
        if (char === stringChar && argsString[i - 1] !== '\\') {
          inString = false;
        }
      } else {
        if (char === '"' || char === "'") {
          inString = true;
          stringChar = char;
          currentArg += char;
        } else if (char === '(' || char === '[') {
          parenDepth++;
          currentArg += char;
        } else if (char === ')' || char === ']') {
          parenDepth--;
          currentArg += char;
        } else if (char === ',' && parenDepth === 0) {
          // End of argument
          const parsed = this.parseValue(currentArg.trim());
          args.push(parsed);
          currentArg = '';
        } else {
          currentArg += char;
        }
      }
    }

    // Add last argument
    if (currentArg.trim()) {
      const parsed = this.parseValue(currentArg.trim());
      args.push(parsed);
    }

    return args;
  }

  /**
   * Parse a single value (number, boolean, string, etc.)
   */
  private static parseValue(value: string): any {
    // Boolean
    if (value === 'true') return true;
    if (value === 'false') return false;

    // Null/undefined
    if (value === 'null') return null;
    if (value === 'undefined') return undefined;

    // Number
    if (/^-?\d+\.?\d*$/.test(value)) {
      return Number(value);
    }

    // String (remove quotes)
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      return value.slice(1, -1);
    }

    // Array
    if (value.startsWith('[') && value.endsWith(']')) {
      const arrayContent = value.slice(1, -1);
      return this.parseArguments(arrayContent);
    }

    // Default: return as string
    return value;
  }

  /**
   * Validate argument types against function signature
   */
  static validateArguments(
    args: any[],
    expectedParams: Array<{ name: string; type: string; optional?: boolean }>
  ): { valid: boolean; error?: string } {
    // Check argument count
    const requiredParams = expectedParams.filter(p => !p.optional);
    
    if (args.length < requiredParams.length) {
      return {
        valid: false,
        error: `Expected at least ${requiredParams.length} arguments, got ${args.length}`
      };
    }

    if (args.length > expectedParams.length) {
      return {
        valid: false,
        error: `Expected at most ${expectedParams.length} arguments, got ${args.length}`
      };
    }

    // Check argument types
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      const expectedType = expectedParams[i].type;
      const actualType = typeof arg;

      if (expectedType === 'number' && actualType !== 'number') {
        return {
          valid: false,
          error: `Argument ${i + 1} (${expectedParams[i].name}) must be a number, got ${actualType}`
        };
      }

      if (expectedType === 'string' && actualType !== 'string') {
        return {
          valid: false,
          error: `Argument ${i + 1} (${expectedParams[i].name}) must be a string, got ${actualType}`
        };
      }

      if (expectedType === 'boolean' && actualType !== 'boolean') {
        return {
          valid: false,
          error: `Argument ${i + 1} (${expectedParams[i].name}) must be a boolean, got ${actualType}`
        };
      }
    }

    return { valid: true };
  }
}