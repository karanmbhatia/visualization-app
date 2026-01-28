<script>
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import ThrelteCanvas from '$lib/components/ThrelteCanvas.svelte';
  import Method2Scene from '$lib/components/Method2Scene.svelte';

  let wasmModule = null;
  let grid = null;
  let wasmLoaded = false;
  let wasmStatus = 'Initializing...';
  let loading = true;
  let isPanelOpen = true;
  let message = '';
  let isError = false;

  // Grid controls
  let showEdges = true;
  let regenerateTrigger = 0;
  let cellCount = 0;
  let gridSize = { nx: 50, ny: 30, nz: 10 };

  // Camera reference for reset
  let cameraRef = null;

  onMount(() => {
    if (browser) {
      loadWasmModule();
    }
  });

  async function loadWasmModule() {
    loading = true;
    wasmStatus = '🔄 Loading WASM module...';

    try {
      console.log('Loading stratigraphic grid WASM module...');
      
      const response = await fetch('/wasm/stratigraphic_grid.js');
      if (!response.ok) {
        throw new Error(`Failed to fetch stratigraphic_grid.js: ${response.statusText}`);
      }
      
      const scriptText = await response.text();
      const globalEval = eval;
      globalEval(scriptText);
      
      if (typeof Module === 'undefined') {
        throw new Error('Module not found in stratigraphic_grid.js');
      }

      console.log('Module function loaded, initializing...');

      const moduleConfig = {
        locateFile: (path) => {
          if (path.endsWith('.wasm')) {
            return '/wasm/stratigraphic_grid.wasm';
          }
          return '/wasm/' + path;
        },
        print: (text) => console.log('[WASM]', text),
        printErr: (text) => console.error('[WASM Error]', text)
      };

      wasmModule = await Module(moduleConfig);
      
      console.log('✅ WASM module loaded');
      console.log('Available exports:', Object.keys(wasmModule).slice(0, 30));
      
      grid = new wasmModule.StratigraphicGrid();
      console.log('✅ StratigraphicGrid object created');
      
      wasmLoaded = true;
      wasmStatus = '✅ Ready';
      
      setTimeout(() => {
        handleRegenerate();
      }, 100);
      
      updateMessage('Stratigraphic grid ready', false);
      
    } catch (error) {
      console.error('❌ WASM Loading Error:', error);
      console.error('Error stack:', error.stack);
      wasmStatus = '✗ Failed to load';
      updateMessage(`Error: ${error.message}`, true);
      wasmLoaded = false;
    } finally {
      loading = false;
    }
  }

  function handleRegenerate() {
    if (!wasmLoaded || !grid) {
      updateMessage('⚠️ WASM not ready yet', true);
      return;
    }
    
    regenerateTrigger++;
    updateMessage('🔨 Generating grid...', false);
    
    setTimeout(() => {
      updateStats();
    }, 500);
  }

  function updateStats() {
    if (wasmLoaded && cellCount > 0) {
      updateMessage(`Grid: ${gridSize.nx}×${gridSize.ny}×${gridSize.nz} | Cells: ${cellCount}`, false);
    }
  }

  function updateMessage(text, error = false) {
    message = text;
    isError = error;
  }

  function handleResetView() {
    cameraRef = { reset: true };
    setTimeout(() => {
      cameraRef = null;
    }, 100);
  }

  function togglePanel() {
    isPanelOpen = !isPanelOpen;
  }
</script>

<svelte:head>
  <title>Method 2: Gravity Column - Stratigraphic Grid</title>
</svelte:head>

