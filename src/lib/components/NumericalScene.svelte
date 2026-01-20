<script lang="ts">
  import { T } from '@threlte/core';
  import * as THREE from 'three';
  import { onMount } from 'svelte';

  // Physical constants
  const barsa = 1e5;
  const darcy = 9.869233e-13;
  const centi = 0.01;
  const poise = 0.1;

  // Grid configuration
  const nx = 1;
  const ny = 1;
  const nz = 30;

  const domainX = 1.0;
  const domainY = 1.0;
  const domainZ = 30.0;

  const dx = domainX / nx;
  const dy = domainY / ny;
  const dz = domainZ / nz;

  // Fluid and rock properties
  const perm = 0.1 * darcy;
  const mu = 1 * centi * poise;
  const rho = 1014;
  const bcPressure = 100 * barsa;
  const g = 9.81;

  // Visual parameters
  const cellWidth = 1.0;
  const cellDepth = 1.0;
  const cellHeight = 0.15;

  let meshes: Array<{ geometry: THREE.BoxGeometry; material: THREE.MeshStandardMaterial; position: [number, number, number]; edges?: THREE.EdgesGeometry }> = [];
  let facePressures: number[] = [];
  let mounted = false;

  function solvePressure(): number[] {
    const numCells = nz;
    
    // Simple hydrostatic pressure calculation
    // P = P_top + ρ*g*depth
    const pressure: number[] = [];
    
    for (let k = 0; k < numCells; k++) {
      const depth = k * dz; // depth from top
      const p = bcPressure + rho * g * depth;
      pressure.push(p);
    }

    // Calculate face pressures (average between cells)
    const facePressure: number[] = [bcPressure]; // top face
    
    for (let k = 0; k < numCells - 1; k++) {
      facePressure.push((pressure[k] + pressure[k + 1]) / 2);
    }
    
    // Bottom face pressure
    const bottomDepth = nz * dz;
    facePressure.push(bcPressure + rho * g * bottomDepth);

    console.log(`📊 Pressure calculated:`, {
      top: (facePressure[0] / barsa).toFixed(2),
      bottom: (facePressure[facePressure.length - 1] / barsa).toFixed(2),
      cells: numCells
    });

    return facePressure.map((p) => p / barsa); // Convert to bar
  }

  function getJetColor(value: number, min: number, max: number): THREE.Color {
    const t = Math.max(0, Math.min(1, (value - min) / (max - min)));
    let r = 0, g = 0, b = 0;

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

  function createVisualization() {
    if (!mounted) return;

    facePressures = solvePressure();
    const minP = Math.min(...facePressures);
    const maxP = Math.max(...facePressures);

    console.log(`📊 Pressure range: ${minP.toFixed(2)}-${maxP.toFixed(2)} bar`);

    meshes = [];

    // Create each cell as a box
    for (let k = 0; k < nz; k++) {
      const topFaceP = facePressures[k];
      const bottomFaceP = facePressures[k + 1];
      const cellP = (topFaceP + bottomFaceP) / 2;

      const color = getJetColor(cellP, minP, maxP);

      // Position along Y-axis (vertical)
      const y = -k * cellHeight;

      const geometry = new THREE.BoxGeometry(cellWidth, cellHeight, cellDepth);
      const material = new THREE.MeshStandardMaterial({
        color: color,
        metalness: 0.3,
        roughness: 0.6
      });

      const edges = new THREE.EdgesGeometry(geometry);

      meshes.push({
        geometry,
        material,
        position: [0, y - cellHeight / 2, 0],
        edges
      });
    }

    console.log(`✅ Created ${meshes.length} cells with pressure range: ${minP.toFixed(2)}-${maxP.toFixed(2)} bar`);
  }

  // Export min and max pressures for colorbar
  export function getPressureRange() {
    if (facePressures.length === 0) return { min: 100.0, max: 102.5 };
    return {
      min: Math.min(...facePressures),
      max: Math.max(...facePressures)
    };
  }

  onMount(() => {
    console.log('📊 NumericalScene component mounted');
    mounted = true;
    createVisualization();

    return () => {
      mounted = false;
      meshes.forEach(m => {
        m.geometry.dispose();
        m.material.dispose();
        if (m.edges) m.edges.dispose();
      });
      meshes = [];
      console.log('🧹 NumericalScene cleaned up');
    };
  });
</script>

{#if mounted && meshes.length > 0}
  {#each meshes as mesh, i (i)}
    <T.Mesh geometry={mesh.geometry} material={mesh.material} position={mesh.position} />
    
    {#if mesh.edges}
      <T.LineSegments geometry={mesh.edges} position={mesh.position}>
        <T.LineBasicMaterial color={0x000000} />
      </T.LineSegments>
    {/if}
  {/each}
{/if}
