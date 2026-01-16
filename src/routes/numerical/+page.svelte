<script lang="ts">
  import { onMount } from 'svelte';
  import * as THREE from 'three';

  let container: HTMLDivElement;
  let loadingEl: HTMLElement;

  let scene: THREE.Scene;
  let camera: THREE.PerspectiveCamera;
  let renderer: THREE.WebGLRenderer;

  // Constants
  const barsa = 1e5;
  const darcy = 9.869233e-13;
  const centi = 0.01;
  const poise = 0.1;
  const meter = 1;

  // Grid: 1×1×30 cells, 30m height
  const nx = 1;
  const ny = 1;
  const nz = 30;

  const domainX = 1.0;
  const domainY = 1.0;
  const domainZ = 30.0;

  const dx = domainX / nx;
  const dy = domainY / ny;
  const dz = domainZ / nz;

  // Properties
  const perm = 0.1 * darcy;
  const mu = 1 * centi * poise;
  const rho = 1014;
  const bcPressure = 100 * barsa;
  const g = 9.81;

  // Mouse controls state
  let isDragging = false;
  let previousMousePosition = { x: 0, y: 0 };

  onMount(() => {
    setTimeout(() => {
      if (container) {
        initThree();
        const facePressure = solvePressure();
        visualizePressure(facePressure);
        // Remove loading element completely
        if (loadingEl && loadingEl.parentNode) {
          loadingEl.parentNode.removeChild(loadingEl);
        }
      }
    }, 100);

    return () => {
      if (renderer && renderer.domElement) {
        renderer.domElement.removeEventListener('mousedown', onMouseDown);
        renderer.domElement.removeEventListener('mousemove', onMouseMove);
        renderer.domElement.removeEventListener('mouseup', onMouseUp);
        renderer.domElement.removeEventListener('wheel', onWheel);
      }
      window.removeEventListener('resize', onWindowResize);
    };
  });

  function initThree() {
    // Scene setup with dark background
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x2b2b2b);

    const width = container.clientWidth;
    const height = container.clientHeight;

    camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight1.position.set(10, 10, 5);
    scene.add(directionalLight1);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
    directionalLight2.position.set(-10, -10, 25);
    scene.add(directionalLight2);

    // Camera position - zoomed out view, looking at VERTICAL stack (Y-axis)
    const totalHeight = nz * 0.15; // cellHeight = 0.15
    camera.position.set(5, -totalHeight / 2, 6);
    camera.lookAt(0, -totalHeight / 2, 0);

    // Setup controls
    setupControls();
    window.addEventListener('resize', onWindowResize);
    animate();
  }

  function setupControls() {
    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mouseup', onMouseUp);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false });
  }

  function onMouseDown(e: MouseEvent) {
    isDragging = true;
    previousMousePosition = { x: e.clientX, y: e.clientY };
  }

  function onMouseMove(e: MouseEvent) {
    if (!isDragging) return;

    const deltaX = e.clientX - previousMousePosition.x;
    const deltaY = e.clientY - previousMousePosition.y;

    const rotationSpeed = 0.005;
    const totalHeight = nz * 0.15;
    const center = new THREE.Vector3(0, -totalHeight / 2, 0);
    const offset = camera.position.clone().sub(center);

    // Horizontal rotation around Y-axis (vertical)
    const quaternionY = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -deltaX * rotationSpeed);
    offset.applyQuaternion(quaternionY);

    // Vertical rotation
    const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), offset).normalize();
    const quaternionX = new THREE.Quaternion().setFromAxisAngle(right, -deltaY * rotationSpeed);
    offset.applyQuaternion(quaternionX);

    camera.position.copy(center).add(offset);
    camera.lookAt(center);

    previousMousePosition = { x: e.clientX, y: e.clientY };
  }

  function onMouseUp() {
    isDragging = false;
  }

  function onWheel(e: WheelEvent) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.01 : -0.01;
    const totalHeight = nz * 0.15;
    const center = new THREE.Vector3(0, -totalHeight / 2, 0);
    const direction = camera.position.clone().sub(center).normalize();
    camera.position.add(direction.multiplyScalar(delta * 100));
  }

  function onWindowResize() {
    if (!container || !camera || !renderer) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

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

  function solvePressure(): number[] {
    const numCells = nz;
    const area = dx * dy;
    const trans = (perm * mu * area) / dz;

    // Build system matrix and RHS
    const A: number[][] = Array(numCells).fill(0).map(() => Array(numCells).fill(0));
    const b: number[] = Array(numCells).fill(0);

    for (let k = 0; k < nz; k++) {
      const cellVolume = dx * dy * dz;

      if (k === 0) {
        // Top boundary
        A[k][k] = trans;
        b[k] = trans * bcPressure;
      } else {
        A[k][k] = trans;
        A[k][k - 1] = -trans;
      }

      if (k !== nz - 1) {
        A[k][k] += trans;
        A[k][k + 1] = -trans;
      }

      b[k] += rho * g * cellVolume;
    }

    // Solve Ax = b using Jacobi iteration
    const pressure: number[] = Array(numCells).fill(bcPressure);
    const maxIter = 2000;
    const tol = 1e-8;

    for (let iter = 0; iter < maxIter; iter++) {
      let maxChange = 0;

      for (let i = 0; i < numCells; i++) {
        let sum = b[i];
        for (let j = 0; j < numCells; j++) {
          if (i !== j) {
            sum -= A[i][j] * pressure[j];
          }
        }
        const newP = sum / A[i][i];
        maxChange = Math.max(maxChange, Math.abs(newP - pressure[i]));
        pressure[i] = newP;
      }

      if (maxChange < tol) break;
    }

    // Face pressures
    const facePressure: number[] = [bcPressure];
    for (let k = 0; k < nz - 1; k++) {
      facePressure.push((pressure[k] + pressure[k + 1]) / 2);
    }
    facePressure.push(pressure[nz - 1]);

    return facePressure.map((p) => p / barsa); // Convert to bar
  }

  function getJetColor(value: number, min: number, max: number): THREE.Color {
    const t = (value - min) / (max - min);
    let r = 0,
      g = 0,
      b = 0;

    if (t < 0.125) {
      r = 0;
      g = 0;
      b = 0.5 + (0.5 * t) / 0.125;
    } else if (t < 0.375) {
      r = 0;
      g = (t - 0.125) / 0.25;
      b = 1;
    } else if (t < 0.625) {
      r = (t - 0.375) / 0.25;
      g = 1;
      b = 1 - (t - 0.375) / 0.25;
    } else if (t < 0.875) {
      r = 1;
      g = 1 - (t - 0.625) / 0.25;
      b = 0;
    } else {
      r = 1 - (0.5 * (t - 0.875)) / 0.125;
      g = 0;
      b = 0;
    }

    return new THREE.Color(r, g, b);
  }

  function updateColorbarTicks() {
    // Fixed colorbar values: 102.5 (top) to 100 (bottom)
    const tickValues = [102.5, 102, 101.5, 101, 100.5, 100];
    
    for (let i = 0; i < 6; i++) {
      const tickEl = document.getElementById(`tick${i}`);
      if (tickEl) {
        tickEl.innerText = tickValues[i].toFixed(1);
      }
    }
  }

  function visualizePressure(facePressure: number[]) {
    try {
      const minP = Math.min(...facePressure);
      const maxP = Math.max(...facePressure);

      // Update colorbar with fixed pressure values
      updateColorbarTicks();

      // Cell dimensions
      const cellWidth = 1.0;
      const cellDepth = 1.0;
      const cellHeight = 0.15; // Thin tiles visual representation

      // Draw each cell as a box with its own color
      // k=0 is TOP (low pressure), k=29 is BOTTOM (high pressure)
      for (let k = 0; k < nz; k++) {
        // Get average pressure for this cell
        const topFaceP = facePressure[k];
        const bottomFaceP = facePressure[k + 1];
        const cellP = (topFaceP + bottomFaceP) / 2;

        const color = getJetColor(cellP, minP, maxP);

        // Position VERTICALLY along Y-axis (Y points UP in Three.js)
        // Top cells (k=0) have higher y, bottom cells (k=29) have lower y
        const y = -k * cellHeight; // Negative so top is at y≈0, bottom at y≈-4.5

        // Create box for this cell
        const geometry = new THREE.BoxGeometry(cellWidth, cellHeight, cellDepth);
        const material = new THREE.MeshStandardMaterial({
          color: color,
          metalness: 0.3,
          roughness: 0.6
        });

        const box = new THREE.Mesh(geometry, material);
        box.position.set(0, y - cellHeight / 2, 0); // Position along Y-axis
        scene.add(box);

        // Add black edges around this cell
        const edges = new THREE.EdgesGeometry(geometry);
        const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 1 });
        const edgeLines = new THREE.LineSegments(edges, edgeMaterial);
        edgeLines.position.set(0, y - cellHeight / 2, 0);
        scene.add(edgeLines);
      }
    } catch (error) {
      console.error('Error visualizing pressure:', error);
      if (loadingEl) {
        loadingEl.innerText = `Error: ${(error as any).message}`;
      }
    }
  }
