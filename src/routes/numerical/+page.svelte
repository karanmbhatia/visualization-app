<script lang="ts">
  import { onMount } from 'svelte';
  import ThrelteCanvas from '$lib/components/ThrelteCanvas.svelte';
  import NumericalScene from '$lib/components/NumericalScene.svelte';
  import { Card } from 'flowbite-svelte';

  let statsText = 'Grid: 1×1×30 cells (30m height) | Drag to rotate | Scroll to zoom';
  let loading = true;

  // Camera reference for reset
  let cameraRef: any = null;

  onMount(() => {
    setTimeout(() => {
      loading = false;
    }, 500);
  });

  function handleResetView() {
    cameraRef = { reset: true };
    setTimeout(() => {
      cameraRef = null;
    }, 100);
  }
</script>

<svelte:head>
  <title>Method 2: Gravity Column Simulation</title>
</svelte:head>

<div class="page-container">
  <!-- Floating Info Panel -->
  <div class="info-panel">
    <Card>
      <div class="info-content">
        <h3 class="panel-title">Pressure Distribution [bar]</h3>
        <p class="text-xs text-gray-600">{statsText}</p>
      </div>
    </Card>
  </div>

  <!-- Reset Button -->
  <div class="reset-button-container">
    <button on:click={handleResetView} class="reset-button">
      Reset View
    </button>
  </div>

  <!-- 3D Visualization -->
  <div class="canvas-container">
    <ThrelteCanvas 
      showGrid={true} 
      cameraPosition={{ x: 5, y: 10, z: 8 }} 
      enableDamping={true}
      resetTrigger={cameraRef}
    >
      {#if !loading}
        <NumericalScene />
      {/if}
    </ThrelteCanvas>

    <!-- Colorbar -->
    <div class="colorbar-panel">
      <Card size="sm">
        <div class="colorbar-content">
          <p class="colorbar-title">Pressure (bar)</p>
          <div class="colorbar-wrapper">
            <div class="colorbar-gradient"></div>
            <div class="colorbar-labels">
              <span class="label">102.5</span>
              <span class="label">102.0</span>
              <span class="label">101.5</span>
              <span class="label">101.0</span>
              <span class="label">100.5</span>
              <span class="label">100.0</span>
            </div>
          </div>
        </div>
      </Card>
    </div>

    {#if loading}
      <div class="loading-overlay">
        <div class="spinner"></div>
        <p>Computing pressure field...</p>
      </div>
    {/if}
  </div>
</div>

<style>
  .page-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: white;
    position: relative;
  }

  .info-panel {
    position: absolute;
    top: 20px;
    left: 20px;
    z-index: 100;
    max-width: 400px;
  }

  .info-content {
    padding: 0.5rem;
  }

  .panel-title {
    font-size: 1rem;
    font-weight: 700;
    color: #667eea;
    margin: 0 0 0.5rem 0;
  }

  .reset-button-container {
    position: absolute;
    top: 90px;
    left: 20px;
    z-index: 100;
  }

  .reset-button {
    padding: 0.625rem 1.25rem;
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: white;
    border: none;
    border-radius: 6px;
    font-weight: 600;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
  }

  .reset-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  }

  .canvas-container {
    flex: 1;
    position: relative;
    overflow: hidden;
  }

  .colorbar-panel {
    position: absolute;
    right: 20px;
    top: 20px;
    z-index: 100;
  }

  .colorbar-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem;
    background: #2d3748;
    border-radius: 8px;
  }

  .colorbar-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: white;
    margin-bottom: 0.25rem;
  }

  .colorbar-wrapper {
    display: flex;
    align-items: stretch;
    gap: 0.5rem;
  }

  .colorbar-gradient {
    width: 30px;
    height: 300px;
    border-radius: 4px;
    background: linear-gradient(
      to top,
      #00f 0%,
      #00c 10%,
      #04f 20%,
      #08f 30%,
      #0cf 40%,
      #0ff 50%,
      #0f8 60%,
      #f60 70%,
      #f90 80%,
      #fc0 90%,
      #ff0 100%
    );
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
    border: 1px solid #e5e7eb;
  }

  .colorbar-labels {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    height: 300px;
    font-size: 0.75rem;
    color: white;
    font-weight: 600;
    padding: 2px 0;
  }

  .label {
    text-align: left;
    line-height: 1;
  }

  .loading-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0.95);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 50;
  }

  .spinner {
    width: 50px;
    height: 50px;
    border: 4px solid #e5e7eb;
    border-top-color: #667eea;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin-bottom: 1rem;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .loading-overlay p {
    color: #667eea;
    font-weight: 600;
  }

  @media (max-width: 768px) {
    .colorbar-panel {
      right: 10px;
      top: 10px;
    }

    .colorbar-gradient {
      width: 25px;
      height: 200px;
    }

    .colorbar-labels {
      height: 200px;
      font-size: 0.65rem;
    }

    .info-panel {
      left: 10px;
      right: 10px;
      max-width: calc(100% - 20px);
    }

    .reset-button-container {
      top: 80px;
      left: 10px;
    }
  }
</style>