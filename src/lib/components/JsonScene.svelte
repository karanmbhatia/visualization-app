<script lang="ts">
  import { T } from '@threlte/core';
  import * as THREE from 'three';
  import { onMount } from 'svelte';

  export let jsonData: any;
  export let colormap = 'jet';
  export let showEdges = true;

  let geometry: THREE.BufferGeometry | null = null;
  let material: THREE.MeshPhongMaterial | null = null;
  let edgesGeometry: THREE.EdgesGeometry | null = null;
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

  function createGeometryFromJson() {
    if (!jsonData?.grid?.vertices || !jsonData?.grid?.faces) {
      console.error('❌ Invalid grid data structure');
      return;
    }

    try {
      // Dispose old geometry
      if (geometry) geometry.dispose();
      if (edgesGeometry) edgesGeometry.dispose();

      geometry = new THREE.BufferGeometry();
      const allVertices: number[] = [];
      const allColors: number[] = [];
      const allIndices: number[] = [];
      const edgeVertices: number[] = [];

      const cellPressures = jsonData.solution?.pressureBar || [];
      const minPressure = Math.min(...cellPressures);
      const maxPressure = Math.max(...cellPressures);
      const pressureRange = maxPressure - minPressure || 1;

      const colorFunc = colormaps[colormap] || colormaps.jet;

      let vertexOffset = 0;

      // Build 3D cells
      for (let cellIdx = 0; cellIdx < jsonData.grid.cells.num; cellIdx++) {
        const cellFaceStartPos = jsonData.grid.cells.facePos[cellIdx] - 1;
        const cellFaceEndPos = jsonData.grid.cells.facePos[cellIdx + 1] - 1;
        const cellFaceIndices = [];

        for (let i = cellFaceStartPos; i < cellFaceEndPos; i++) {
          cellFaceIndices.push(jsonData.grid.cells.faces[i][0] - 1);
        }

        const cellPressure = cellPressures[cellIdx];
        const normalized = (cellPressure - minPressure) / pressureRange;
        const color = colorFunc(normalized);

        // Get unique vertices for this cell
        const cellVerticesSet = new Set<number>();

        for (let faceIdx of cellFaceIndices) {
          const faceStartPos = jsonData.grid.faces.nodePos[faceIdx] - 1;
          const faceEndPos = jsonData.grid.faces.nodePos[faceIdx + 1] - 1;
          const faceNodes = jsonData.grid.faces.nodes.slice(faceStartPos, faceEndPos);

          for (let nodeIdx of faceNodes) {
            cellVerticesSet.add(nodeIdx - 1);
          }
        }

        const cellVertices = Array.from(cellVerticesSet);
        const vertexIndexMap: { [key: number]: number } = {};

        // Add cell vertices with Y-Z swap for vertical orientation
        for (let i = 0; i < cellVertices.length; i++) {
          const nodeIdx = cellVertices[i];
          const coord = jsonData.grid.vertices[nodeIdx];
          vertexIndexMap[nodeIdx] = vertexOffset + i;
          
          // Swap Y and Z to make vertical (Y-up in Three.js)
          allVertices.push(coord[0], coord[2], coord[1]);
          allColors.push(color.r, color.g, color.b);
        }

        // Add faces (triangulated)
        for (let faceIdx of cellFaceIndices) {
          const faceStartPos = jsonData.grid.faces.nodePos[faceIdx] - 1;
          const faceEndPos = jsonData.grid.faces.nodePos[faceIdx + 1] - 1;
          const faceNodes = jsonData.grid.faces.nodes.slice(faceStartPos, faceEndPos);
          const faceVertexIndices = faceNodes.map((n: number) => vertexIndexMap[n - 1]);

          // Triangulate face
          for (let i = 1; i < faceVertexIndices.length - 1; i++) {
            allIndices.push(
              faceVertexIndices[0],
              faceVertexIndices[i],
              faceVertexIndices[i + 1]
            );
          }

          // Add edges with Y-Z swap
          for (let i = 0; i < faceVertexIndices.length; i++) {
            const v1Idx = faceVertexIndices[i];
            const v2Idx = faceVertexIndices[(i + 1) % faceVertexIndices.length];
            const v1 = jsonData.grid.vertices[cellVertices[v1Idx - vertexOffset]];
            const v2 = jsonData.grid.vertices[cellVertices[v2Idx - vertexOffset]];
            
            // Swap Y and Z for edges too
            edgeVertices.push(v1[0], v1[2], v1[1], v2[0], v2[2], v2[1]);
          }
        }

        vertexOffset += cellVertices.length;
      }

      // Set geometry attributes
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
        shininess: 30,
        emissive: 0x000000,
        specular: 0x111111
      });

      // Create edges geometry
      if (edgeVertices.length > 0) {
        edgesGeometry = new THREE.BufferGeometry();
        edgesGeometry.setAttribute(
          'position',
          new THREE.BufferAttribute(new Float32Array(edgeVertices), 3)
        );
      }

      // Center and scale geometry
      if (geometry.boundingBox) {
        const box = geometry.boundingBox;
        const center = new THREE.Vector3();
        box.getCenter(center);
        
        meshPosition = [-center.x, -center.y, -center.z];

        const size = new THREE.Vector3();
        box.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);
        const targetSize = 20;
        const scale = targetSize / maxDim;
        
        meshScale = [scale, scale, scale];
      }

      console.log(`✅ Geometry created: ${allVertices.length / 3} vertices, ${allIndices.length / 3} triangles`);
      console.log(`📊 Pressure range: ${minPressure.toFixed(2)}-${maxPressure.toFixed(2)} bar`);
    } catch (error) {
      console.error('❌ Geometry creation error:', error);
    }
  }

  onMount(() => {
    console.log('📊 JsonScene component mounted');
    createGeometryFromJson();

    return () => {
      if (geometry) geometry.dispose();
      if (material) material.dispose();
      if (edgesGeometry) edgesGeometry.dispose();
      console.log('🧹 JsonScene cleaned up');
    };
  });

  // Reactive update on colormap or data change
  $: if (jsonData || colormap !== undefined) {
    createGeometryFromJson();
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
      <T.LineBasicMaterial color={0x000000} />
    </T.LineSegments>
  {/if}
{:else}
  <!-- Placeholder while loading -->
  <T.Mesh position={[0, 0, 0]}>
    <T.BoxGeometry args={[1, 1, 1]} />
    <T.MeshBasicMaterial color={0x888888} />
  </T.Mesh>
{/if}