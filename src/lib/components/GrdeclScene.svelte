<script lang="ts">
  import { T } from '@threlte/core';
  import * as THREE from 'three';
  import type { GrdeclData } from '$lib/utils/grdeclParser';

  export let grdeclData: GrdeclData | null;
  export let colormap = 'jet';
  export let showEdges = true;

  let geometry: THREE.BufferGeometry | null = null;
  let material: THREE.MeshPhongMaterial | null = null;
  let edgesGeometry: THREE.BufferGeometry | null = null;
  let meshPosition: [number, number, number] = [0, 0, 0];
  let meshScale: [number, number, number] = [1, 1, 1];

  // Colormap functions
  const colormaps: Record<string, (v: number) => THREE.Color> = {
    jet: (v: number) => {
      const color = new THREE.Color();
      let r = 0, g = 0, b = 0;
      
      if (v < 0.125) {
        r = 0;
        g = 0;
        b = 0.5 + (0.5 * v) / 0.125;
      } else if (v < 0.375) {
        r = 0;
        g = (v - 0.125) / 0.25;
        b = 1;
      } else if (v < 0.625) {
        r = (v - 0.375) / 0.25;
        g = 1;
        b = 1 - (v - 0.375) / 0.25;
      } else if (v < 0.875) {
        r = 1;
        g = 1 - (v - 0.625) / 0.25;
        b = 0;
      } else {
        r = 1 - (0.5 * (v - 0.875)) / 0.125;
        g = 0;
        b = 0;
      }
      
      color.setRGB(r, g, b);
      return color;
    },
    viridis: (v: number) => {
      const color = new THREE.Color();
      color.setHSL(0.25 - v * 0.25, 0.8 - v * 0.3, 0.2 + v * 0.6);
      return color;
    },
    plasma: (v: number) => {
      const color = new THREE.Color();
      color.setHSL(0.9 - v * 0.9, 0.9, 0.4 + v * 0.2);
      return color;
    },
    cool: (v: number) => {
      const color = new THREE.Color();
      color.setRGB(v, 1 - v, 1);
      return color;
    }
  };

  /**
   * Create Three.js geometry from GRDECL data
   */
  function createGeometryFromGrdecl() {
    if (!grdeclData?.cells?.cellVertices) {
      console.error('❌ Invalid GRDECL data structure');
      return;
    }

    try {
      // Dispose old geometry
      if (geometry) {
        geometry.dispose();
        geometry = null;
      }
      if (edgesGeometry) {
        edgesGeometry.dispose();
        edgesGeometry = null;
      }
      if (material) {
        material.dispose();
        material = null;
      }

      const allVertices: number[] = [];
      const allColors: number[] = [];
      const allIndices: number[] = [];
      const edgeVertices: number[] = [];

      const colorFunc = colormaps[colormap] || colormaps.jet;
      const { nx, ny, nz } = grdeclData.specgrid;
      const totalCells = nx * ny * nz;

      let vertexOffset = 0;
      let activeCellIndex = 0;

      // Process each cell
      for (let k = 0; k < nz; k++) {
        for (let j = 0; j < ny; j++) {
          for (let i = 0; i < nx; i++) {
            const cellIdx = i + j * nx + k * nx * ny;
            const cellVerts = grdeclData.cells.cellVertices[cellIdx];

            // Skip inactive cells
            if (!cellVerts || cellVerts.length === 0) {
              continue;
            }

            // Color by layer (K-index) for layer visualization
            const normalized = k / Math.max(nz - 1, 1);
            const color = colorFunc(normalized);

            // Add vertices with Y-Z swap for vertical orientation
            for (let v = 0; v < 8; v++) {
              const [x, y, z] = cellVerts[v];
              allVertices.push(x, z, y); // Swap Y and Z
              allColors.push(color.r, color.g, color.b);
            }

            // Define faces for hexahedral cell (6 faces, 2 triangles each)
            // Face indices based on corner ordering:
            //     7----6
            //    /|   /|
            //   4----5 |
            //   | 3--|-2
            //   |/   |/
            //   0----1

            const v0 = vertexOffset;
            
            // Bottom face (0-1-2-3)
            allIndices.push(v0 + 0, v0 + 1, v0 + 2);
            allIndices.push(v0 + 0, v0 + 2, v0 + 3);
            
            // Top face (4-5-6-7)
            allIndices.push(v0 + 4, v0 + 6, v0 + 5);
            allIndices.push(v0 + 4, v0 + 7, v0 + 6);
            
            // Front face (0-1-5-4)
            allIndices.push(v0 + 0, v0 + 5, v0 + 1);
            allIndices.push(v0 + 0, v0 + 4, v0 + 5);
            
            // Right face (1-2-6-5)
            allIndices.push(v0 + 1, v0 + 6, v0 + 2);
            allIndices.push(v0 + 1, v0 + 5, v0 + 6);
            
            // Back face (2-3-7-6)
            allIndices.push(v0 + 2, v0 + 7, v0 + 3);
            allIndices.push(v0 + 2, v0 + 6, v0 + 7);
            
            // Left face (3-0-4-7)
            allIndices.push(v0 + 3, v0 + 4, v0 + 0);
            allIndices.push(v0 + 3, v0 + 7, v0 + 4);

            // Add edges (12 edges for a hexahedral cell)
            const edges = [
              [0, 1], [1, 2], [2, 3], [3, 0], // Bottom face
              [4, 5], [5, 6], [6, 7], [7, 4], // Top face
              [0, 4], [1, 5], [2, 6], [3, 7]  // Vertical edges
            ];

            for (const [e1, e2] of edges) {
              const [x1, y1, z1] = cellVerts[e1];
              const [x2, y2, z2] = cellVerts[e2];
              // Swap Y and Z for edges too
              edgeVertices.push(x1, z1, y1, x2, z2, y2);
            }

            vertexOffset += 8;
            activeCellIndex++;
          }
        }
      }

      // Create geometry
      geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(allVertices), 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(allColors), 3));
      geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(allIndices), 1));
      geometry.computeVertexNormals();
      geometry.computeBoundingBox();

      // Create material
      material = new THREE.MeshPhongMaterial({
        vertexColors: true,
        side: THREE.DoubleSide,
        flatShading: false,
        shininess: 60,
        emissive: 0x111111,
        specular: 0x444444
      });

      // Create edges geometry
      if (edgeVertices.length > 0) {
        edgesGeometry = new THREE.BufferGeometry();
        edgesGeometry.setAttribute(
          'position',
          new THREE.BufferAttribute(new Float32Array(edgeVertices), 3)
        );
        // Center edges geometry to match the main geometry
        edgesGeometry.center();
      }

      // Center and scale geometry
      geometry.computeBoundingBox();
      
      if (geometry.boundingBox) {
        const box = geometry.boundingBox;
        const size = new THREE.Vector3();
        box.getSize(size);
        
        console.log('📦 Bounding Box before centering:', {
          min: { x: box.min.x, y: box.min.y, z: box.min.z },
          max: { x: box.max.x, y: box.max.y, z: box.max.z },
          size: { x: size.x, y: size.y, z: size.z }
        });
        
        // Use Three.js built-in centering
        geometry.center();
        
        // Recompute bounding box after centering
        geometry.computeBoundingBox();
        
        const maxDim = Math.max(size.x, size.y, size.z);
        const targetSize = 15;
        const scale = targetSize / maxDim;
        
        meshScale = [scale, scale, scale];
        meshPosition = [0, 0, 0]; // Already centered by geometry.center()
        
        console.log('📐 Positioning:', {
          meshPosition,
          meshScale,
          maxDim,
          targetSize
        });
      }

      console.log(`✅ GRDECL Geometry created: ${activeCellIndex} active cells`);
      console.log(`   Grid dimensions: ${nx} × ${ny} × ${nz}`);
      console.log(`   Vertices: ${allVertices.length / 3}, Triangles: ${allIndices.length / 3}`);
    } catch (error) {
      console.error('❌ Geometry creation error:', error);
    }
  }

  // Reactive updates
  $: if (grdeclData) {
    createGeometryFromGrdecl();
  }
  
  $: if (colormap && grdeclData) {
    createGeometryFromGrdecl();
  }
</script>

{#if geometry && material}
  <T.Mesh 
    {geometry} 
    {material} 
    position={meshPosition}
    scale={meshScale}
  />
  
  {#if showEdges && edgesGeometry}
    <T.LineSegments 
      geometry={edgesGeometry}
      position={meshPosition}
      scale={meshScale}
    >
      <T.LineBasicMaterial color={0x000000} linewidth={1} />
    </T.LineSegments>
  {/if}
{/if}