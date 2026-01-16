<script>
  import { onMount } from 'svelte';

  let canvas;

  onMount(() => {
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.fillText('Geological Visualization Canvas', 20, 40);
  });
</script>

<h1>Geological Visualization Portal</h1>

<canvas bind:this={canvas} width="800" height="400" style="border:1px solid #444;"></canvas>

<h3>Visualization Methods</h3>

<ul>
  <li><a href="/json">Method 1 – JSON Input (MATLAB export)</a></li>
  <li><a href="/numerical">Method 2 – Numerical generation</a></li>
  <li><a href="/wasm">Method 3 – WASM from MATLAB C++</a></li>
</ul>
