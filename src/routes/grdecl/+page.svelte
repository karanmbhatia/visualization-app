<script lang="ts">
  import { onMount } from 'svelte';
  import ThrelteCanvas from '$lib/components/ThrelteCanvas.svelte';
  import GrdeclScene from '$lib/components/GrdeclScene.svelte';
  import { parseGrdecl, type GrdeclData } from '$lib/utils/grdeclParser';

  let grdeclData: GrdeclData | null = null;
  let fileContent: string = '';
  let colormap = 'jet';
  let showEdges = true;
  let loading = false;
  let statsText = 'Loading GRDECL data...';
  let isControlPanelOpen = true;
  let isFileViewerOpen = false;

  // Physical size controls (0.1 to 10.0 range)
  let widthScale = 1.0;    // X-axis: Width of each grid cell
  let depthScale = 1.0;    // Y-axis: Breadth of each grid cell
  let heightScale = 1.0;   // Z-axis: Height/thickness of each layer

  // Camera reference for reset
  let cameraRef: any = null;

  // Path to GRDECL file in static folder
  const GRDECL_FILE_PATH = '/data/output_reservoir.grdecl';

  // Auto-load GRDECL data on mount
  onMount(() => {
    loadGrdeclData();
  });

  async function loadGrdeclData() {
    loading = true;
    statsText = 'Loading GRDECL file...';

    try {
      const response = await fetch(GRDECL_FILE_PATH);
      
      if (!response.ok) {
        throw new Error(`Failed to load file: ${response.statusText}`);
      }

      const fileText = await response.text();
      fileContent = fileText; // Store for file viewer
      
      statsText = 'Parsing GRDECL format...';
      grdeclData = parseGrdecl(fileText);
      
      const { nx, ny, nz } = grdeclData.specgrid;
      const activeCells = grdeclData.cells.num;
      const totalCells = nx * ny * nz;
      
      statsText = `Grid: ${nx}×${ny}×${nz} | Active cells: ${activeCells}/${totalCells}`;
      console.log('✅ GRDECL data loaded and parsed successfully');
      console.log(`   Grid dimensions: ${nx} × ${ny} × ${nz}`);
      console.log(`   Active cells: ${activeCells}`);
      console.log(`   Pillars: ${grdeclData.coord.length}`);
    } catch (error) {
      console.error('Error loading GRDECL:', error);
      statsText = `Error: ${error.message}`;
    } finally {
      loading = false;
    }
  }

  function handleColormapChange(e: Event) {
    const select = e.target as HTMLSelectElement;
    colormap = select.value;
  }

  function handleResetView() {
    cameraRef = { reset: true };
    setTimeout(() => {
      cameraRef = null;
    }, 100);
  }

  function toggleControlPanel() {
    isControlPanelOpen = !isControlPanelOpen;
  }

  function toggleFileViewer() {
    isFileViewerOpen = !isFileViewerOpen;
  }

  // Reset cell sizes to default (1.0)
  function resetCellSizes() {
    widthScale = 1.0;
    depthScale = 1.0;
    heightScale = 1.0;
  }

  // Validate and constrain input values
  function validateScale(value: number): number {
    const num = parseFloat(value.toString());
    if (isNaN(num)) return 1.0;
    return Math.max(0.1, Math.min(10.0, num));
  }

  // Handle input changes with validation
  function handleWidthInput(e: Event) {
    const target = e.target as HTMLInputElement;
    widthScale = validateScale(parseFloat(target.value));
  }

  function handleDepthInput(e: Event) {
    const target = e.target as HTMLInputElement;
    depthScale = validateScale(parseFloat(target.value));
  }

  function handleHeightInput(e: Event) {
    const target = e.target as HTMLInputElement;
    heightScale = validateScale(parseFloat(target.value));
  }
</script>

<svelte:head>
  <title>GRDECL Grid Visualization</title>
</svelte:head>

