<script lang="ts">
  import { Canvas } from '@threlte/core';
  import { T } from '@threlte/core';
  import { OrbitControls } from '@threlte/extras';
  import { onMount } from 'svelte';

  export let showGrid = true;
  export let showAxes = true;
  export let cameraPosition = { x: 30, y: 30, z: 30 };
  export let enableDamping = true;
  export let resetTrigger: any = null;
  export let backgroundColor = '#1a1a1a';
  export let minDistance = 0.1;
  export let maxDistance = 1000;

  let camera: any;
  let controls: any;
  let mounted = false;

  const initialPosition = { ...cameraPosition };

  onMount(() => {
    mounted = true;
  });

  // Watch for reset trigger
  $: if (resetTrigger && camera && controls && mounted) {
    resetCamera();
  }

  function resetCamera() {
    if (camera && controls) {
      camera.position.set(initialPosition.x, initialPosition.y, initialPosition.z);
      camera.lookAt(0, 0, 0);
      controls.target.set(0, 0, 0);
      controls.update();
      console.log('🔄 Camera reset to initial position');
    }
  }
</script>

{#if mounted}
  <div class="threlte-container">
    <Canvas background={backgroundColor}>
      <T.PerspectiveCamera
        makeDefault
        bind:ref={camera}
        position={[cameraPosition.x, cameraPosition.y, cameraPosition.z]}
        fov={75}
      >
        <OrbitControls 
          bind:ref={controls}
          {enableDamping} 
          dampingFactor={0.05}
          enableZoom={true}
          enablePan={true}
          {minDistance}
          {maxDistance}
        />
      </T.PerspectiveCamera>

      <!-- Lighting -->
      <T.AmbientLight intensity={0.6} />
      <T.DirectionalLight position={[10, 20, 10]} intensity={0.8} castShadow />
      <T.PointLight position={[-10, 10, -10]} intensity={0.3} />

      <!-- Grid Helper -->
      {#if showGrid}
        <T.GridHelper args={[20, 20, 0x888888, 0xcccccc]} />
      {/if}

      <!-- Axes Helper (Optional) -->
      {#if showAxes}
        <T.AxesHelper args={[5]} />
      {/if}

      <!-- Scene Content Slot -->
      <slot />
    </Canvas>
  </div>
{/if}

<style>
  .threlte-container {
    width: 100%;
    height: 100%;
  }
</style>
