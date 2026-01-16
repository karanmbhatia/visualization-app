<script lang="ts">
  import { onMount } from 'svelte';
  import * as THREE from 'three';

  let canvas: HTMLCanvasElement;
  let statsText: HTMLElement;
  let colormapSelect: HTMLSelectElement;
  let showEdgesCheckbox: HTMLInputElement;
  let colorbarCanvas: HTMLCanvasElement;
  let loadingEl: HTMLElement;

  let scene: THREE.Scene;
  let camera: THREE.PerspectiveCamera;
  let renderer: THREE.WebGLRenderer;
  let mesh: THREE.Mesh;
  let edgesMesh: THREE.LineSegments;
  let mrstData: any = null;
  let currentColormap = 'jet';

  // Mouse controls state
  let isDragging = false;
  let previousMousePosition = { x: 0, y: 0 };
  let cameraOffset = {
    theta: Math.PI / 4,
    phi: Math.PI / 3,
    radius: 3
  };

  onMount(() => {
    setTimeout(() => {
      if (canvas) {
        initThree();
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
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x2a2a2a);

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    // Camera with Z-up orientation
    camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.up.set(0, 0, 1);
    camera.position.set(2, 2, 3);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(width, height);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight1.position.set(5, 5, 5);
    scene.add(directionalLight1);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.3);
    directionalLight2.position.set(-5, -5, -5);
    scene.add(directionalLight2);

    setupControls();
    window.addEventListener('resize', onWindowResize);
    animate();
  }

  function setupControls() {
    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mouseup', onMouseUp);
    renderer.domElement.addEventListener('mouseleave', () => {
      isDragging = false;
    });
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

    cameraOffset.theta += deltaX * 0.01;
    cameraOffset.phi += deltaY * 0.01;
    cameraOffset.phi = Math.max(0.1, Math.min(Math.PI - 0.1, cameraOffset.phi));

    updateCameraPosition();

    previousMousePosition = { x: e.clientX, y: e.clientY };
  }

  function onMouseUp() {
    isDragging = false;
  }

  function onWheel(e: WheelEvent) {
    e.preventDefault();
    cameraOffset.radius += e.deltaY > 0 ? 0.01 : -0.01;
    cameraOffset.radius = Math.max(1, Math.min(30, cameraOffset.radius));
    updateCameraPosition();
  }

  function updateCameraPosition() {
    camera.position.x =
      cameraOffset.radius * Math.sin(cameraOffset.phi) * Math.cos(cameraOffset.theta);
    camera.position.y =
      cameraOffset.radius * Math.sin(cameraOffset.phi) * Math.sin(cameraOffset.theta);
    camera.position.z = cameraOffset.radius * Math.cos(cameraOffset.phi);
    camera.lookAt(0, 0, 0);
  }

  function onWindowResize() {
    if (!canvas || !camera || !renderer) return;

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

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

  function getColormap(name: string): (t: number) => THREE.Color {
    const colormaps: { [key: string]: (t: number) => THREE.Color } = {
      jet: (t: number) => {
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
      },
      viridis: (t: number) => {
        const colors = [
          [0.267, 0.005, 0.329],
          [0.282, 0.141, 0.458],
          [0.254, 0.265, 0.53],
          [0.207, 0.372, 0.553],
          [0.164, 0.471, 0.558],
          [0.128, 0.567, 0.551],
          [0.135, 0.659, 0.518],
          [0.267, 0.749, 0.441],
          [0.478, 0.821, 0.318],
          [0.741, 0.873, 0.15],
          [0.993, 0.906, 0.144]
        ];
        const idx = t * (colors.length - 1);
        const i1 = Math.floor(idx);
        const i2 = Math.min(i1 + 1, colors.length - 1);
        const f = idx - i1;
        const c1 = colors[i1];
        const c2 = colors[i2];
        return new THREE.Color(
          c1[0] + f * (c2[0] - c1[0]),
          c1[1] + f * (c2[1] - c1[1]),
          c1[2] + f * (c2[2] - c1[2])
        );
      },
      plasma: (t: number) => {
        const r = 0.05 + 0.9 * Math.pow(t, 0.5);
        const g = 0.1 + 0.8 * Math.pow(t, 2);
        const b = 0.8 - 0.7 * t;
        return new THREE.Color(r, g, b);
      },
      cool: (t: number) => {
        return new THREE.Color(t, 1 - t, 1);
      }
    };

    return colormaps[name] || colormaps['jet'];
  }

  function updateColorbar(minVal: number, maxVal: number) {
    if (!colorbarCanvas) return;

    const ctx = colorbarCanvas.getContext('2d');
    if (!ctx) return;

    const width = colorbarCanvas.width;
    const height = colorbarCanvas.height;

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    const colorFunc = getColormap(currentColormap);

    for (let i = 0; i < 20; i++) {
      const t = i / 20;
      const color = colorFunc(1 - t);
      gradient.addColorStop(
        t,
        `rgb(${Math.round(color.r * 255)},${Math.round(color.g * 255)},${Math.round(color.b * 255)})`
      );
    }

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  function createMeshFromData(mrstData: any) {
    if (!scene || !mrstData) return;

    // Remove old meshes
    if (mesh) {
      scene.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    if (edgesMesh) {
      scene.remove(edgesMesh);
      edgesMesh.geometry.dispose();
      (edgesMesh.material as THREE.Material).dispose();
    }

    try {
      const geometry = new THREE.BufferGeometry();
      const edgesGeometry = new THREE.BufferGeometry();
      const allVertices: number[] = [];
      const allColors: number[] = [];
      const allIndices: number[] = [];
      const edgeVertices: number[] = [];

      const cellPressures = mrstData.solution.pressureBar;
      const minPressure = Math.min(...cellPressures);
      const maxPressure = Math.max(...cellPressures);

      const colorFunc = getColormap(currentColormap);

      // Build 3D cells
      let vertexOffset = 0;

      for (let cellIdx = 0; cellIdx < mrstData.grid.cells.num; cellIdx++) {
        const cellFaceStartPos = mrstData.grid.cells.facePos[cellIdx] - 1;
        const cellFaceEndPos = mrstData.grid.cells.facePos[cellIdx + 1] - 1;
        const cellFaceIndices = [];

        for (let i = cellFaceStartPos; i < cellFaceEndPos; i++) {
          cellFaceIndices.push(mrstData.grid.cells.faces[i][0] - 1);
        }

        const cellPressure = cellPressures[cellIdx];
        const t = (cellPressure - minPressure) / (maxPressure - minPressure);
        const color = colorFunc(t);

        // Get unique vertices for this cell
        const cellVerticesSet = new Set<number>();

        for (let faceIdx of cellFaceIndices) {
          const faceStartPos = mrstData.grid.faces.nodePos[faceIdx] - 1;
          const faceEndPos = mrstData.grid.faces.nodePos[faceIdx + 1] - 1;
          const faceNodes = mrstData.grid.faces.nodes.slice(faceStartPos, faceEndPos);

          for (let nodeIdx of faceNodes) {
            cellVerticesSet.add(nodeIdx - 1);
          }
        }

        const cellVertices = Array.from(cellVerticesSet);
        const vertexIndexMap: { [key: number]: number } = {};

        // Add cell vertices
        for (let i = 0; i < cellVertices.length; i++) {
          const nodeIdx = cellVertices[i];
          const coord = mrstData.grid.vertices[nodeIdx];
          vertexIndexMap[nodeIdx] = vertexOffset + i;
          allVertices.push(coord[0], coord[1], coord[2]);
          allColors.push(color.r, color.g, color.b);
        }

        // Add faces (triangulated)
        for (let faceIdx of cellFaceIndices) {
          const faceStartPos = mrstData.grid.faces.nodePos[faceIdx] - 1;
          const faceEndPos = mrstData.grid.faces.nodePos[faceIdx + 1] - 1;
          const faceNodes = mrstData.grid.faces.nodes.slice(faceStartPos, faceEndPos);
          const faceVertexIndices = faceNodes.map((n: number) => vertexIndexMap[n - 1]);

          // Triangulate face
          for (let i = 1; i < faceVertexIndices.length - 1; i++) {
            allIndices.push(
              faceVertexIndices[0],
              faceVertexIndices[i],
              faceVertexIndices[i + 1]
            );
          }

          // Add edges
          for (let i = 0; i < faceVertexIndices.length; i++) {
            const v1Idx = faceVertexIndices[i];
            const v2Idx = faceVertexIndices[(i + 1) % faceVertexIndices.length];
            const v1 = mrstData.grid.vertices[cellVertices[v1Idx - vertexOffset]];
            const v2 = mrstData.grid.vertices[cellVertices[v2Idx - vertexOffset]];
            edgeVertices.push(v1[0], v1[1], v1[2], v2[0], v2[1], v2[2]);
          }
        }

        vertexOffset += cellVertices.length;
      }

      // Create mesh geometry
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(allVertices), 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(allColors), 3));
      geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(allIndices), 1));
      geometry.computeVertexNormals();

      const material = new THREE.MeshPhongMaterial({
        vertexColors: true,
        side: THREE.DoubleSide,
        flatShading: true,
        shininess: 30
      });

      mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);

      // Create edges
      edgesGeometry.setAttribute(
        'position',
        new THREE.BufferAttribute(new Float32Array(edgeVertices), 3)
      );
      const edgesMaterial = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 1 });

      if (showEdgesCheckbox && showEdgesCheckbox.checked) {
        edgesMesh = new THREE.LineSegments(edgesGeometry, edgesMaterial);
        scene.add(edgesMesh);
      }

      // Center geometry
      geometry.computeBoundingBox();
      if (geometry.boundingBox) {
        const box = geometry.boundingBox;
        const center = new THREE.Vector3();
        box.getCenter(center);
        mesh.position.sub(center);

        if (edgesMesh) {
          edgesMesh.position.copy(mesh.position);
        }

        // Scale
        const size = new THREE.Vector3();
        box.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);
        const targetSize = 20;
        const scale = targetSize / maxDim;
        mesh.scale.set(scale, scale, scale);

        if (edgesMesh) {
          edgesMesh.scale.set(scale, scale, scale);
        }

        // Camera position
        const fov = (camera.fov * Math.PI) / 180;
        let cameraDistance = Math.abs(targetSize / Math.tan(fov / 2));
        cameraDistance *= 1.8;
        cameraOffset.radius = cameraDistance;
        updateCameraPosition();
      }

      // Update colorbar and stats
      updateColorbar(minPressure, maxPressure);
      applyVisibilitySettings();

      if (statsText) {
        const text = `Grid: ${mrstData.metadata.gridDims.join('x')} | Cells: ${mrstData.grid.cells.num} | Pressure: ${minPressure.toFixed(2)}-${maxPressure.toFixed(2)} bar`;
        statsText.innerText = text;
      }
    } catch (error) {
      console.error('Error creating mesh:', error);
      if (statsText) {
        statsText.innerText = `Error: ${(error as any).message}`;
      }
    }
  }

  function applyVisibilitySettings() {
    const showEdges = showEdgesCheckbox && showEdgesCheckbox.checked;
    if (edgesMesh) {
      edgesMesh.visible = showEdges;
    }
  }

  function handleFileChange(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (loadingEl) loadingEl.style.display = 'block';

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        mrstData = JSON.parse(event.target?.result as string);
        createMeshFromData(mrstData);
      } catch (error) {
        console.error('Error parsing JSON:', error);
        if (statsText) {
          statsText.innerText = `Error parsing JSON: ${(error as any).message}`;
        }
      } finally {
        if (loadingEl) loadingEl.style.display = 'none';
      }
    };
    reader.readAsText(file);
  }

  function handleColormapChange(e: Event) {
    const select = e.target as HTMLSelectElement;
    currentColormap = select.value;
    if (mrstData) {
      createMeshFromData(mrstData);
    }
  }

  function handleEdgesToggle() {
    applyVisibilitySettings();
  }
