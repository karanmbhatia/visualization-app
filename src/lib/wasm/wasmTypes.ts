// wasm/wasmTypes.ts

/**
 * Type definitions for WASM module exports
 * These should match the functions exported from your WASM module
 */

export interface WASMModule {
  memory: WebAssembly.Memory;
  exports: WASMExports;
}

export interface WASMExports {
  // Grid generation functions
  generateGrid: (nx: number, ny: number, nz: number) => number;
  generateDelaunayGrid: (points: number, seed: number) => number;
  
  // Grid operations
  computeCellCenters: (gridPtr: number) => number;
  computeCellVolumes: (gridPtr: number) => number;
  computeConnectivity: (gridPtr: number) => number;
  
  // Geometry functions
  computeFaceAreas: (gridPtr: number) => number;
  computeFaceNormals: (gridPtr: number) => number;
  
  // Memory management
  allocateMemory: (size: number) => number;
  freeMemory: (ptr: number) => void;
  
  // Utility functions
  getGridInfo: (gridPtr: number) => number;
}

/**
 * Memory layout for Grid structure in WASM
 */
export interface WASMGridLayout {
  // Pointers to data arrays
  verticesPtr: number;
  facesPtr: number;
  cellsPtr: number;
  
  // Array sizes
  numVertices: number;
  numFaces: number;
  numCells: number;
  
  // Grid dimensions
  nx: number;
  ny: number;
  nz: number;
}

/**
 * Helper to read/write data from WASM memory
 */
export class WASMMemoryHelper {
  constructor(private memory: WebAssembly.Memory) {}

  readFloat32Array(ptr: number, length: number): Float32Array {
    return new Float32Array(this.memory.buffer, ptr, length);
  }

  readInt32Array(ptr: number, length: number): Int32Array {
    return new Int32Array(this.memory.buffer, ptr, length);
  }

  writeFloat32Array(ptr: number, data: Float32Array): void {
    const view = new Float32Array(this.memory.buffer, ptr, data.length);
    view.set(data);
  }

  writeInt32Array(ptr: number, data: Int32Array): void {
    const view = new Int32Array(this.memory.buffer, ptr, data.length);
    view.set(data);
  }

  readUint8Array(ptr: number, length: number): Uint8Array {
    return new Uint8Array(this.memory.buffer, ptr, length);
  }

  writeUint8Array(ptr: number, data: Uint8Array): void {
    const view = new Uint8Array(this.memory.buffer, ptr, data.length);
    view.set(data);
  }
}