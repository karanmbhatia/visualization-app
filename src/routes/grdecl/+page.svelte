<script lang="ts">
  import { onMount } from 'svelte';
  import ThrelteCanvas from '$lib/components/ThrelteCanvas.svelte';
  import GrdeclScene from '$lib/components/GrdeclScene.svelte';
  import { parseGrdecl, type GrdeclData } from '$lib/utils/grdeclParser';

  let grdeclData: GrdeclData | null = null;
  let colormap = 'jet';
  let showEdges = true;
  let loading = false;
  let statsText = 'Loading GRDECL data...';
  let isPanelOpen = true;

  // Camera reference for reset
  let cameraRef: any = null;

  // Path to GRDECL file in static folder
  const GRDECL_FILE_PATH = '/data/simple_3layer.grdecl';

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

      const fileContent = await response.text();
      
      statsText = 'Parsing GRDECL format...';
      grdeclData = parseGrdecl(fileContent);
      
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

  function togglePanel() {
    isPanelOpen = !isPanelOpen;
  }
</script>

<svelte:head>
  <title>GRDECL Grid Visualization</title>
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
          <h3 class="panel-title">GRDECL Controls</h3>
           <!--
          <div class="control-item">
            <button on:click={loadGrdeclData} class="load-button" disabled={loading}>
              {loading ? 'Loading...' : 'Load GRDECL'}
            </button>
          </div> -->

          <div class="control-item">
            <label for="colormap">Colormap (by layer)</label>
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
          <!--
          <div class="info-section">
            <h4>About GRDECL</h4>
            <p>Corner-point grid format used in reservoir simulation.</p>
            <ul>
              <li><strong>SPECGRID:</strong> Grid dimensions (NX × NY × NZ)</li>
              <li><strong>COORD:</strong> Pillar coordinates</li>
              <li><strong>ZCORN:</strong> Cell corner depths</li>
              <li><strong>ACTNUM:</strong> Active cells</li>
            </ul>
          </div> -->
        </div>
      </div>
    {/if}
  </div>

  <!-- 3D Visualization -->
  <div class="canvas-container">
    <ThrelteCanvas showGrid={true} cameraPosition={{ x: 30, y: 30, z: 30 }} resetTrigger={cameraRef}>
      {#if grdeclData}
        <GrdeclScene {grdeclData} {colormap} {showEdges} />
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
    width: 320px;
    max-height: calc(100vh - 140px);
    overflow-y: auto;
    padding:10px;
  }

  .panel-title {
    font-size: 1.25rem;
    font-weight: 700;
    color: white;
    margin: 0 0 1.25rem 0;
    padding-bottom: 0.75rem;
    border-bottom: 2px solid rgba(255, 255, 255, 0.2);
  }

  .control-item {
    margin-bottom: 1.25rem;
  }

  .control-item label {
    display: block;
    font-size: 0.875rem;
    margin-bottom: 0.5rem;
    color: white;
    font-weight: 500;
  }

  .load-button {
    width: 100%;
    padding: 0.75rem 1.25rem;
    background: linear-gradient(135deg, #48bb78, #38a169);
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

  .load-button:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(72, 187, 120, 0.4);
  }

  .load-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
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

  .info-section {
    margin-top: 1.5rem;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 6px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .info-section h4 {
    color: white;
    font-size: 0.875rem;
    font-weight: 600;
    margin: 0 0 0.75rem 0;
  }

  .info-section p {
    color: rgba(255, 255, 255, 0.8);
    font-size: 0.75rem;
    margin: 0 0 0.75rem 0;
    line-height: 1.5;
  }

  .info-section ul {
    margin: 0;
    padding-left: 1.25rem;
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.7rem;
    line-height: 1.6;
  }

  .info-section li {
    margin-bottom: 0.25rem;
  }

  .info-section strong {
    color: #667eea;
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
</style>