<script>
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import ThrelteCanvas from '$lib/components/ThrelteCanvas.svelte';
  import { T } from '@threlte/core';
  import * as THREE from 'three';

  let wasmModule = null;
  let ellipsoidMesh = null;
  
  // UI State
  let wasmStatus = 'Initializing...';
  let wasmLoaded = false;
  let message = '';
  let isError = false;
  let isPanelOpen = true;
  
  // Ellipsoid parameters
  let semiA = 1.5;
  let semiB = 1.0;
  let semiC = 1.2;

  // Camera reference for reset
  let cameraRef = null;

  onMount(() => {
    if (browser) {
      loadWasmModule();
    }
  });

  async function loadWasmModule() {
    try {
      wasmStatus = 'Loading WASM module...';

      const response = await fetch('/wasm/ellipsoidExample.js');
      if (!response.ok) {
        throw new Error(`Failed to fetch ellipsoidExample.js: ${response.statusText}`);
      }
      
      const scriptText = await response.text();
      const globalEval = eval;
      globalEval(scriptText);
      
      if (typeof window.createModule === 'undefined') {
        throw new Error('createModule function not found');
      }
      
      const moduleConfig = {
        locateFile: (path) => {
          if (path.endsWith('.wasm')) {
            return '/wasm/ellipsoidExample.wasm';
          }
          return '/wasm/' + path;
        },
        print: (text) => console.log('[WASM]', text),
        printErr: (text) => console.error('[WASM Error]', text)
      };

      wasmModule = await window.createModule(moduleConfig);
      
      wasmStatus = '✓ WASM module loaded successfully';
      wasmLoaded = true;
      
      console.log('WASM Module loaded:', wasmModule);
      generateEllipsoid(semiA, semiB, semiC);
      
    } catch (error) {
      console.error('WASM Loading Error:', error);
      wasmStatus = '✗ Failed to load WASM module';
      updateMessage(`Error: ${error.message}`, true);
    }
  }

  function generateEllipsoid(a, b, c) {
    ellipsoidMesh = null;
    
    // Create new geometry
    const geometry = new THREE.IcosahedronGeometry(1, 6);
    const positions = geometry.attributes.position;
    
    for (let i = 0; i < positions.count; i++) {
      let x = positions.getX(i);
      let y = positions.getY(i);
      let z = positions.getZ(i);

      const length = Math.sqrt(x * x + y * y + z * z);
      positions.setXYZ(
        i,
        (x / length) * a,
        (y / length) * b,
        (z / length) * c
      );
    }
    positions.needsUpdate = true;
    geometry.computeVertexNormals();

    const material = new THREE.MeshPhongMaterial({
      color: 0x32b8c6,
      emissive: 0x0a3a3f,
      shininess: 100,
      wireframe: false,
      side: THREE.DoubleSide,
    });

    // Add edges
    const edges = new THREE.EdgesGeometry(geometry);

    ellipsoidMesh = {
      geometry,
      material,
      edges
    };

    updateMessage(`Ellipsoid generated: a=${a.toFixed(2)}, b=${b.toFixed(2)}, c=${c.toFixed(2)}`, false);
  }

  function updateMessage(text, error = false) {
    message = text;
    isError = error;
  }

  function handleGenerate() {
    generateEllipsoid(semiA, semiB, semiC);
  }

  function handleReset() {
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
  <title>Method 3: WASM Ellipsoid Visualizer</title>
</svelte:head>

<div class="container">
  <!-- Floating Controls Panel -->
  <div class="controls-panel" class:collapsed={!isPanelOpen}>
    <button class="toggle-button" on:click={togglePanel}>
      {isPanelOpen ? '◀' : '▶'}
    </button>
    
    {#if isPanelOpen}
      <div class="controls-card">
        <div class="controls-content">
          <div class="wasm-status">{wasmStatus}</div>

          {#if wasmLoaded}
            <h3 class="panel-title">Ellipsoid Parameters</h3>

            <div class="control-item">
              <label for="semiA">Semi-axis A (X): {semiA.toFixed(1)}</label>
              <input type="range" id="semiA" min="0.5" max="3" step="0.1" bind:value={semiA}>
              <input type="number" min="0.5" max="3" step="0.1" bind:value={semiA}>
            </div>

            <div class="control-item">
              <label for="semiB">Semi-axis B (Y): {semiB.toFixed(1)}</label>
              <input type="range" id="semiB" min="0.5" max="3" step="0.1" bind:value={semiB}>
              <input type="number" min="0.5" max="3" step="0.1" bind:value={semiB}>
            </div>

            <div class="control-item">
              <label for="semiC">Semi-axis C (Z): {semiC.toFixed(1)}</label>
              <input type="range" id="semiC" min="0.5" max="3" step="0.1" bind:value={semiC}>
              <input type="number" min="0.5" max="3" step="0.1" bind:value={semiC}>
            </div>

            <div class="button-group">
              <button on:click={handleGenerate} class="action-button">Generate Ellipsoid</button>
              <button on:click={handleReset} class="action-button">Reset View</button>
            </div>

            {#if message}
              <div class:status-text={!isError} class:error-text={isError}>
                {message}
              </div>
            {/if}
          {:else}
            <div class="loading">
              <div class="spinner"></div>
              <p>Loading WASM module...</p>
            </div>
          {/if}
        </div>
      </div>
    {/if}
  </div>

  <!-- Info Panel -->
  <div class="info">
    <div class="info-card">
      <div class="info-content">
        <div><strong>Controls:</strong></div>
        <div>• Rotate: Left click + drag</div>
        <div>• Zoom: Mouse wheel</div>
        <div>• Pan: Right click + drag</div>
      </div>
    </div>
  </div>

  <!-- 3D Visualization with Threlte -->
  <div class="canvas-container">
    <ThrelteCanvas showGrid={true} cameraPosition={{ x: 3, y: 2.5, z: 3 }} resetTrigger={cameraRef}>
      {#if ellipsoidMesh}
        <T.Mesh geometry={ellipsoidMesh.geometry} material={ellipsoidMesh.material} />
        <T.LineSegments geometry={ellipsoidMesh.edges}>
          <T.LineBasicMaterial color={0x000000} />
        </T.LineSegments>
      {/if}
    </ThrelteCanvas>
  </div>
</div>

<style>
  .container {
    position: relative;
    width: 100vw;
    height: 100vh;
    margin: 0;
    padding: 0;
    overflow: hidden;
    background: white;
  }

  .canvas-container {
    width: 100%;
    height: 100%;
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
    padding: 10px;
  }

  .panel-title {
    font-size: 1.25rem;
    font-weight: 700;
    color: white;
    margin: 0 0 1.25rem 0;
    padding-bottom: 0.5rem;
    border-bottom: 2px solid rgba(255, 255, 255, 0.2);
  }

  .wasm-status {
    font-size: 0.875rem;
    color: #a0aec0;
    margin-bottom: 1.25rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    font-weight: 500;
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

  .control-item input[type="number"] {
    width: 100%;
    padding: 0.625rem;
    margin-top: 0.5rem;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: white;
    border-radius: 6px;
    font-size: 0.875rem;
    transition: all 0.3s ease;
  }

  .control-item input[type="number"]:focus {
    outline: none;
    border-color: #667eea;
    background: rgba(255, 255, 255, 0.15);
  }

  .control-item input[type="range"] {
    width: 100%;
    height: 6px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 3px;
    outline: none;
    cursor: pointer;
    -webkit-appearance: none;
  }

  .control-item input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #667eea;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(102, 126, 234, 0.5);
  }

  .control-item input[type="range"]::-moz-range-thumb {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #667eea;
    cursor: pointer;
    border: none;
    box-shadow: 0 2px 8px rgba(102, 126, 234, 0.5);
  }

  .button-group {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-top: 1.25rem;
  }

  .action-button {
    padding: 0.75rem 1rem;
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

  .status-text,
  .error-text {
    margin-top: 1.25rem;
    padding: 0.875rem;
    border-radius: 6px;
    font-size: 0.75rem;
    line-height: 1.5;
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

  .loading {
    text-align: center;
    padding: 40px 20px;
  }

  .spinner {
    display: inline-block;
    width: 40px;
    height: 40px;
    border: 4px solid rgba(255, 255, 255, 0.2);
    border-top-color: #667eea;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin-bottom: 16px;
  }

  .loading p {
    color: #a0aec0;
    font-size: 14px;
    margin: 0;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .info {
    position: absolute;
    bottom: 20px;
    right: 20px;
    max-width: 250px;
    z-index: 100;
  }

  .info-card {
    background: #2d3748;
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .info-content {
    padding: 12px 16px;
  }

  .info-content div {
    margin-bottom: 6px;
    line-height: 1.5;
    font-size: 0.875rem;
    color: white;
  }

  .info-content div:last-child {
    margin-bottom: 0;
  }

  .info-content strong {
    color: #667eea;
  }

  @media (max-width: 768px) {
    .controls-content {
      width: 280px;
    }
  }
</style>