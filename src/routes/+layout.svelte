<script>
  import '../app.css';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
</script>

<div class="app-container">
  <nav class="navigation">
    <div class="nav-content">
      <h1 class="app-title">MRST Grid Visualization</h1>
      
      <div class="tabs-container">
        <button 
          class="tab-button"
          class:active={$page.url.pathname === '/json'}
          on:click={() => goto('/json')}
        >
          Delaunay Tessellation
        </button>
        
        <button 
          class="tab-button"
          class:active={$page.url.pathname === '/numerical'}
          on:click={() => goto('/numerical')}
        >
          Stratigraphic Grid
        </button>
        
        <button 
          class="tab-button"
          class:active={$page.url.pathname === '/wasm'}
          on:click={() => goto('/wasm')}
        >
          WASM Ellipsoid
        </button>

        <button 
          class="tab-button"
          class:active={$page.url.pathname === '/grdecl'}
          on:click={() => goto('/grdecl')}
        >
          GRDECL Grid
        </button>
      </div>
    </div>
  </nav>

  <main class="main-content">
    <slot />
  </main>
</div>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    overflow: hidden;
  }

  .app-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: hidden;
  }

  .navigation {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    z-index: 1000;
  }

  .nav-content {
    padding: 0.75rem 2rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 2rem;
  }

  .app-title {
    color: white;
    font-size: 1.5rem;
    font-weight: 700;
    margin: 0;
    white-space: nowrap;
  }

  .tabs-container {
    display: flex;
    gap: 1rem;
    flex-wrap: nowrap;
  }

  .tab-button {
    padding: 0.625rem 1.25rem;
    background: rgba(255, 255, 255, 0.1);
    color: white;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    backdrop-filter: blur(10px);
    white-space: nowrap;
  }

  .tab-button:hover {
    background: rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 255, 255, 0.5);
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }

  .tab-button.active {
    background: white;
    color: #667eea;
    border-color: white;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.2);
  }

  .tab-button.active:hover {
    transform: translateY(-1px);
  }

  .main-content {
    flex: 1;
    overflow: hidden;
  }

  @media (max-width: 1024px) {
    .nav-content {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
    }

    .app-title {
      font-size: 1.25rem;
    }

    .tabs-container {
      width: 100%;
      overflow-x: auto;
    }
  }

  @media (max-width: 768px) {
    .tab-button {
      padding: 0.5rem 0.875rem;
      font-size: 0.75rem;
    }
  }
</style>