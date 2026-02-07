<script lang="ts">
  import { onMount } from 'svelte';
  import ThrelteCanvas from '$lib/components/ThrelteCanvas.svelte';
  import GrdeclScene from '$lib/components/GrdeclScene.svelte';
  import { parseGrdecl, type GrdeclData } from '$lib/utils/grdeclParser';
  import CommandWindow from '$lib/components/CommandWindow.svelte';

  /* =========================
     PAGE-LEVEL WORKSPACE STATE
     (MATLAB "workspace")
  ========================= */

  let grid: any = null;

  let visualizationSettings = {
    showWireframe: true,
    showSolid: false
  };

  /* =========================
     CALLBACKS FROM COMMAND WINDOW
  ========================= */

  function handleGridUpdate(newGrid: any) {
    console.log('handleGridUpdate called with:', newGrid);
    
    // Handle clear command (null grid)
    if (newGrid === null) {
      grid = null;
      grdeclData = null;
      statsText = 'Workspace cleared. Load data or generate grid to begin.';
      console.log('Workspace cleared');
      return;
    }
    
    grid = newGrid;
    
    // If grid data is provided, update grdeclData to display it
    if (newGrid) {
      // The command window should return data in GRDECL format
      // Update the visualization data
      grdeclData = newGrid;
      
      // Update stats display if grid has metadata
      if (newGrid.metadata?.gridDims) {
        const [nx, ny, nz] = newGrid.metadata.gridDims;
        const totalCells = nx * ny * nz;
        statsText = `Grid: ${nx}×${ny}×${nz} | Total cells: ${totalCells}`;
      } else if (newGrid.specgrid) {
        const { nx, ny, nz } = newGrid.specgrid;
        const activeCells = newGrid.cells?.num || 0;
        const totalCells = nx * ny * nz;
        statsText = `Grid: ${nx}×${ny}×${nz} | Active cells: ${activeCells}/${totalCells}`;
      }
      
      console.log('Grid updated successfully');
    }
  }

  function handleVisualizationChange(settings: any) {
    console.log('handleVisualizationChange called with:', settings);
    
    visualizationSettings = {
      ...visualizationSettings,
      ...settings
    };
    
    // Update existing visualization settings
    if (settings.colormap !== undefined) {
      colormap = settings.colormap;
      console.log('Colormap changed to:', colormap);
    }
    if (settings.showEdges !== undefined) {
      showEdges = settings.showEdges;
      console.log('Show edges changed to:', showEdges);
    }
    if (settings.showWireframe !== undefined) {
      visualizationSettings.showWireframe = settings.showWireframe;
      console.log('Wireframe changed to:', settings.showWireframe);
    }
    
    // FIXED: Handle camera view changes
    if (settings.cameraView !== undefined) {
      console.log('Camera view command received:', settings.cameraView);
      handleCameraViewChange(settings.cameraView);
    }
    
    // Handle camera reset
    if (settings.resetCamera) {
      console.log('Camera reset command received');
      handleResetView();
    }
  }

  function handleCameraViewChange(view: string) {
    console.log('Setting camera view to:', view);
    
    // Define camera positions for different views
    const viewPositions = {
      top: { x: 0, y: 50, z: 0.001 },      // Looking down from above
      side: { x: 50, y: 0, z: 0.001 },     // Looking from the side (X-axis)
      front: { x: 0.001, y: 0.001, z: 50 }, // Looking from the front (Z-axis)
      default: { x: 30, y: 30, z: 30 }     // Default diagonal view
    };
    
    const position = viewPositions[view] || viewPositions.default;
    
    // Trigger camera position change
    cameraRef = { 
      reset: true, 
      position: position 
    };
    
    console.log('Camera position set to:', position);
    
    // Clear the trigger after a short delay
    setTimeout(() => {
      cameraRef = null;
    }, 100);
  }

  let grdeclData: GrdeclData | null = null;
  let fileContent: string = '';
  let colormap = 'jet';
  let showEdges = true;
  let loading = false;
  let statsText = 'Loading GRDECL data...';
  let isControlPanelOpen = true;
  let isFileViewerOpen = false;
  let isCommandWindowOpen = true; // New state for command window

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

  function toggleCommandWindow() {
    isCommandWindowOpen = !isCommandWindowOpen;
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
  <!-- Left Controls Panel - COMPACT -->
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
            <h4 class="section-title">📏 Size (m)</h4>
          </div>

          <!-- Width (X) Control - COMPACT -->
          <div class="control-item">
            <div class="label-row">
              <label for="widthScale">Width</label>
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

          <!-- Breadth (Z) Control - COMPACT -->
          <div class="control-item">
            <div class="label-row">
              <label for="depthScale">Breadth</label>
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

          <!-- Height (Y) Control - COMPACT -->
          <div class="control-item">
            <div class="label-row">
              <label for="heightScale">Height</label>
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

          <!-- Compact Button Row -->
          <div class="button-row">
            <button on:click={resetCellSizes} class="compact-button">
              Reset
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

          <div class="button-row">
            <button on:click={handleResetView} class="compact-button">
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

  <!-- Right File Viewer Panel - COMPACT -->
  <div class="file-viewer-panel right-panel" class:collapsed={!isFileViewerOpen}>
    <button class="toggle-button right-toggle" on:click={toggleFileViewer}>
      {isFileViewerOpen ? '▶' : '◀'}
    </button>
    
    {#if isFileViewerOpen}
      <div class="file-viewer-card">
        <div class="file-viewer-header">
          <h3 class="panel-title">File</h3>
          <p class="file-path">{GRDECL_FILE_PATH}</p>
        </div>
        <div class="file-viewer-content">
          <pre>{fileContent || 'No file loaded...'}</pre>
        </div>
      </div>
    {/if}
  </div>

  <!-- Bottom Right Command Window - COMPACT -->
  <div class="command-panel" class:collapsed={!isCommandWindowOpen}>
    <!-- Compact toggle button -->
    <button class="toggle-button command-toggle" on:click={toggleCommandWindow}>
      {isCommandWindowOpen ? '▼' : '▲'}
    </button>
    
    {#if isCommandWindowOpen}
      <div class="command-card">
        <CommandWindow 
          onGridUpdate={handleGridUpdate}
          onVisualizationChange={handleVisualizationChange}
        />
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
        <p>Loading visualization...</p>
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

  /* Panels Base Styles */
  .controls-panel,
  .file-viewer-panel {
    position: absolute;
    top: 20px;
    z-index: 100;
    transition: transform 0.3s ease;
  }

  .left-panel {
    left: 20px;
  }

  .right-panel {
    right: 20px;
  }

  .controls-panel.collapsed {
    transform: translateX(-100%);
  }

  .file-viewer-panel.collapsed {
    transform: translateX(100%);
  }

  /* COMPACT: Command Panel - Right Corner */
  .command-panel {
    position: absolute;
    bottom: 0;
    right: 0;  /* Changed from spanning full width */
    width: 500px;  /* Fixed width instead of left: 20px */
    z-index: 100;
    transition: transform 0.3s ease;
  }

  .command-panel.collapsed {
    transform: translateY(100%);
  }

  /* COMPACT: Command Toggle Button */
  .toggle-button.command-toggle {
    position: absolute;
    top: -25px;  /* Reduced from -30px */
    right: 20px;  /* Right-aligned */
    transform: none;  /* No centering transform */
    width: 60px;  /* Reduced from 80px */
    height: 25px;  /* Reduced from 30px */
    background: linear-gradient(135deg, #667eea, #764ba2);
    border: none;
    border-radius: 6px 6px 0 0;  /* Smaller radius */
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;  /* Smaller font */
    color: white;
    box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.2);
    transition: all 0.3s ease;
    z-index: 101;
  }

  /* COMPACT: Command Card */
  .command-card {
    width: 100%;
    height: 280px;  /* Reduced from 350px */
    background: #1e1e1e;
    border-radius: 6px 0 0 0;  /* Only top-left rounded */
    box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.3);
    overflow: hidden;
  }

  .toggle-button {
    position: absolute;
    width: 25px;  /* Reduced from 30px */
    height: 40px;  /* Reduced from 50px */
    background: linear-gradient(135deg, #667eea, #764ba2);
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;  /* Reduced from 16px */
    color: white;
    box-shadow: 2px 0 8px rgba(0, 0, 0, 0.2);
    transition: all 0.3s ease;
  }

  .left-toggle {
    right: -25px;  /* Adjusted for smaller button */
    top: 10px;
    border-radius: 0 6px 6px 0;
  }

  .right-toggle {
    left: -25px;  /* Adjusted for smaller button */
    top: 10px;
    border-radius: 6px 0 0 6px;
  }

  .toggle-button:hover {
    background: linear-gradient(135deg, #5568d3, #6a3f8f);
  }

  .controls-card,
  .file-viewer-card {
    background: #2d3748;
    border-radius: 8px;  /* Reduced from 12px */
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  /* COMPACT: Controls Content */
  .controls-content {
    width: 220px;  /* Reduced from 300px */
    max-height: calc(100vh - 140px);
    overflow-y: auto;
    padding: 12px;  /* Reduced from 20px */
  }

  /* COMPACT: File Viewer Card */
  .file-viewer-card {
    width: 320px;  /* Reduced from 450px */
    max-height: calc(100vh - 140px);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .file-viewer-header {
    padding: 12px;  /* Reduced from 20px */
    background: rgba(0, 0, 0, 0.2);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .file-path {
    color: #a0aec0;
    font-size: 0.65rem;  /* Reduced from 0.75rem */
    margin: 0.5rem 0 0;
    font-family: 'Courier New', monospace;
  }

  .file-viewer-content {
    flex: 1;
    overflow: auto;
    padding: 12px;  /* Reduced from 20px */
  }

  .file-viewer-content pre {
    margin: 0;
    color: #d4d4d4;
    font-family: 'Courier New', monospace;
    font-size: 0.65rem;  /* Reduced from 0.75rem */
    line-height: 1.4;  /* Tighter line height */
    white-space: pre-wrap;
    word-wrap: break-word;
  }

  .panel-title {
    font-size: 1rem;  /* Reduced from 1.25rem */
    font-weight: 700;
    color: white;
    margin: 0 0 0.75rem 0;  /* Reduced margin */
    padding-bottom: 0.5rem;  /* Reduced padding */
    border-bottom: 2px solid rgba(255, 255, 255, 0.2);
  }

  .section-header {
    margin-bottom: 0.75rem;  /* Reduced from 1rem */
  }

  .section-title {
    font-size: 0.75rem;  /* Reduced from 0.875rem */
    font-weight: 600;
    color: #48bb78;
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .section-divider {
    height: 1px;
    background: linear-gradient(to right, transparent, rgba(255,255,255,0.2), transparent);
    margin: 1rem 0;  /* Reduced from 1.5rem */
  }

  .control-item {
    margin-bottom: 0.75rem;  /* Reduced from 1.25rem */
  }

  .control-item label {
    display: block;
    font-size: 0.75rem;  /* Reduced from 0.875rem */
    margin-bottom: 0.375rem;  /* Reduced */
    color: white;
    font-weight: 500;
  }

  .label-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.375rem;  /* Reduced */
  }

  .label-row label {
    margin-bottom: 0;
  }

  .number-input {
    width: 50px;  /* Reduced from 65px */
    padding: 0.25rem 0.375rem;  /* Reduced padding */
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    color: white;
    font-weight: 700;
    font-size: 0.75rem;  /* Reduced from 0.875rem */
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

  .slider {
    width: 100%;
    height: 4px;  /* Reduced from 6px */
    border-radius: 5px;
    background: rgba(255, 255, 255, 0.1);
    outline: none;
    -webkit-appearance: none;
    appearance: none;
  }

  .slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 14px;  /* Reduced from 18px */
    height: 14px;
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
    width: 14px;
    height: 14px;
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

  /* COMPACT: Button Row */
  .button-row {
    display: flex;
    gap: 6px;
    margin-bottom: 0.75rem;
  }

  /* COMPACT: Smaller Buttons */
  .compact-button {
    flex: 1;
    padding: 0.5rem 0.75rem;  /* Reduced padding */
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: white;
    border: none;
    border-radius: 4px;  /* Smaller radius */
    font-weight: 600;
    font-size: 0.75rem;  /* Smaller font */
    cursor: pointer;
    transition: all 0.3s ease;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }

  .compact-button:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
  }

  select {
    width: 100%;
    padding: 0.5rem;  /* Reduced from 0.625rem */
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 4px;  /* Smaller radius */
    color: white;
    font-size: 0.75rem;  /* Reduced from 0.875rem */
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
    font-size: 0.75rem;  /* Reduced from 0.875rem */
  }

  .checkbox-label input[type="checkbox"] {
    width: 16px;  /* Reduced from 18px */
    height: 16px;
    margin-right: 0.5rem;
    cursor: pointer;
    accent-color: #667eea;
  }

  .stats-display {
    margin-top: 0.75rem;  /* Reduced from 1rem */
    padding: 0.625rem;  /* Reduced from 0.875rem */
    background: rgba(102, 126, 234, 0.2);
    border-radius: 4px;  /* Smaller radius */
    border-left: 3px solid #667eea;
  }

  .stats-display p {
    color: white;
    font-size: 0.65rem;  /* Reduced from 0.75rem */
    margin: 0;
    line-height: 1.4;
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
    width: 40px;  /* Reduced from 50px */
    height: 40px;
    border: 3px solid #e5e7eb;  /* Thinner border */
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
    font-size: 0.875rem;  /* Smaller */
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

    .command-panel {
      bottom: 0;
      right: 0;
      width: 100%;  /* Full width on mobile */
    }

    .command-card {
      width: 100%;
      height: 250px;  /* Even smaller on mobile */
    }

    .controls-card {
      width: calc(100vw - 80px);
      max-width: 200px;  /* Reduced */
    }

    .file-viewer-card {
      max-width: 280px;  /* Reduced */
    }

    .controls-content {
      width: 100%;
      max-height: calc(100vh - 120px);
      padding: 10px;
    }

    .file-viewer-header,
    .file-viewer-content {
      padding: 10px;
    }

    .panel-title {
      font-size: 0.875rem;
    }

    .section-title {
      font-size: 0.7rem;
    }

    .control-item label,
    .checkbox-label {
      font-size: 0.7rem;
    }

    .number-input {
      width: 45px;
      font-size: 0.7rem;
    }
  }

  @media (max-width: 480px) {
    .controls-card {
      max-width: 180px;
    }

    .file-viewer-card {
      max-width: 240px;
    }

    .toggle-button {
      width: 22px;
      height: 35px;
      font-size: 12px;
    }

    .left-toggle {
      right: -22px;
    }

    .right-toggle {
      left: -22px;
    }

    .command-card {
      height: 200px;
    }

    .controls-content {
      padding: 8px;
    }

    .file-viewer-header,
    .file-viewer-content {
      padding: 8px;
    }
  }
</style>