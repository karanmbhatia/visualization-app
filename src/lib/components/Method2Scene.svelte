<script lang="ts">
  import { T } from '@threlte/core';
  import * as THREE from 'three';
  import { onMount, onDestroy } from 'svelte';

  export let wasmModule: any = null;
  export let grid: any = null;
  export let regenerateTrigger: number = 0;
  export let showEdges = true;

  let geometry: THREE.BufferGeometry | null = null;
  let solidMaterial: THREE.MeshPhongMaterial | null = null;
  let edgesGeometry: THREE.EdgesGeometry | null = null;
  let meshPosition: [number, number, number] = [0, 0, 0];
  let meshScale: [number, number, number] = [1, 1, 1];
  let meshRotation: [number, number, number] = [0, 0, 0];
  let mounted = false;
  let colorbarCanvas: HTMLCanvasElement | null = null;
  
  export let cellCount = 0;
  export let gridSize = { nx: 50, ny: 30, nz: 10 };

  onMount(() => {
    const container = document.getElementById('colorbar-container');
    if (!container) return;


    const canvas = createColorbar();
    container.appendChild(canvas);
  });

  // Colorbar dimensions - HORIZONTAL orientation
    const COLORBAR_WIDTH = 400;
    const COLORBAR_HEIGHT = 25;
    const COLORBAR_PADDING = 20; // Reduced padding for compact layout

  function cleanup() {
    if (geometry) {
      geometry.dispose();
      geometry = null;
    }
    if (edgesGeometry) {
      edgesGeometry.dispose();
      edgesGeometry = null;
    }
    if (solidMaterial) {
      solidMaterial.dispose();
      solidMaterial = null;
    }
  }

  // Color mapping function
  function getColorForCell(log10Perm: number): THREE.Color {
    const min = Math.log10(25);
    const max = Math.log10(800);
    const normalized = (log10Perm - min) / (max - min);
    const clamped = Math.max(0, Math.min(1, normalized));
    
    // Color gradient: blue -> cyan -> green -> yellow -> orange -> red
    if (clamped < 0.2) {
      const t = clamped / 0.2;
      return new THREE.Color(0, t, 1);
    } else if (clamped < 0.4) {
      const t = (clamped - 0.2) / 0.2;
      return new THREE.Color(0, 1, 1 - t);
    } else if (clamped < 0.6) {
      const t = (clamped - 0.4) / 0.2;
      return new THREE.Color(t, 1, 0);
    } else if (clamped < 0.8) {
      const t = (clamped - 0.6) / 0.2;
      return new THREE.Color(1, 1 - 0.5 * t, 0);
    } else {
      const t = (clamped - 0.8) / 0.2;
      return new THREE.Color(1, 0.5 * (1 - t), 0);
    }
  }

  // Create HORIZONTAL colorbar canvas with proper labels
  function createColorbar(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = COLORBAR_WIDTH + COLORBAR_PADDING * 2;
    canvas.height = COLORBAR_HEIGHT + 40; // Reduced space for labels
    
    const ctx = canvas.getContext('2d')!;
    
    // Set background to transparent
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw color gradient (horizontal, from left to right = blue to red)
    for (let i = 0; i < COLORBAR_WIDTH; i++) {
      const normalized = i / COLORBAR_WIDTH; // left = 0 (blue), right = 1 (red)
      const color = getColorForCell(
        Math.log10(25) + normalized * (Math.log10(800) - Math.log10(25))
      );
      
      ctx.fillStyle = `rgb(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)})`;
      ctx.fillRect(COLORBAR_PADDING + i, 0, 1, COLORBAR_HEIGHT);
    }
    
    // Draw border around colorbar
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(COLORBAR_PADDING - 1, -1, COLORBAR_WIDTH + 2, COLORBAR_HEIGHT + 2);
    
    // Draw text labels
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    
    // Min value (25 md) at left
    ctx.fillText('25', COLORBAR_PADDING, COLORBAR_HEIGHT + 10);
    ctx.fillText('md', COLORBAR_PADDING, COLORBAR_HEIGHT + 28);
    
    // Max value (800 md) at right
    ctx.fillText('800', COLORBAR_PADDING + COLORBAR_WIDTH, COLORBAR_HEIGHT + 10);
    ctx.fillText('md', COLORBAR_PADDING + COLORBAR_WIDTH, COLORBAR_HEIGHT + 28);
    
    // Optional: Add middle tick marks for reference
    const midPoint = COLORBAR_PADDING + COLORBAR_WIDTH / 2;
    const midValue = Math.sqrt(25 * 800).toFixed(0); // Geometric mean for log scale
    ctx.font = 'bold 14px Arial';
    ctx.fillText(midValue, midPoint, COLORBAR_HEIGHT + 10);
    ctx.fillText('md', midPoint, COLORBAR_HEIGHT + 28);
    
    return canvas;
  }

  function createStratigraphicGrid() {
    if (!wasmModule || !grid || !mounted) {
      console.warn('⚠️ WASM module or grid object not ready');
      return;
    }

    try {
      console.log('🔨 Creating stratigraphic grid using WASM...');
      
      cleanup();

      // Generate grid data
      grid.generateGrid(gridSize.nx, gridSize.ny, gridSize.nz, 0.12);
      const numCells = grid.getNumCells();
      const log10Perm = grid.getLog10Permeability();

      console.log(`📊 Number of cells: ${numCells}`);
      cellCount = numCells;

      if (numCells === 0) {
        console.error('❌ No cells generated!');
        return;
      }

      // Create combined geometry for all cells
      const allPositions: number[] = [];
      const allIndices: number[] = [];
      const allColors: number[] = [];
      let vertexOffset = 0;

      // Track bounds for centering
      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;
      let minZ = Infinity, maxZ = -Infinity;

      // Build geometry from all cells
      for (let cellIdx = 0; cellIdx < numCells; cellIdx++) {
        const vertices = grid.getCellVertices(cellIdx);
        const color = getColorForCell(log10Perm[cellIdx]);

        // Add vertices (8 vertices per hexahedron)
        for (let i = 0; i < 24; i += 3) {
          const x = vertices[i];
          const y = vertices[i + 1];
          const z = vertices[i + 2];
          
          allPositions.push(x, y, z);
          allColors.push(color.r, color.g, color.b);

          minX = Math.min(minX, x); maxX = Math.max(maxX, x);
          minY = Math.min(minY, y); maxY = Math.max(maxY, y);
          minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
        }

        // Add indices for 6 faces of hexahedron
        const v = vertexOffset;
        const faces = [
          [v+0, v+1, v+2], [v+0, v+2, v+3], // Bottom
          [v+4, v+6, v+5], [v+4, v+7, v+6], // Top
          [v+0, v+4, v+5], [v+0, v+5, v+1], // Front
          [v+2, v+6, v+7], [v+2, v+7, v+3], // Back
          [v+0, v+3, v+7], [v+0, v+7, v+4], // Left
          [v+1, v+5, v+6], [v+1, v+6, v+2]  // Right
        ];

        faces.forEach(face => {
          allIndices.push(...face);
        });

        vertexOffset += 8;
      }

      console.log(`📐 Grid bounds: X[${minX.toFixed(2)}, ${maxX.toFixed(2)}] Y[${minY.toFixed(2)}, ${maxY.toFixed(2)}] Z[${minZ.toFixed(2)}, ${maxZ.toFixed(2)}]`);

      // Create BufferGeometry
      geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(allPositions, 3));
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(allColors, 3));
      geometry.setIndex(allIndices);
      geometry.computeVertexNormals();
      geometry.computeBoundingBox();

      console.log(`✅ Created geometry with ${allIndices.length / 3} triangles`);

      // Create material
      solidMaterial = new THREE.MeshPhongMaterial({
        vertexColors: true,
        side: THREE.DoubleSide,
        flatShading: false,
        shininess: 30,
        polygonOffset: true,
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 1
      });

      // Create edges geometry
      if (showEdges) {
        edgesGeometry = new THREE.EdgesGeometry(geometry, 15);
        console.log('📏 Edges geometry created');
      }

      // CRITICAL FIX: Make the grid HORIZONTAL (lying flat on XY plane)
      // The grid is currently oriented vertically, so we need to rotate it 90 degrees
      // to make it horizontal, lying on top of the ground grid
      if (geometry.boundingBox) {
        const box = geometry.boundingBox;
        const center = new THREE.Vector3();
        box.getCenter(center);
        
        // Center the mesh
        meshPosition = [-center.x, -center.y, -center.z];

        // Scale the mesh
        const size = new THREE.Vector3();
        box.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);
        const targetSize = 40;
        const scale = targetSize / maxDim;
        
        meshScale = [scale, scale, scale];

        // ROTATE 90 degrees around X axis to make horizontal
        // This transforms the vertical Z-oriented grid into a horizontal XY-oriented grid
        // Then lift it up slightly above the ground grid (Y offset)
        meshRotation = [-Math.PI / 2, 0, 0]; // 90 degrees around X axis
        
        // After rotation, adjust Y position to place it on top of the grid
        // The mesh will now be horizontal, so we need to lift it in Y
        const thickness = size.z * scale; // After rotation, Z becomes thickness
        meshPosition = [0, 2, 0]; // Lifted 1 unit above grid

        console.log(`📍 Centered at (${center.x.toFixed(2)}, ${center.y.toFixed(2)}, ${center.z.toFixed(2)})`);
        console.log(`📏 Scale: ${scale.toFixed(4)}`);
        console.log(`🔄 Rotation: 90° around X axis for horizontal orientation`);
        console.log(`📐 Position adjusted for top placement: Y offset = ${(thickness / 2 + 1).toFixed(2)}`);
      }

      console.log('✅ Stratigraphic grid created successfully from WASM');
    } catch (error) {
      console.error('❌ Grid creation error:', error);
      console.error('Error stack:', error.stack);
    }
  }

  onMount(() => {
    console.log('📊 Method2Scene component mounted');
    mounted = true;
    
    // Create colorbar
    colorbarCanvas = createColorbar();
    
    setTimeout(() => {
      if (wasmModule && grid) {
        createStratigraphicGrid();
      }
    }, 200);
  });

  onDestroy(() => {
    console.log('🧹 Method2Scene cleanup starting...');
    mounted = false;
    cleanup();
    console.log('✅ Method2Scene cleaned up');
  });

  let previousTrigger = 0;
  $: if (wasmModule && grid && mounted && regenerateTrigger !== previousTrigger) {
    console.log('🔄 Regenerate trigger:', regenerateTrigger);
    previousTrigger = regenerateTrigger;
    createStratigraphicGrid();
  }
</script>

<!-- HORIZONTAL colorbar positioned at the bottom center -->
<div class="colorbar-container">
  {#if colorbarCanvas}
    <img 
      src={colorbarCanvas.toDataURL()} 
      alt="Permeability colorbar (25-800 md)"
      class="colorbar-image"
    />
  {/if}
</div>

<!-- 3D Scene -->
{#if geometry && solidMaterial}
  <!-- Solid mesh with rotation applied -->
  <T.Mesh 
    {geometry} 
    material={solidMaterial}
    position={meshPosition}
    scale={meshScale}
    rotation={meshRotation}
  />
  
  <!-- Wireframe edges with rotation applied -->
  {#if showEdges && edgesGeometry}
    <T.LineSegments 
      geometry={edgesGeometry}
      position={meshPosition}
      scale={meshScale}
      rotation={meshRotation}
    >
      <T.LineBasicMaterial color={0x000000} linewidth={1} />
    </T.LineSegments>
  {/if}
{/if}

<style>
  .colorbar-container {
    position: absolute;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    pointer-events: none;
    z-index: 10;
  }

  .colorbar-image {
    width: auto;
    height: auto;
    image-rendering: crisp-edges;
    filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.3));
  }
</style>