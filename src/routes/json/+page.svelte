<script>
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import ThrelteCanvas from '$lib/components/ThrelteCanvas.svelte';
  import Method1Scene from '$lib/components/Method1Scene.svelte';

  let wasmModule = null;
  let delaunay = null;
  let wasmLoaded = false;
  let wasmStatus = 'Initializing...';
  let loading = true;
  let isPanelOpen = true;
  let message = '';
  let isError = false;

  // Tessellation controls
  let viewMode = 'both'; // 'solid', 'wireframe', or 'both'
  let regenerateTrigger = 0;
  let vertexCount = 0;
  let tetrahedraCount = 0;

  // Camera reference for reset
  let cameraRef = null;

  // Computed values for scene
  $: showSolid = viewMode === 'solid' || viewMode === 'both';
  $: showWireframe = viewMode === 'wireframe' || viewMode === 'both';

  onMount(() => {
    if (browser) {
      // Auto-load WASM on mount
      loadWasmModule();
    }
  });

  async function loadWasmModule() {
    loading = true;
    wasmStatus = '🔄 Loading WASM module...';

    try {
      console.log('Loading WASM module...');
      
      // Fetch and execute the delaunay_tessellation.js script
      const response = await fetch('/wasm/delaunay_tessellation.js');
      if (!response.ok) {
        throw new Error(`Failed to fetch delaunay_tessellation.js: ${response.statusText}`);
      }
      
      const scriptText = await response.text();
      
      // Execute the script to get Module function in global scope
      const globalEval = eval;
      globalEval(scriptText);
      
      // Check if Module is available (NOT createModule)
      if (typeof Module === 'undefined') {
        throw new Error('Module not found in delaunay_tessellation.js');
      }

      console.log('Module function loaded, initializing...');

      // Configure module to load WASM
      const moduleConfig = {
        locateFile: (path) => {
          if (path.endsWith('.wasm')) {
            return '/wasm/delaunay_tessellation.wasm';
          }
          return '/wasm/' + path;
        },
        print: (text) => console.log('[WASM]', text),
        printErr: (text) => console.error('[WASM Error]', text)
      };

      // Instantiate the module (Module is a function that returns a promise)
      wasmModule = await Module(moduleConfig);
      
      console.log('✅ WASM module loaded');
      console.log('Available exports:', Object.keys(wasmModule).slice(0, 30));
      
      // Create DelaunayTessellation object
      delaunay = new wasmModule.DelaunayTessellation();
      console.log('✅ DelaunayTessellation object created');
      
      wasmLoaded = true;
      wasmStatus = '✅ Ready';
      
      // Auto-generate first tessellation
      setTimeout(() => {
        handleRegenerate();
      }, 100);
      
      updateMessage('Tessellation ready', false);
      
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
    if (!wasmLoaded || !delaunay) {
      updateMessage('⚠️ WASM not ready yet', true);
      return;
    }
    
    regenerateTrigger++;
    updateMessage('🔨 Generating...', false);
    
    setTimeout(() => {
      updateStats();
    }, 500);
  }

  function updateStats() {
    if (wasmLoaded && vertexCount > 0) {
      updateMessage(`Vertices: ${vertexCount} | Tetrahedra: ${tetrahedraCount}`, false);
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

  function setViewMode(mode) {
    viewMode = mode;
  }
</script>

<svelte:head>
  <title>Method 1: MRST Grid - Delaunay Tessellation</title>
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
              <label class="control-label">Display Mode</label>
              <div class="toggle-group">
                <button 
                  class="toggle-option" 
                  class:active={viewMode === 'wireframe'}
                  on:click={() => setViewMode('wireframe')}
                >
                  Wireframe
                </button>
                <button 
                  class="toggle-option" 
                  class:active={viewMode === 'both'}
                  on:click={() => setViewMode('both')}
                >
                  Both
                </button>
                <button 
                  class="toggle-option" 
                  class:active={viewMode === 'solid'}
                  on:click={() => setViewMode('solid')}
                >
                  Solid
                </button>
              </div>
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

  <!-- 3D Visualization -->
  <div class="canvas-container">
    <ThrelteCanvas 
      showGrid={true}
      cameraPosition={{ x: 30, y: 30, z: 30 }} 
      resetTrigger={cameraRef}
    >
      {#if wasmModule && delaunay && wasmLoaded}
        <Method1Scene 
          {wasmModule}
          {delaunay}
          {showSolid}
          {showWireframe}
          {regenerateTrigger}
          bind:vertexCount
          bind:tetrahedraCount
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

  .control-label {
    display: block;
    font-size: 0.8rem;
    margin-bottom: 6px;
    color: white;
    font-weight: 500;
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

  /* Toggle Group Styles */
  .toggle-group {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 4px;
    background: rgba(0, 0, 0, 0.2);
    padding: 4px;
    border-radius: 6px;
  }

  .toggle-option {
    padding: 8px 6px;
    background: transparent;
    color: rgba(255, 255, 255, 0.6);
    border: none;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }

  .toggle-option:hover {
    background: rgba(255, 255, 255, 0.05);
    color: rgba(255, 255, 255, 0.8);
  }

  .toggle-option.active {
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: white;
    box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
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
</style>