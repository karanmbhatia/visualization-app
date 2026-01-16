<script>
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import * as THREE from 'three';

  let canvasElement;
  let wasmModule = null;
  let scene, camera, renderer;
  let ellipsoidMesh = null;
  
  // UI State
  let wasmStatus = 'Initializing...';
  let wasmLoaded = false;
  let message = '';
  let isError = false;
  
  // Ellipsoid parameters
  let semiA = 1.5;
  let semiB = 1.0;
  let semiC = 1.2;

  // Mouse control state
  let isDragging = false;
  let previousMousePosition = { x: 0, y: 0 };
  let mouseButton = 0;

  onMount(() => {
    if (browser) {
      initThreeJS();
      loadWasmModule();
    }
    
    return () => {
      if (renderer) {
        renderer.dispose();
      }
      if (ellipsoidMesh) {
        ellipsoidMesh.geometry.dispose();
        ellipsoidMesh.material.dispose();
      }
    };
  });

  function initThreeJS() {
    if (!canvasElement) return;

    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);
    scene.fog = new THREE.Fog(0x1a1a1a, 50, 100);

    // Camera setup
    const width = canvasElement.clientWidth;
    const height = canvasElement.clientHeight;
    camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(3, 2.5, 3);
    camera.lookAt(0, 0, 0);

    // Renderer setup
    renderer = new THREE.WebGLRenderer({ 
      canvas: canvasElement, 
      antialias: true 
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    const pointLight = new THREE.PointLight(0x32b8c6, 0.5);
    pointLight.position.set(-3, 2, 3);
    scene.add(pointLight);

    // Grid
    const gridHelper = new THREE.GridHelper(10, 10, 0x444444, 0x222222);
    scene.add(gridHelper);

    // Axes
    const axesHelper = new THREE.AxesHelper(2);
    scene.add(axesHelper);

    // Start animation
    animate();

    // Handle window resize
    window.addEventListener('resize', handleResize);
  }

  function handleResize() {
    if (!canvasElement || !camera || !renderer) return;
    
    const width = canvasElement.clientWidth;
    const height = canvasElement.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }

  function animate() {
    requestAnimationFrame(animate);
    if (renderer && scene && camera) {
      renderer.render(scene, camera);
    }
  }

  async function loadWasmModule() {
    try {
      wasmStatus = 'Loading WASM module...';

      // Fetch the JavaScript wrapper
      const response = await fetch('/wasm/ellipsoidExample.js');
      if (!response.ok) {
        throw new Error(`Failed to fetch ellipsoidExample.js: ${response.statusText}`);
      }
      
      const scriptText = await response.text();
      
      // Execute script to get createModule function
      // Using indirect eval to execute in global scope
      const globalEval = eval;
      globalEval(scriptText);
      
      // createModule should now be available globally
      if (typeof window.createModule === 'undefined') {
        throw new Error('createModule function not found after loading ellipsoidExample.js');
      }
      
      // Configure module to locate WASM file
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

      // Instantiate the WASM module
      wasmModule = await window.createModule(moduleConfig);
      
      wasmStatus = '✓ WASM module loaded successfully';
      wasmLoaded = true;
      
      console.log('WASM Module loaded:', wasmModule);
      
      // Generate initial ellipsoid
      generateEllipsoid(semiA, semiB, semiC);
      
    } catch (error) {
      console.error('WASM Loading Error:', error);
      wasmStatus = '✗ Failed to load WASM module';
      updateMessage(`Error: ${error.message}`, true);
    }
  }

  function generateEllipsoid(a, b, c) {
    if (!scene) return;

    // Remove old mesh
    if (ellipsoidMesh) {
      scene.remove(ellipsoidMesh);
      ellipsoidMesh.geometry.dispose();
      ellipsoidMesh.material.dispose();
    }

    // Create ellipsoid geometry
    const geometry = new THREE.IcosahedronGeometry(1, 6);

    // Modify vertices to create ellipsoid
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

    // Create material with gradient effect
    const material = new THREE.MeshPhongMaterial({
      color: 0x32b8c6,
      emissive: 0x0a3a3f,
      shininess: 100,
      wireframe: false,
      side: THREE.DoubleSide,
    });

    ellipsoidMesh = new THREE.Mesh(geometry, material);
    ellipsoidMesh.castShadow = true;
    ellipsoidMesh.receiveShadow = true;
    scene.add(ellipsoidMesh);

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
    if (!camera || !ellipsoidMesh) return;
    
    camera.position.set(3, 2.5, 3);
    camera.lookAt(0, 0, 0);
    ellipsoidMesh.rotation.set(0, 0, 0);
  }

  // Mouse event handlers
  function handleMouseDown(e) {
    isDragging = true;
    mouseButton = e.button;
    previousMousePosition = { x: e.clientX, y: e.clientY };
  }

  function handleMouseMove(e) {
    if (!isDragging || !ellipsoidMesh || !camera) return;
    
    const deltaX = e.clientX - previousMousePosition.x;
    const deltaY = e.clientY - previousMousePosition.y;

    if (mouseButton === 0) {
      // Left click - Rotate
      ellipsoidMesh.rotation.y += deltaX * 0.01;
      ellipsoidMesh.rotation.x += deltaY * 0.01;
    } else if (mouseButton === 2) {
      // Right click - Pan
      camera.position.x -= deltaX * 0.01;
      camera.position.y += deltaY * 0.01;
    }
    
    previousMousePosition = { x: e.clientX, y: e.clientY };
  }

  function handleMouseUp() {
    isDragging = false;
  }

  function handleWheel(e) {
    if (!camera) return;
    
    e.preventDefault();
    const zoomSpeed = 0.1;
    const direction = camera.position.clone().normalize();
    const distance = camera.position.length();
    const newDistance = Math.max(0.5, distance + (e.deltaY > 0 ? zoomSpeed : -zoomSpeed));
    camera.position.copy(direction.multiplyScalar(newDistance));
  }

  function handleContextMenu(e) {
    e.preventDefault();
  }
</script>

<svelte:head>
  <title>WASM Ellipsoid Visualizer</title>
</svelte:head>

<div class="container">
  <canvas 
    bind:this={canvasElement}
    on:mousedown={handleMouseDown}
    on:mousemove={handleMouseMove}
    on:mouseup={handleMouseUp}
    on:mouseleave={handleMouseUp}
    on:wheel={handleWheel}
    on:contextmenu={handleContextMenu}
  />

  <div class="ui-panel">
    <div class="wasm-status">{wasmStatus}</div>

    {#if wasmLoaded}
      <div class="controls">
        <h2>Ellipsoid Parameters</h2>

        <div class="form-group">
          <label for="semiA">Semi-axis A (X): {semiA.toFixed(1)}</label>
          <input type="range" id="semiA" min="0.5" max="3" step="0.1" bind:value={semiA}>
          <input type="number" min="0.5" max="3" step="0.1" bind:value={semiA}>
        </div>

        <div class="form-group">
          <label for="semiB">Semi-axis B (Y): {semiB.toFixed(1)}</label>
          <input type="range" id="semiB" min="0.5" max="3" step="0.1" bind:value={semiB}>
          <input type="number" min="0.5" max="3" step="0.1" bind:value={semiB}>
        </div>

        <div class="form-group">
          <label for="semiC">Semi-axis C (Z): {semiC.toFixed(1)}</label>
          <input type="range" id="semiC" min="0.5" max="3" step="0.1" bind:value={semiC}>
          <input type="number" min="0.5" max="3" step="0.1" bind:value={semiC}>
        </div>

        <div class="button-group">
          <button on:click={handleGenerate}>Generate Ellipsoid</button>
          <button on:click={handleReset}>Reset View</button>
        </div>

        {#if message}
          <div class:status-text={!isError} class:error-text={isError}>
            {message}
          </div>
        {/if}
      </div>
    {:else}
      <div class="loading">
        <div class="spinner"></div>
        <p>Loading WASM module...</p>
      </div>
    {/if}
  </div>

  <div class="info">
    <div><strong>Controls:</strong></div>
    <div>• Rotate: Left click + drag</div>
    <div>• Zoom: Mouse wheel</div>
    <div>• Pan: Right click + drag</div>
  </div>
</div>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    overflow: hidden;
  }

  .container {
    position: relative;
    width: 100vw;
    height: 100vh;
    margin: 0;
    padding: 0;
    overflow: hidden;
    background: #1a1a1a;
  }

  canvas {
    display: block;
    width: 100%;
    height: 100%;
    cursor: grab;
  }

  canvas:active {
    cursor: grabbing;
  }

  .ui-panel {
    position: absolute;
    top: 20px;
    left: 20px;
    background: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(10px);
    padding: 20px;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    min-width: 320px;
    max-width: 400px;
    z-index: 100;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  }

  .ui-panel h2 {
    margin: 0 0 20px 0;
    font-size: 20px;
    font-weight: 600;
    color: #32b8c6;
    border-bottom: 2px solid rgba(50, 184, 198, 0.3);
    padding-bottom: 10px;
  }

  .form-group {
    margin-bottom: 20px;
  }

  .form-group label {
    display: block;
    font-size: 13px;
    margin-bottom: 8px;
    color: #ccc;
    font-weight: 500;
  }

  .form-group input[type="number"] {
    width: 100%;
    padding: 10px;
    margin-top: 8px;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: #fff;
    border-radius: 6px;
    font-size: 14px;
    transition: all 0.3s ease;
  }

  .form-group input[type="number"]:focus {
    outline: none;
    border-color: #32b8c6;
    background: rgba(255, 255, 255, 0.15);
  }

  .form-group input[type="range"] {
    width: 100%;
    height: 6px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
    outline: none;
    cursor: pointer;
    -webkit-appearance: none;
  }

  .form-group input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #32b8c6;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(50, 184, 198, 0.5);
    transition: all 0.3s ease;
  }

  .form-group input[type="range"]::-webkit-slider-thumb:hover {
    transform: scale(1.1);
    background: #2da5b3;
  }

  .form-group input[type="range"]::-moz-range-thumb {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #32b8c6;
    cursor: pointer;
    border: none;
    box-shadow: 0 2px 8px rgba(50, 184, 198, 0.5);
    transition: all 0.3s ease;
  }

  .form-group input[type="range"]::-moz-range-thumb:hover {
    transform: scale(1.1);
    background: #2da5b3;
  }

  .button-group {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-top: 20px;
  }

  button {
    padding: 12px 16px;
    background: linear-gradient(135deg, #32b8c6, #2da5b3);
    color: #000;
    border: none;
    border-radius: 6px;
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.3s ease;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  button:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(50, 184, 198, 0.4);
  }

  button:active {
    transform: translateY(0);
  }

  .status-text,
  .error-text {
    margin-top: 20px;
    padding: 12px;
    border-radius: 6px;
    font-size: 12px;
    line-height: 1.5;
  }

  .status-text {
    background: rgba(50, 184, 198, 0.1);
    border-left: 3px solid #32b8c6;
    color: #b0f0f9;
  }

  .error-text {
    background: rgba(255, 84, 89, 0.1);
    border-left: 3px solid #ff5459;
    color: #ff9a9f;
  }

  .wasm-status {
    font-size: 13px;
    color: #aaa;
    margin-bottom: 20px;
    padding-bottom: 20px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    font-weight: 500;
  }

  .loading {
    text-align: center;
    padding: 40px 20px;
  }

  .spinner {
    display: inline-block;
    width: 40px;
    height: 40px;
    border: 4px solid rgba(50, 184, 198, 0.2);
    border-top-color: #32b8c6;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin-bottom: 16px;
  }

  .loading p {
    color: #aaa;
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
    background: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(10px);
    padding: 16px 20px;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    font-size: 13px;
    color: #aaa;
    max-width: 250px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  }

  .info div {
    margin-bottom: 6px;
    line-height: 1.5;
  }

  .info div:last-child {
    margin-bottom: 0;
  }

  .info strong {
    color: #32b8c6;
  }
</style>