</script>

<style>
  .header {
    background: #1a1a1a;
    padding: 12px 16px;
    border-bottom: 1px solid #444;
  }

  .header h1 {
    font-size: 20px;
    font-weight: bold;
    color: #e0e0e0;
    margin: 0;
  }

  .header p {
    font-size: 12px;
    color: #999;
    margin-top: 2px;
  }

  .main-wrapper {
    display: flex;
    height: calc(100vh - 60px);
  }

  .container {
    flex: 1;
    position: relative;
    background: #2b2b2b;
  }

  #loading {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 16px;
    color: #e0e0e0;
    background: rgba(40, 40, 40, 0.95);
    padding: 15px 30px;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
    z-index: 20;
    pointer-events: none;
  }

  .colorbar-container {
    width: 100px;
    background: #1a1a1a;
    border-left: 1px solid #444;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .colorbar-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20px 10px;
  }

  .colorbar-title {
    font-size: 11px;
    font-weight: 500;
    color: #e0e0e0;
    margin-bottom: 15px;
    writing-mode: horizontal-tb;
  }

  .colorbar-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }

  .colorbar-gradient {
    width: 20px;
    height: 400px;
    border-radius: 2px;
    background: linear-gradient(
      to bottom,
      #ffff00 0%,
      #ffcc00 10%,
      #ff9900 20%,
      #ff6600 30%,
      #00ff80 40%,
      #00ffff 50%,
      #00ccff 60%,
      #0080ff 70%,
      #0040ff 80%,
      #0000ff 90%,
      #0000cc 100%
    );
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
  }

  .colorbar-ticks {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    height: 400px;
    font-size: 9px;
    color: #ccc;
    margin-left: 5px;
  }

  .tick {
    display: flex;
    align-items: center;
  }
</style>

<div class="header">
  <h1>Pressure [bar]</h1>
  <p>Grid: 1×1×30 cells (30m height) | Drag to rotate | Scroll to zoom</p>
</div>

<div class="main-wrapper">
  <div class="container" bind:this={container}>
    <div id="loading" bind:this={loadingEl}>Computing pressure field...</div>
  </div>

  <div class="colorbar-container">
    <div class="colorbar-content">
      <div class="colorbar-title">Pressure</div>
      <div class="colorbar-wrapper">
        <div class="colorbar-gradient"></div>
        <div class="colorbar-ticks">
          <div class="tick"><span id="tick0">102.5</span></div>
          <div class="tick"><span id="tick1">102.0</span></div>
          <div class="tick"><span id="tick2">101.5</span></div>
          <div class="tick"><span id="tick3">101.0</span></div>
          <div class="tick"><span id="tick4">100.5</span></div>
          <div class="tick"><span id="tick5">100.0</span></div>
        </div>
      </div>
    </div>
  </div>
</div>
