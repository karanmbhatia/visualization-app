<script lang="ts">
  import { T } from '@threlte/core';
  import * as THREE from 'three';

  export let wasmModule: any = null;
  export let delaunay: any = null;
  export let showSolid = true;
  export let showWireframe = true;
  export let regenerateTrigger: number = 0;

  let geometry: THREE.BufferGeometry | null = null;
  let solidMaterial: THREE.MeshPhongMaterial | null = null;
  let edgesGeometry: THREE.EdgesGeometry | null = null;
  let meshPosition: [number, number, number] = [0, 0, 0];
  let meshScale: [number, number, number] = [1, 1, 1];
  
  export let vertexCount = 0;
  export let tetrahedraCount = 0;

  function createDelaunayGeometry() {
    if (!wasmModule || !delaunay) {
      console.warn('WASM module or delaunay object not ready');
      return;
    }

    try {
      console.log('🔨 Creating Delaunay tessellation using WASM...');
      
      // Dispose old geometry
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

      // Generate grid using WASM (same as index.html)
      // Parameters: nx, ny, nz (grid dimensions)
      delaunay.generateGrid(7, 5, 3);

      // Get vertices and tetrahedra from WASM
      const vertices = delaunay.getVertices();
      const tetraIndices = delaunay.getTetrahedra();

      console.log(`📊 Vertices: ${vertices.length / 3}`);
      console.log(`📊 Tetrahedra: ${tetraIndices.length / 4}`);

      // Update counts for display
      vertexCount = vertices.length / 3;
      tetrahedraCount = tetraIndices.length / 4;

      // Create BufferGeometry
      geometry = new THREE.BufferGeometry();
      
      // Set positions from WASM vertices
      const positions = new Float32Array(vertices.length);
      for (let i = 0; i < vertices.length; i++) {
        positions[i] = vertices[i];
      }
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      // Create triangular faces from tetrahedra
      // Each tetrahedron (4 vertices) creates 4 triangular faces
      const indices: number[] = [];
      for (let i = 0; i < tetraIndices.length; i += 4) {
        const v0 = tetraIndices[i];
        const v1 = tetraIndices[i + 1];
        const v2 = tetraIndices[i + 2];
        const v3 = tetraIndices[i + 3];

        // Four triangular faces per tetrahedron
        indices.push(v0, v1, v2);
        indices.push(v0, v1, v3);
        indices.push(v0, v2, v3);
        indices.push(v1, v2, v3);
      }

      geometry.setIndex(indices);
      geometry.computeVertexNormals();
      geometry.computeBoundingBox();

      console.log(`✅ Created geometry with ${indices.length / 3} triangles`);

      // Create material (light gray solid)
      solidMaterial = new THREE.MeshPhongMaterial({
        color: 0xcccccc,
        side: THREE.DoubleSide,
        flatShading: false,
        shininess: 30,
        transparent: true,
        opacity: 0.6,
        polygonOffset: true,
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 1
      });

      // Create edges geometry
      edgesGeometry = new THREE.EdgesGeometry(geometry, 1);

      // Center and scale geometry
      if (geometry.boundingBox) {
        const box = geometry.boundingBox;
        const center = new THREE.Vector3();
        box.getCenter(center);
        
        meshPosition = [-center.x, -center.y, -center.z];

        const size = new THREE.Vector3();
        box.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);
        const targetSize = 15;
        const scale = targetSize / maxDim;
        
        meshScale = [scale, scale, scale];
      }

      console.log('✅ Delaunay geometry created successfully from WASM');
    } catch (error) {
      console.error('❌ Geometry creation error:', error);
      console.error('Error stack:', error.stack);
    }
  }

  // Reactive: regenerate when trigger changes
  $: if (wasmModule && delaunay && regenerateTrigger !== undefined) {
    createDelaunayGeometry();
  }
</script>

{#if geometry && solidMaterial}
  <!-- Solid mesh -->
  {#if showSolid}
    <T.Mesh 
      {geometry} 
      material={solidMaterial}
      position={meshPosition}
      scale={meshScale}
    />
  {/if}
  
  <!-- Wireframe edges -->
  {#if showWireframe && edgesGeometry}
    <T.LineSegments 
      geometry={edgesGeometry}
      position={meshPosition}
      scale={meshScale}
    >
      <T.LineBasicMaterial color={0x000000} linewidth={1} />
    </T.LineSegments>
  {/if}
{/if}