</script>

<style>
  .container {
    width: 100vw;
    height: 100vh;
    display: flex;
    flex-direction: column;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  }

  .controls {
    background: rgba(255, 255, 255, 0.95);
    padding: 15px 20px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
    display: flex;
    align-items: center;
    gap: 20px;
    flex-wrap: wrap;
  }

  .control-group {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  h2 {
    margin: 0;
    color: #333;
    font-size: 20px;
  }

  label {
    font-weight: 600;
    color: #333;
  }

  input[type='file'],
  select,
  input[type='checkbox'] {
    padding: 8px 12px;
    border: 2px solid #667eea;
    border-radius: 6px;
    background: white;
    cursor: pointer;
    font-size: 14px;
  }

  input[type='checkbox'] {
    width: 20px;
    height: 20px;
    padding: 0;
  }

  .canvas-container {
    flex: 1;
    position: relative;
    width: 100%;
  }

  canvas {
    width: 100%;
    height: 100%;
    display: block;
  }

  #stats {
    background: rgba(255, 255, 255, 0.9);
    padding: 10px 15px;
    border-radius: 8px;
    font-size: 13px;
    color: #333;
  }

  #loading {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(255, 255, 255, 0.95);
    padding: 30px 50px;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    font-size: 18px;
    font-weight: 600;
    color: #667eea;
    z-index: 20;
    display: none;
  }

  #colorbar {
    position: absolute;
    right: 20px;
    top: 20px;
    background: rgba(255, 255, 255, 0.95);
    padding: 15px;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
    z-index: 10;
  }

  .colorbar-gradient {
    width: 30px;
    height: 200px;
    border: 1px solid #333;
    margin-bottom: 10px;
  }

  .colorbar-label {
    font-size: 12px;
    text-align: center;
    margin: 3px 0;
    font-weight: 600;
    color: #333;
  }
