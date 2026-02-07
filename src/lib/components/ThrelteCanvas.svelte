<script lang="ts">
  import { Canvas } from '@threlte/core';
  import { T } from '@threlte/core';
  import { OrbitControls } from '@threlte/extras';
  import { onMount } from 'svelte';

  export let showGrid = true;
  export let showAxes = true;
  export let cameraPosition = { x: 50, y: 50, z: 50 };
  export let enableDamping = true;
  export let resetTrigger: any = null;
  export let backgroundColor = '#1a1a1a';
  export let minDistance = 1;
  export let maxDistance = 2000;

  let camera: any;
  let controls: any;
  let mounted = false;

  const initialPosition = { ...cameraPosition };

  onMount(() => {
    mounted = true;
    console.log('🎥 ThrelteCanvas mounted');
    console.log('📍 Initial camera position:', initialPosition);
  });

  // Watch for reset trigger
  $: if (resetTrigger && camera && controls && mounted) {
    resetCamera();
  }

  function resetCamera() {
    if (camera && controls) {
      // Check if resetTrigger has a custom position
      let targetPosition = initialPosition;
      
      if (resetTrigger && resetTrigger.position) {
        // Use custom position from resetTrigger
        targetPosition = resetTrigger.position;
        console.log('🎯 Using custom camera position:', targetPosition);
      } else {
        console.log('🔄 Using initial camera position');
      }
      
      // Set camera position
      camera.position.set(targetPosition.x, targetPosition.y, targetPosition.z);
      camera.lookAt(0, 0, 0);
      controls.target.set(0, 0, 0);
      controls.update();
      
      console.log('📍 Camera now at:', {
        x: camera.position.x,
        y: camera.position.y,
        z: camera.position.z
      });
      console.log('🎯 Looking at:', {
        x: controls.target.x,
        y: controls.target.y,
        z: controls.target.z
      });
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
          target={[0, 0, 0]}
        />
      </T.PerspectiveCamera>

      <!-- Enhanced Lighting for better 3D visualization -->
      <T.AmbientLight intensity={0.6} />
      <T.DirectionalLight position={[20, 40, 20]} intensity={0.8} castShadow />
      <T.DirectionalLight position={[-20, 40, -20]} intensity={0.4} />
      <T.PointLight position={[-20, 20, -20]} intensity={0.3} />
      <T.PointLight position={[20, -20, 20]} intensity={0.2} />

      <!-- LARGER Grid Helper - Positioned at origin (0, 0, 0) with Y=0 plane -->
      {#if showGrid}
        <T.GridHelper 
          args={[100, 100, 0x888888, 0x333333]} 
          position={[0, 0, 0]}
        />
      {/if}

      <!-- Axes Helper (Optional) - Shows X(red), Y(green), Z(blue) -->
      {#if showAxes}
        <T.AxesHelper args={[20]} />
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