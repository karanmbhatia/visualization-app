/**
 * WASM Module Loader for Delaunay Tessellation
 * Loads and initializes the WebAssembly module
 */

export interface WasmModule {
  _malloc: (size: number) => number;
  _free: (ptr: number) => void;
  HEAPF32: Float32Array;
  HEAPU32: Uint32Array;
  HEAP8: Int8Array;
  // Add your specific WASM function exports here
  // Example:
  // generateDelaunayMesh: (vertexCount: number) => number;
  // getVertices: () => number;
  // getIndices: () => number;
  // getVertexCount: () => number;
  // getIndexCount: () => number;
  [key: string]: any;
}

let wasmModuleCache: WasmModule | null = null;

/**
 * Load the WASM module
 * @param wasmPath - Path to the .wasm file
 * @param jsPath - Path to the .js glue code file
 */
export async function loadWasmModule(
  wasmPath: string = '/wasm/delaunay_tessellation.wasm',
  jsPath: string = '/wasm/delaunay_tessellation.js'
): Promise<WasmModule> {
  // Return cached module if already loaded
  if (wasmModuleCache) {
    console.log('✅ Using cached WASM module');
    return wasmModuleCache;
  }

  try {
    console.log('🔄 Loading WASM module...');
    
    // Check if the JS glue code is available
    if (typeof window !== 'undefined') {
      // Dynamically load the JS glue code
      await loadScript(jsPath);
      
      // Wait for the Module to be available (set by the glue code)
      const Module = await waitForModule();
      
      console.log('✅ WASM module loaded successfully');
      console.log('📊 Available exports:', Object.keys(Module).filter(k => !k.startsWith('_') || k.startsWith('_get') || k.startsWith('_set')));
      
      wasmModuleCache = Module as WasmModule;
      return wasmModuleCache;
    } else {
      throw new Error('WASM can only be loaded in browser environment');
    }
  } catch (error) {
    console.error('❌ Failed to load WASM module:', error);
    throw error;
  }
}

/**
 * Load a script dynamically
 */
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if script is already loaded
    const existingScript = document.querySelector(`script[src="${src}"]`);
    if (existingScript) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });
}

/**
 * Wait for the Module to be available (created by emscripten glue code)
 */
function waitForModule(maxWaitTime = 10000): Promise<any> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const checkModule = () => {
      // Check if Module is available on window
      if ((window as any).Module) {
        const module = (window as any).Module;
        
        // Wait for the module to be fully ready
        if (module.calledRun || module._malloc) {
          resolve(module);
        } else {
          // Module exists but not ready yet, check again
          setTimeout(checkModule, 50);
        }
      } else if (Date.now() - startTime > maxWaitTime) {
        reject(new Error('Timeout waiting for WASM Module'));
      } else {
        setTimeout(checkModule, 50);
      }
    };
    
    checkModule();
  });
}

/**
 * Generate test points for Delaunay tessellation
 */
export function generateTestPoints(count: number = 100, bounds = { x: 10, y: 10, z: 10 }): Float32Array {
  const points = new Float32Array(count * 3);
  
  for (let i = 0; i < count; i++) {
    points[i * 3] = (Math.random() - 0.5) * bounds.x;
    points[i * 3 + 1] = (Math.random() - 0.5) * bounds.y;
    points[i * 3 + 2] = (Math.random() - 0.5) * bounds.z;
  }
  
  return points;
}

/**
 * Clear the WASM module cache
 */
export function clearWasmCache(): void {
  wasmModuleCache = null;
  console.log('🧹 WASM cache cleared');
}