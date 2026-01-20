<script lang="ts">
  import { onMount } from 'svelte';
  import ThrelteCanvas from '$lib/components/ThrelteCanvas.svelte';
  import JsonScene from '$lib/components/JsonScene.svelte';

  let jsonData: any = null;
  let colormap = 'jet';
  let showEdges = true;
  let loading = false;
  let statsText = 'Click "Load Data" to begin';
  let isPanelOpen = true;

  // Camera reference for reset
  let cameraRef: any = null;

  // Paths to your JSON files in the static folder
  const ELLIPSOID_DATA_PATH = '/data/elipsoid_data.json';
  const PRESSURE_DATA_PATH = '/data/pressure_example_data.json';

  async function loadJsonData(filePath: string, dataName: string) {
    loading = true;
    statsText = `Loading ${dataName}...`;

    try {
      const response = await fetch(filePath);
      
      if (!response.ok) {
        throw new Error(`Failed to load file: ${response.statusText}`);
      }

      jsonData = await response.json();
      
      const gridDims = jsonData.metadata?.gridDims?.join('×') || 'Unknown';
      const cellCount = jsonData.grid?.cells?.num || 0;
      const pressures = jsonData.solution?.pressureBar || [];
      const minP = Math.min(...pressures);
      const maxP = Math.max(...pressures);
      
      statsText = `Grid: ${gridDims} | Cells: ${cellCount} | Pressure: ${minP.toFixed(2)}-${maxP.toFixed(2)} bar`;
      console.log(`✅ ${dataName} loaded successfully`);
    } catch (error) {
      console.error('Error loading JSON:', error);
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
  <title>MRST Grid Visualization</title>
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

  <!-- Right Side Data Selection Buttons -->
  <div class="data-buttons">
    <button 
      on:click={() => loadJsonData(ELLIPSOID_DATA_PATH, 'Ellipsoid Data')} 
      class="data-button ellipsoid-button"
      disabled={loading}
    >
      <span class="button-icon">🔵</span>
      <span class="button-text">Ellipsoid Plot</span>
    </button>
    
    <button 
      on:click={() => loadJsonData(PRESSURE_DATA_PATH, 'Pressure Example Data')} 
      class="data-button pressure-button"
      disabled={loading}
    >
      <span class="button-icon">📊</span>
      <span class="button-text">Pressure Plot</span>
    </button>
  </div>

  <!-- 3D Visualization -->
  <div class="canvas-container">
    <ThrelteCanvas showGrid={true} cameraPosition={{ x: 30, y: 30, z: 30 }} resetTrigger={cameraRef}>
      {#if jsonData}
        <JsonScene {jsonData} {colormap} {showEdges} />
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
    width: 300px;
    max-height: calc(100vh - 140px);
    overflow-y: auto;
    padding: 20px;
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

  /* Right Side Data Selection Buttons */
  .data-buttons {
    position: absolute;
    top: 20px;
    right: 20px;
    z-index: 100;
    display: flex;
    flex-direction: column;
    gap: 15px;
  }

  .data-button {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px 24px;
    border: none;
    border-radius: 12px;
    font-weight: 600;
    font-size: 0.95rem;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
    min-width: 200px;
  }

  .data-button:hover:not(:disabled) {
    transform: translateY(-3px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
  }

  .data-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  .ellipsoid-button {
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: white;
  }

  .ellipsoid-button:hover:not(:disabled) {
    background: linear-gradient(135deg, #5568d3, #6a3f8f);
  }

  .pressure-button {
    background: linear-gradient(135deg, #f093fb, #f5576c);
    color: white;
  }

  .pressure-button:hover:not(:disabled) {
    background: linear-gradient(135deg, #e082ea, #e44658);
  }

  .button-icon {
    font-size: 1.5rem;
  }

  .button-text {
    letter-spacing: 0.5px;
  }
</style>