<div class="page-container">
  <!-- Floating Controls Panel -->
  <div class="controls-panel" class:collapsed={!isPanelOpen}>
    <button class="toggle-button" on:click={togglePanel}>
      {isPanelOpen ? '◀' : '▶'}
    </button>
    
    {#if isPanelOpen}
      <div class="controls-card">
        <div class="controls-content">
          <h3 class="panel-title">Controls</h3>
          
          <div class="wasm-status" class:loaded={wasmLoaded} class:loading={loading}>
            {wasmStatus}
          </div>

          {#if wasmLoaded}
            <div class="control-item">
              <button 
                on:click={handleRegenerate} 
                class="action-button regenerate"
              >
                🔄 Regenerate Grid
              </button>
            </div>

            <div class="control-item">
              <label class="checkbox-label">
                <input type="checkbox" bind:checked={showEdges} />
                <span>Show Edges</span>
              </label>
            </div>

            <div class="control-item">
              <button on:click={handleResetView} class="action-button">
                🔄 Reset View
              </button>
            </div>
          {/if}

          {#if message}
            <div class:status-text={!isError} class:error-text={isError}>
              {message}
            </div>
          {/if}
        </div>
      </div>
    {/if}
  </div>

  <!-- Info Panel (Bottom Right) 
  <div class="info-panel">
    <div class="info-card">
      <div class="info-content">
        <div><strong>Grid:</strong> {gridSize.nx} × {gridSize.ny} × {gridSize.nz}</div>
        <div><strong>Cells:</strong> {cellCount}</div>
        <div><strong>Layers:</strong> 4 geological layers</div>
        <div class="controls-hint">
          <div>Left click + drag: Rotate</div>
          <div>Scroll: Zoom</div>
          <div>Right click + drag: Pan</div>
        </div>
      </div>
    </div>
  </div>  
  -->
  <div id="colorbar-container"></div>

    <style>
    #colorbar-container {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 1000;
    }
  </style>

  <!-- 3D Visualization -->
  <div class="canvas-container">
    <ThrelteCanvas 
      showGrid={true}
      showAxes={false}
      backgroundColor="#ffffff"
      cameraPosition={{ x: 85, y: 36, z: 85 }}
      resetTrigger={cameraRef}
    >
      {#if wasmModule && grid && wasmLoaded}
        <Method2Scene 
          {wasmModule}
          {grid}
          {showEdges}
          {regenerateTrigger}
          bind:cellCount
          bind:gridSize
        />
      {/if}
    </ThrelteCanvas>
    
    {#if loading}
      <div class="loading-overlay">
        <div class="spinner"></div>
        <p>Loading WASM module...</p>
      </div>
    {/if}
  </div>
</div>

<style>
  .page-container {
    display: flex;
    height: 100vh;
    background: white;
    position: relative;
  }

  .canvas-container {
    flex: 1;
    position: relative;
    overflow: hidden;
  }

  /* Controls Panel */
  .controls-panel {
    position: absolute;
    top: 20px;
    left: 20px;
    z-index: 100;
    transition: transform 0.3s ease;
  }

  .controls-panel.collapsed {
    transform: translateX(-100%);
  }

  .toggle-button {
    position: absolute;
    right: -30px;
    top: 10px;
    width: 30px;
    height: 50px;
    background: linear-gradient(135deg, #667eea, #764ba2);
    border: none;
    border-radius: 0 8px 8px 0;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    color: white;
    box-shadow: 2px 0 8px rgba(0, 0, 0, 0.2);
    transition: all 0.3s ease;
  }

  .toggle-button:hover {
    background: linear-gradient(135deg, #5568d3, #6a3f8f);
  }

  .controls-card {
    background: #2d3748;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .controls-content {
    width: 260px;
    max-height: calc(100vh - 140px);
    overflow-y: auto;
    padding: 16px;
  }

  .panel-title {
    font-size: 1.1rem;
    font-weight: 700;
    color: white;
    margin: 0 0 12px 0;
    padding-bottom: 8px;
    border-bottom: 2px solid rgba(255, 255, 255, 0.2);
  }

  .wasm-status {
    font-size: 0.8rem;
    color: #a0aec0;
    margin-bottom: 12px;
    padding: 8px 10px;
    background: rgba(66, 153, 225, 0.15);
    border-radius: 6px;
    border-left: 3px solid #4299e1;
    font-weight: 500;
    transition: all 0.3s ease;
  }

  .wasm-status.loaded {
    background: rgba(72, 187, 120, 0.15);
    border-left-color: #48bb78;
    color: #68d391;
  }

  .wasm-status.loading {
    background: rgba(237, 137, 54, 0.15);
    border-left-color: #ed8936;
    color: #f6ad55;
  }

  .control-item {
    margin-bottom: 12px;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    cursor: pointer;
    color: white;
    font-size: 0.85rem;
    padding: 0.5rem;
    border-radius: 6px;
    transition: background 0.2s ease;
  }

  .checkbox-label:hover {
    background: rgba(255, 255, 255, 0.05);
  }

  .checkbox-label input[type="checkbox"] {
    width: 18px;
    height: 18px;
    margin-right: 0.75rem;
    cursor: pointer;
    accent-color: #667eea;
  }

  .action-button {
    width: 100%;
    padding: 10px 12px;
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: white;
    border: none;
    border-radius: 6px;
    font-weight: 600;
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.3s ease;
    letter-spacing: 0.5px;
  }

  .action-button.regenerate {
    background: linear-gradient(135deg, #ed8936, #dd6b20);
    text-transform: uppercase;
  }

  .action-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  }

  .action-button.regenerate:hover {
    box-shadow: 0 4px 12px rgba(237, 137, 54, 0.4);
  }

  .status-text,
  .error-text {
    margin-top: 12px;
    padding: 8px 10px;
    border-radius: 6px;
    font-size: 0.7rem;
    line-height: 1.4;
    font-family: 'Courier New', monospace;
  }

  .status-text {
    background: rgba(102, 126, 234, 0.2);
    border-left: 3px solid #667eea;
    color: white;
  }

  .error-text {
    background: rgba(239, 68, 68, 0.2);
    border-left: 3px solid #ef4444;
    color: #fca5a5;
  }

  /* Info Panel (Bottom Right) */
  .info-panel {
    position: absolute;
    bottom: 80px;
    right: 20px;
    z-index: 100;
  }

  .info-card {
    background: rgba(0, 0, 0, 0.8);
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .info-content {
    padding: 14px 16px;
    color: white;
    font-size: 0.85rem;
  }

  .info-content div {
    margin-bottom: 6px;
    line-height: 1.5;
  }

  .info-content div:last-child {
    margin-bottom: 0;
  }

  .info-content strong {
    color: #667eea;
    font-weight: 600;
  }

  .controls-hint {
    margin-top: 12px;
    padding-top: 10px;
    border-top: 1px solid rgba(255, 255, 255, 0.2);
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.7);
  }

  /* Loading Overlay */
  .loading-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0.9);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 50;
  }

  .spinner {
    width: 50px;
    height: 50px;
    border: 4px solid #e5e7eb;
    border-top-color: #667eea;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin-bottom: 1rem;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .loading-overlay p {
    color: #667eea;
    font-weight: 600;
  }

  /* Scrollbar styling */
  .controls-content::-webkit-scrollbar {
    width: 4px;
  }

  .controls-content::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 2px;
  }

  .controls-content::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 2px;
  }

  .controls-content::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.3);
  }

  @media (max-width: 768px) {
    .info-panel {
      bottom: 120px;
    }
  }
</style>