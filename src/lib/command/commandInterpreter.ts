// command/commandInterpreter.ts

import type { CommandResult } from './types';
import { ArgumentParser } from './argumentParser';
import { functionRegistry } from './functionRegistry';

class CommandInterpreter {
  async execute(input: string): Promise<CommandResult> {
    // Parse the command
    const parsed = ArgumentParser.parseCommand(input);
    
    if (!parsed) {
      return {
        success: false,
        output: '',
        error: 'Invalid command syntax. Use: functionName(arg1, arg2, ...)'
      };
    }

    const { functionName, args } = parsed;

    // Check if function exists
    if (!functionRegistry.has(functionName)) {
      return {
        success: false,
        output: '',
        error: `Unknown function: ${functionName}. Type help() for available commands.`
      };
    }

    // Get function signature for validation
    const signature = functionRegistry.getSignature(functionName);
    if (!signature) {
      return {
        success: false,
        output: '',
        error: `Function signature not found for: ${functionName}`
      };
    }

    // Validate arguments
    const validation = ArgumentParser.validateArguments(args, signature.params);
    if (!validation.valid) {
      return {
        success: false,
        output: '',
        error: validation.error || 'Invalid arguments'
      };
    }

    // Get the function
    const fn = functionRegistry.get(functionName);
    if (!fn) {
      return {
        success: false,
        output: '',
        error: `Function not found: ${functionName}`
      };
    }

    // Execute the function
    try {
      const result = await fn(...args);
      return result;
    } catch (error) {
      return {
        success: false,
        output: '',
        error: `Execution error: ${error.message}`
      };
    }
  }

  getAvailableFunctions(): string[] {
    return functionRegistry.getAllSignatures().map(sig => sig.name);
  }

  getFunctionHelp(functionName: string): string | null {
    const signature = functionRegistry.getSignature(functionName);
    if (!signature) {
      return null;
    }

    const params = signature.params
      .map(p => `${p.name}: ${p.type}${p.optional ? ' (optional)' : ''}`)
      .join(', ');

    return `${signature.name}(${params}) - ${signature.description}`;
  }
}

// Singleton instance
export const commandInterpreter = new CommandInterpreter();