</style>

<div class="container">
  <div class="controls">
    <div class="control-group">
      <h2>MRST JSON Visualization</h2>
    </div>

    <div class="control-group">
      <label for="fileInput">Load MRST Data:</label>
      <input
        type="file"
        id="fileInput"
        bind:this={fileInput}
        accept=".json"
        on:change={handleFileChange}
      />
    </div>

    <div class="control-group">
      <label for="colormapSelect">Colormap:</label>
      <select
        id="colormapSelect"
        bind:this={colormapSelect}
        on:change={handleColormapChange}
      >
        <option value="jet">Jet</option>
        <option value="viridis">Viridis</option>
        <option value="plasma">Plasma</option>
        <option value="cool">Cool</option>
      </select>
    </div>

    <div class="control-group">
      <label>
        <input
          type="checkbox"
          bind:this={showEdgesCheckbox}
          checked
          on:change={handleEdgesToggle}
        />
        Show Edges
      </label>
    </div>

    <div id="stats" bind:this={statsText}>Load a JSON file to begin</div>
  </div>

  <div class="canvas-container">
    <canvas bind:this={canvas} />
    <div id="colorbar">
      <canvas bind:this={colorbarCanvas} class="colorbar-gradient" width={30} height={200} />
      <div class="colorbar-label" id="maxLabel">Max</div>
      <div class="colorbar-label">Pressure (bar)</div>
      <div class="colorbar-label" id="minLabel">Min</div>
    </div>
    <div id="loading" bind:this={loadingEl}>Loading...</div>
  </div>
</div>