<div class="page-container">
  <!-- Left Controls Panel -->
  <div class="controls-panel left-panel" class:collapsed={!isControlPanelOpen}>
    <button class="toggle-button left-toggle" on:click={toggleControlPanel}>
      {isControlPanelOpen ? '◀' : '▶'}
    </button>
    
    {#if isControlPanelOpen}
      <div class="controls-card">
        <div class="controls-content">
          <h3 class="panel-title">GRDECL Controls</h3>
          
          <!-- Physical Size Controls Section -->
          <div class="section-header">
            <h4 class="section-title">📏 Physical Size (m)</h4>
          </div>

          <!-- Width (X) Control -->
          <div class="control-item">
            <div class="label-row">
              <label for="widthScale">Width (X)</label>
              <input 
                type="number" 
                class="number-input"
                min="0.1"
                max="10.0"
                step="0.1"
                value={widthScale.toFixed(1)}
                on:input={handleWidthInput}
              />
            </div>
            <input 
              type="range" 
              id="widthScale"
              min="0.1" 
              max="10.0" 
              step="0.1" 
              bind:value={widthScale}
              class="slider"
            />
          </div>

          <!-- Breadth (Z) Control -->
          <div class="control-item">
            <div class="label-row">
              <label for="depthScale">Breadth (Z)</label>
              <input 
                type="number" 
                class="number-input"
                min="0.1"
                max="10.0"
                step="0.1"
                value={depthScale.toFixed(1)}
                on:input={handleDepthInput}
              />
            </div>
            <input 
              type="range" 
              id="depthScale"
              min="0.1" 
              max="10.0" 
              step="0.1" 
              bind:value={depthScale}
              class="slider"
            />
          </div>

          <!-- Height (Y) Control -->
          <div class="control-item">
            <div class="label-row">
              <label for="heightScale">Height/Depth (Y)</label>
              <input 
                type="number" 
                class="number-input"
                min="0.1"
                max="10.0"
                step="0.1"
                value={heightScale.toFixed(1)}
                on:input={handleHeightInput}
              />
            </div>
            <input 
              type="range" 
              id="heightScale"
              min="0.1" 
              max="10.0" 
              step="0.1" 
              bind:value={heightScale}
              class="slider"
            />
          </div>

          <!-- Reset Cell Sizes Button -->
          <div class="control-item">
            <button on:click={resetCellSizes} class="reset-button">
              Reset Cell Sizes
            </button>
          </div>

          <!-- Visualization Controls Section -->
          <div class="section-divider"></div>

          <div class="control-item">
            <label for="colormap">Colormap</label>
            <select id="colormap" bind:value={colormap} on:change={handleColormapChange}>
              <option value="jet">Jet</option>
              <option value="viridis">Viridis</option>
              <option value="plasma">Plasma</option>
              <option value="cool">Cool</option>
            </select>
          </div>

          <div class="control-item">
            <label class="checkbox-label">
              <input type="checkbox" bind:checked={showEdges} />
              <span>Show Edges</span>
            </label>
          </div>

          <div class="control-item">
            <button on:click={handleResetView} class="action-button">
              Reset View
            </button>
          </div>

          <div class="stats-display">
            <p>{statsText}</p>
          </div>
        </div>
      </div>
    {/if}
  </div>

  <!-- Right File Viewer Panel -->
  <div class="file-viewer-panel right-panel" class:collapsed={!isFileViewerOpen}>
    <button class="toggle-button right-toggle" on:click={toggleFileViewer}>
      {isFileViewerOpen ? '▶' : '◀'}
    </button>
    
    {#if isFileViewerOpen}
      <div class="file-viewer-card">
        <div class="file-viewer-header">
          <h3 class="panel-title">📄 GRDECL File Content</h3>
          <span class="file-path">{GRDECL_FILE_PATH}</span>
        </div>
        <div class="file-viewer-content">
          <pre><code>{fileContent || 'No file loaded'}</code></pre>
        </div>
      </div>
    {/if}
  </div>

  <!-- 3D Visualization -->
  <div class="canvas-container">
    <ThrelteCanvas showGrid={true} cameraPosition={{ x: 30, y: 30, z: 30 }} resetTrigger={cameraRef}>
      {#if grdeclData}
        <GrdeclScene 
          {grdeclData} 
          {colormap} 
          {showEdges}
          {widthScale}
          {depthScale}
          {heightScale}
        />
      {/if}
    </ThrelteCanvas>
    
    {#if loading}
      <div class="loading-overlay">
        <div class="spinner"></div>
        <p>Loading GRDECL visualization...</p>
      </div>
    {/if}
  </div>
</div>

<style>
  .page-container {
    display: flex;
    height: 100%;
    background: white;
    position: relative;
  }

  /* Base Panel Styles */
  .controls-panel,
  .file-viewer-panel {
    position: absolute;
    top: 20px;
    z-index: 100;
    transition: transform 0.3s ease;
  }

  /* Left Panel */
  .left-panel {
    left: 20px;
  }

  .left-panel.collapsed {
    transform: translateX(-100%);
  }

  /* Right Panel */
  .right-panel {
    right: 20px;
  }

  .right-panel.collapsed {
    transform: translateX(100%);
  }

  /* Toggle Buttons */
  .toggle-button {
    position: absolute;
    top: 10px;
    width: 30px;
    height: 50px;
    background: linear-gradient(135deg, #667eea, #764ba2);
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    color: white;
    box-shadow: 2px 0 8px rgba(0, 0, 0, 0.2);
    transition: all 0.3s ease;
    z-index: 101;
  }

  .left-toggle {
    right: -30px;
    border-radius: 0 8px 8px 0;
  }

  .right-toggle {
    left: -30px;
    border-radius: 8px 0 0 8px;
  }

  .toggle-button:hover {
    background: linear-gradient(135deg, #5568d3, #6a3f8f);
  }

  /* Controls Card */
  .controls-card {
    background: #2d3748;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .controls-content {
    width: 300px;
    max-height: calc(100vh - 140px);
    overflow-y: auto;
    padding: 20px;
  }

  /* File Viewer Card */
  .file-viewer-card {
    background: #2d3748;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    flex-direction: column;
    width: 400px;
    max-height: calc(100vh - 140px);
  }

  .file-viewer-header {
    padding: 20px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .file-path {
    display: block;
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.5);
    margin-top: 0.5rem;
    font-family: monospace;
  }

  .file-viewer-content {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    background: #1a202c;
    border-radius: 0 0 12px 12px;
  }

  .file-viewer-content pre {
    margin: 0;
    font-family: 'Courier New', monospace;
    font-size: 0.75rem;
    line-height: 1.5;
    color: #a0aec0;
  }

  .file-viewer-content code {
    display: block;
    white-space: pre;
  }

  /* Scrollbar Styling */
  .controls-content::-webkit-scrollbar,
  .file-viewer-content::-webkit-scrollbar {
    width: 8px;
  }

  .controls-content::-webkit-scrollbar-track,
  .file-viewer-content::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 4px;
  }

  .controls-content::-webkit-scrollbar-thumb,
  .file-viewer-content::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 4px;
  }

  .controls-content::-webkit-scrollbar-thumb:hover,
  .file-viewer-content::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.3);
  }

  .panel-title {
    font-size: 1.25rem;
    font-weight: 700;
    color: white;
    margin: 0 0 1.25rem 0;
    padding-bottom: 0.75rem;
    border-bottom: 2px solid rgba(255, 255, 255, 0.2);
  }

  .file-viewer-header .panel-title {
    margin-bottom: 0;
    padding-bottom: 0;
    border-bottom: none;
  }

  .section-header {
    margin-bottom: 1rem;
  }

  .section-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.7);
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .section-divider {
    margin: 1.5rem 0;
    height: 1px;
    background: rgba(255, 255, 255, 0.1);
  }

  .control-item {
    margin-bottom: 1.25rem;
  }

  .label-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .control-item label {
    font-size: 0.875rem;
    color: white;
    font-weight: 500;
  }

  /* Number Input Field */
  .number-input {
    width: 60px;
    padding: 0.375rem 0.5rem;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 4px;
    color: #48bb78;
    font-weight: 700;
    font-size: 0.875rem;
    text-align: center;
    transition: all 0.2s ease;
  }

  .number-input:focus {
    outline: none;
    background: rgba(255, 255, 255, 0.15);
    border-color: #48bb78;
    box-shadow: 0 0 0 2px rgba(72, 187, 120, 0.2);
  }

  .number-input:hover {
    background: rgba(255, 255, 255, 0.12);
    border-color: rgba(255, 255, 255, 0.4);
  }

  /* Slider Styles */
  .slider {
    width: 100%;
    height: 6px;
    border-radius: 5px;
    background: rgba(255, 255, 255, 0.1);
    outline: none;
    -webkit-appearance: none;
    appearance: none;
  }

  .slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: linear-gradient(135deg, #48bb78, #38a169);
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(72, 187, 120, 0.4);
    transition: all 0.2s ease;
  }

  .slider::-webkit-slider-thumb:hover {
    transform: scale(1.2);
    box-shadow: 0 4px 12px rgba(72, 187, 120, 0.6);
  }

  .slider::-moz-range-thumb {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: linear-gradient(135deg, #48bb78, #38a169);
    cursor: pointer;
    border: none;
    box-shadow: 0 2px 8px rgba(72, 187, 120, 0.4);
    transition: all 0.2s ease;
  }

  .slider::-moz-range-thumb:hover {
    transform: scale(1.2);
    box-shadow: 0 4px 12px rgba(72, 187, 120, 0.6);
  }

  /* Reset Button */
  .reset-button {
    width: 100%;
    padding: 0.75rem 1.25rem;
    background: linear-gradient(135deg, #f093fb, #f5576c);
    color: white;
    border: none;
    border-radius: 6px;
    font-weight: 600;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.3s ease;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .reset-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(240, 147, 251, 0.4);
  }

  select {
    width: 100%;
    padding: 0.625rem;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 6px;
    color: white;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  select:hover {
    background: rgba(255, 255, 255, 0.15);
    border-color: rgba(255, 255, 255, 0.3);
  }

  select option {
    background: #2d3748;
    color: white;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    cursor: pointer;
    color: white;
    font-size: 0.875rem;
  }

  .checkbox-label input[type="checkbox"] {
    width: 18px;
    height: 18px;
    margin-right: 0.5rem;
    cursor: pointer;
    accent-color: #667eea;
  }

  .action-button {
    width: 100%;
    padding: 0.75rem 1.25rem;
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: white;
    border: none;
    border-radius: 6px;
    font-weight: 600;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.3s ease;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .action-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  }

  .stats-display {
    margin-top: 1rem;
    padding: 0.875rem;
    background: rgba(102, 126, 234, 0.2);
    border-radius: 6px;
    border-left: 3px solid #667eea;
  }

  .stats-display p {
    color: white;
    font-size: 0.75rem;
    margin: 0;
    line-height: 1.5;
  }

  .canvas-container {
    flex: 1;
    position: relative;
    overflow: hidden;
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

  /* Mobile Responsive Styles */
  @media (max-width: 768px) {
    .controls-panel,
    .file-viewer-panel {
      top: 10px;
    }

    .left-panel {
      left: 10px;
    }

    .right-panel {
      right: 10px;
    }

    .controls-card,
    .file-viewer-card {
      width: calc(100vw - 80px);
      max-width: 300px;
    }

    .controls-content {
      width: 100%;
      max-height: calc(100vh - 120px);
      padding: 15px;
    }

    .file-viewer-card {
      max-width: 320px;
      max-height: calc(100vh - 120px);
    }

    .file-viewer-header {
      padding: 15px;
    }

    .file-viewer-content {
      padding: 15px;
    }

    .panel-title {
      font-size: 1rem;
    }

    .section-title {
      font-size: 0.8rem;
    }

    .control-item label,
    .checkbox-label {
      font-size: 0.8rem;
    }

    .number-input {
      width: 55px;
      font-size: 0.8rem;
    }

    .file-viewer-content pre {
      font-size: 0.7rem;
    }
  }

  @media (max-width: 480px) {
    .controls-card,
    .file-viewer-card {
      max-width: 260px;
    }

    .toggle-button {
      width: 25px;
      height: 40px;
      font-size: 14px;
    }

    .left-toggle {
      right: -25px;
    }

    .right-toggle {
      left: -25px;
    }

    .controls-content {
      padding: 12px;
    }

    .file-viewer-header,
    .file-viewer-content {
      padding: 12px;
    }

    .panel-title {
      font-size: 0.95rem;
    }

    .file-path {
      font-size: 0.65rem;
    }

    .control-item {
      margin-bottom: 1rem;
    }
  }
</style>