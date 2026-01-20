<script>
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  onMount(() => {
    // Redirect to the json route by default
    goto('/json');
  });
</script>

<div class="loading-container">
  <div class="spinner"></div>
  <p>Loading...</p>
</div>

<style>
  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100vh;
    background: #f9fafb;
  }

  .spinner {
    width: 50px;
    height: 50px;
    border: 4px solid #e5e7eb;
    border-top-color: #667eea;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  p {
    margin-top: 1rem;
    color: #6b7280;
    font-size: 1rem;
  }
</style>