<script lang="ts">
  import { onMount } from 'svelte';
  import ThrelteCanvas from './ThrelteCanvas.svelte';
  import JsonScene from './JsonScene.svelte';
  import CommandWindow from './CommandWindow.svelte';

  let jsonData: any = null;
  let colormap = 'jet';
  let showEdges = true;
  let cameraRef: any = null;

  // Handle grid updates from command window
  function handleGridUpdate(data: any) {
    console.log('Grid updated from command:', data);
    jsonData = data;
  }

  // Handle visualization changes from command window
  function handleVisualizationChange(settings: any) {
    console.log('Visualization updated from command:', settings);
    
    if (settings.colormap !== undefined) {
      colormap = settings.colormap;
    }
    
    if (settings.showEdges !== undefined) {
      showEdges = settings.showEdges;
    }

    if (settings.cameraView !== undefined) {
      // You can handle camera view changes here
      console.log('Camera view:', settings.cameraView);
    }
  }
</script>

<svelte:head>
  <title>MRST Grid - GRDECL Tab with Command Window</title>
</svelte:head>

<div class="page-container">
  <!-- Main 3D Visualization -->
  <div class="canvas-container">
    <ThrelteCanvas showGrid={true} cameraPosition={{ x: 30, y: 30, z: 30 }} resetTrigger={cameraRef}>
      {#if jsonData}
        <JsonScene {jsonData} {colormap} {showEdges} />
      {/if}
    </ThrelteCanvas>
  </div>

  <!-- Command Window (Bottom Panel) -->
  <div class="command-panel">
    <CommandWindow 
      onGridUpdate={handleGridUpdate}
      onVisualizationChange={handleVisualizationChange}
    />
  </div>
</div>

<style>
  .page-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background: #1a1a1a;
  }

  .canvas-container {
    flex: 1;
    position: relative;
    overflow: hidden;
    min-height: 0; /* Important for flexbox */
  }

  .command-panel {
    height: 300px;
    border-top: 2px solid #3c3c3c;
    display: flex;
    flex-direction: column;
  }

  /* Responsive: collapse command window on mobile */
  @media (max-width: 768px) {
    .command-panel {
      height: 200px;
    }
  }
</style>