<script lang="ts">
  import { onMount } from 'svelte';
  import { commandInterpreter } from '../command/commandInterpreter';
  import { commandHistory } from '../command/commandHistory';
  import type { CommandResult } from '../command/types';

  export let onGridUpdate: (data: any) => void = () => {};
  export let onVisualizationChange: (settings: any) => void = () => {};

  let inputValue = '';
  let outputLines: Array<{ type: 'command' | 'output' | 'error', text: string }> = [];
  let inputElement: HTMLInputElement;
  let outputContainer: HTMLDivElement;
  let isExecuting = false;

  onMount(() => {
    inputElement?.focus();
    addOutputLine('output', 'MRST Grid Visualization - Command Window');
    addOutputLine('output', 'Type "help" for available commands');
    addOutputLine('output', '');
  });

  function addOutputLine(type: 'command' | 'output' | 'error', text: string) {
    outputLines = [...outputLines, { type, text }];
    setTimeout(() => {
      if (outputContainer) {
        outputContainer.scrollTop = outputContainer.scrollHeight;
      }
    }, 0);
  }

  async function executeCommand() {
    const command = inputValue.trim();
    if (!command) return;

    // Add command to output
    addOutputLine('command', `>> ${command}`);
    
    // Add to history
    commandHistory.add(command);
    
    // Clear input
    inputValue = '';
    isExecuting = true;

    try {
      // Execute command
      const result: CommandResult = await commandInterpreter.execute(command);

      if (result.success) {
        // Add output
        if (result.output) {
          addOutputLine('output', result.output);
        }

        // Handle grid updates
        if (result.data?.grid) {
          onGridUpdate(result.data.grid);
        }

        // Handle visualization changes
        if (result.data?.visualization) {
          onVisualizationChange(result.data.visualization);
        }
      } else {
        // Add error
        addOutputLine('error', `Error: ${result.error}`);
      }
    } catch (error) {
      addOutputLine('error', `Unexpected error: ${error.message}`);
    } finally {
      isExecuting = false;
      addOutputLine('output', '');
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      executeCommand();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevCommand = commandHistory.navigateUp();
      if (prevCommand !== null) {
        inputValue = prevCommand;
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextCommand = commandHistory.navigateDown();
      if (nextCommand !== null) {
        inputValue = nextCommand;
      }
    }
  }

  function clearConsole() {
    outputLines = [];
    addOutputLine('output', 'Console cleared.');
    addOutputLine('output', '');
  }
</script>

<div class="command-window">
  <div class="output-area" bind:this={outputContainer}>
    {#each outputLines as line}
      <div class="output-line {line.type}">
        {line.text}
      </div>
    {/each}
    {#if isExecuting}
      <div class="output-line executing">
        <span class="spinner"></span> Executing...
      </div>
    {/if}
  </div>

  <div class="input-area">
    <span class="prompt">&gt;&gt;</span>
    <input
      type="text"
      bind:this={inputElement}
      bind:value={inputValue}
      on:keydown={handleKeyDown}
      disabled={isExecuting}
      placeholder="Type command here..."
      class="command-input"
    />
  </div>

  <div class="command-buttons">
    <button on:click={executeCommand} disabled={isExecuting || !inputValue.trim()}>
      Execute
    </button>
    <button on:click={clearConsole}>Clear</button>
  </div>
</div>

<style>
  .command-window {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: #1e1e1e;
    color: #d4d4d4;
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
    font-size: 14px;
    border-radius: 8px;
    overflow: hidden;
  }

  .output-area {
    flex: 1;
    overflow-y: auto;
    padding: 12px;
    background: #1e1e1e;
    border-bottom: 1px solid #3c3c3c;
  }

  .output-line {
    margin: 2px 0;
    line-height: 1.5;
    white-space: pre-wrap;
    word-wrap: break-word;
  }

  .output-line.command {
    color: #4ec9b0;
    font-weight: 600;
  }

  .output-line.output {
    color: #d4d4d4;
  }

  .output-line.error {
    color: #f48771;
  }

  .output-line.executing {
    color: #dcdcaa;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .spinner {
    display: inline-block;
    width: 12px;
    height: 12px;
    border: 2px solid #3c3c3c;
    border-top-color: #dcdcaa;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .input-area {
    display: flex;
    align-items: center;
    padding: 8px 12px;
    background: #252526;
    border-bottom: 1px solid #3c3c3c;
  }

  .prompt {
    color: #4ec9b0;
    font-weight: 700;
    margin-right: 8px;
    user-select: none;
  }

  .command-input {
    flex: 1;
    background: transparent;
    border: none;
    color: #d4d4d4;
    font-family: inherit;
    font-size: inherit;
    outline: none;
  }

  .command-input::placeholder {
    color: #6a6a6a;
  }

  .command-input:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .command-buttons {
    display: flex;
    gap: 8px;
    padding: 8px 12px;
    background: #252526;
  }

  .command-buttons button {
    padding: 6px 16px;
    background: #0e639c;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
  }

  .command-buttons button:hover:not(:disabled) {
    background: #1177bb;
  }

  .command-buttons button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Scrollbar styling */
  .output-area::-webkit-scrollbar {
    width: 10px;
  }

  .output-area::-webkit-scrollbar-track {
    background: #1e1e1e;
  }

  .output-area::-webkit-scrollbar-thumb {
    background: #424242;
    border-radius: 5px;
  }

  .output-area::-webkit-scrollbar-thumb:hover {
    background: #4e4e4e;
  }
</style>