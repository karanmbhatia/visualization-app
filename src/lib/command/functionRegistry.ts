// command/functionRegistry.ts

import type { CommandResult, FunctionSignature, CommandFunction } from './types';
import { workspaceManager } from '../state/workspace';
import type { GridData } from '../state/workspace';
import { parseGrdecl } from '../utils/grdeclParser';

export class FunctionRegistry {
  private functions: Map<string, CommandFunction> = new Map();
  private signatures: Map<string, FunctionSignature> = new Map();

  constructor() {
    this.registerAllFunctions();
  }

  private registerAllFunctions(): void {
    // Grid generation functions
    this.register(
      'generateGrid',
      this.generateGrid.bind(this),
      {
        name: 'generateGrid',
        params: [
          { name: 'nx', type: 'number' },
          { name: 'ny', type: 'number' },
          { name: 'nz', type: 'number' }
        ],
        description: 'Generate a structured Cartesian grid',
        examples: ['generateGrid(10, 10, 5)', 'generateGrid(40, 40, 10)']
      }
    );

    // File loading functions
    this.register(
      'loadGRDECL',
      this.loadGRDECL.bind(this),
      {
        name: 'loadGRDECL',
        params: [{ name: 'filepath', type: 'string' }],
        description: 'Load a GRDECL file from the server',
        examples: ['loadGRDECL("data/simple_3layer.grdecl")', 'loadGRDECL("data/output_reservoir.grdecl")']
      }
    );

    // Visualization control functions
    this.register(
      'setWireframe',
      this.setWireframe.bind(this),
      {
        name: 'setWireframe',
        params: [{ name: 'enabled', type: 'boolean' }],
        description: 'Toggle wireframe display',
        examples: ['setWireframe(true)', 'setWireframe(false)']
      }
    );

    this.register(
      'setEdges',
      this.setEdges.bind(this),
      {
        name: 'setEdges',
        params: [{ name: 'enabled', type: 'boolean' }],
        description: 'Toggle edge display',
        examples: ['setEdges(true)', 'setEdges(false)']
      }
    );

    this.register(
      'setColormap',
      this.setColormap.bind(this),
      {
        name: 'setColormap',
        params: [{ name: 'name', type: 'string' }],
        description: 'Set colormap (jet, viridis, plasma, cool)',
        examples: ['setColormap("viridis")', 'setColormap("jet")']
      }
    );

    this.register(
      'setView',
      this.setView.bind(this),
      {
        name: 'setView',
        params: [{ name: 'view', type: 'string' }],
        description: 'Set camera view (default, top, side, front)',
        examples: ['setView("top")', 'setView("side")', 'setView("front")', 'setView("default")']
      }
    );

    this.register(
      'resetCamera',
      this.resetCamera.bind(this),
      {
        name: 'resetCamera',
        params: [],
        description: 'Reset camera to default position',
        examples: ['resetCamera()']
      }
    );

    // Utility functions
    this.register(
      'clear',
      this.clear.bind(this),
      {
        name: 'clear',
        params: [],
        description: 'Clear the workspace',
        examples: ['clear()']
      }
    );

    this.register(
      'help',
      this.help.bind(this),
      {
        name: 'help',
        params: [{ name: 'functionName', type: 'string', optional: true }],
        description: 'Display help information',
        examples: ['help()', 'help("generateGrid")']
      }
    );

    this.register(
      'listGrids',
      this.listGrids.bind(this),
      {
        name: 'listGrids',
        params: [],
        description: 'List all grids in workspace',
        examples: ['listGrids()']
      }
    );
  }

  register(name: string, fn: CommandFunction, signature: FunctionSignature): void {
    this.functions.set(name, fn);
    this.signatures.set(name, signature);
  }

  get(name: string): CommandFunction | undefined {
    return this.functions.get(name);
  }

  getSignature(name: string): FunctionSignature | undefined {
    return this.signatures.get(name);
  }

  getAllSignatures(): FunctionSignature[] {
    return Array.from(this.signatures.values());
  }

  has(name: string): boolean {
    return this.functions.has(name);
  }

  // ========== Function Implementations ==========

  /**
   * Generate a Cartesian grid in GRDECL format
   * This creates data compatible with GrdeclScene.svelte
   */
  private async generateGrid(nx: number, ny: number, nz: number): Promise<CommandResult> {
    try {
      // Generate GRDECL-format grid data
      const grid = this.createCartesianGRDECL(nx, ny, nz);
      
      workspaceManager.addGrid('grid1', grid);

      return {
        success: true,
        output: `Grid generated: ${nx}×${ny}×${nz} (${nx * ny * nz} cells)`,
        data: { grid }
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error.message
      };
    }
  }

  /**
   * Load a GRDECL file from the server
   */
  private async loadGRDECL(filepath: string): Promise<CommandResult> {
    try {
      // Ensure filepath starts with / or is relative
      const fullPath = filepath.startsWith('/') ? filepath : `/${filepath}`;
      
      console.log(`Loading GRDECL file: ${fullPath}`);
      
      // Fetch the file from the server
      const response = await fetch(fullPath);
      
      if (!response.ok) {
        throw new Error(`Failed to load file: ${response.status} ${response.statusText}`);
      }

      // Get file content as text
      const fileContent = await response.text();
      
      console.log(`File loaded, parsing GRDECL format...`);
      
      // Parse GRDECL content using your existing parser
      const grdeclData = parseGrdecl(fileContent);
      
      // Store in workspace
      workspaceManager.addGrid('loadedGrid', grdeclData);
      
      // Get grid info for output message
      const { nx, ny, nz } = grdeclData.specgrid;
      const activeCells = grdeclData.cells?.num || 0;
      const totalCells = nx * ny * nz;

      return {
        success: true,
        output: `GRDECL loaded: ${filepath}\nGrid: ${nx}×${ny}×${nz}\nActive cells: ${activeCells}/${totalCells}`,
        data: { grid: grdeclData }
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: `Failed to load GRDECL: ${error.message}`
      };
    }
  }

  private async setWireframe(enabled: boolean): Promise<CommandResult> {
    workspaceManager.updateVisualization({ showWireframe: enabled });
    return {
      success: true,
      output: `Wireframe ${enabled ? 'enabled' : 'disabled'}`,
      data: { visualization: workspaceManager.getVisualization() }
    };
  }

  private async setEdges(enabled: boolean): Promise<CommandResult> {
    workspaceManager.updateVisualization({ showEdges: enabled });
    return {
      success: true,
      output: `Edges ${enabled ? 'enabled' : 'disabled'}`,
      data: { visualization: workspaceManager.getVisualization() }
    };
  }

  private async setColormap(name: string): Promise<CommandResult> {
    const validColormaps = ['jet', 'viridis', 'plasma', 'cool'];
    if (!validColormaps.includes(name)) {
      return {
        success: false,
        output: '',
        error: `Invalid colormap. Must be one of: ${validColormaps.join(', ')}`
      };
    }

    workspaceManager.updateVisualization({ colormap: name });
    return {
      success: true,
      output: `Colormap set to ${name}`,
      data: { visualization: workspaceManager.getVisualization() }
    };
  }

  private async setView(view: string): Promise<CommandResult> {
    const validViews = ['default', 'top', 'side', 'front'];
    if (!validViews.includes(view)) {
      return {
        success: false,
        output: '',
        error: `Invalid view. Must be one of: ${validViews.join(', ')}`
      };
    }

    workspaceManager.updateVisualization({ cameraView: view as any });
    return {
      success: true,
      output: `Camera view set to ${view}`,
      data: { 
        visualization: { 
          cameraView: view 
        }
      }
    };
  }

  private async resetCamera(): Promise<CommandResult> {
    return {
      success: true,
      output: 'Camera reset to default position',
      data: { 
        visualization: {
          resetCamera: true
        }
      }
    };
  }

  private async clear(): Promise<CommandResult> {
    workspaceManager.clearWorkspace();
    return {
      success: true,
      output: 'Workspace cleared',
      data: {
        grid: null  // This will clear the visualization
      }
    };
  }

  private async listGrids(): Promise<CommandResult> {
    const grids = workspaceManager.listGrids();
    if (grids.length === 0) {
      return {
        success: true,
        output: 'No grids in workspace'
      };
    }

    const gridList = grids.map(name => `  - ${name}`).join('\n');
    return {
      success: true,
      output: `Grids in workspace:\n${gridList}`
    };
  }

  private async help(functionName?: string): Promise<CommandResult> {
    if (functionName) {
      const signature = this.signatures.get(functionName);
      if (!signature) {
        return {
          success: false,
          output: '',
          error: `Unknown function: ${functionName}`
        };
      }

      const params = signature.params
        .map(p => `${p.name}: ${p.type}${p.optional ? ' (optional)' : ''}`)
        .join(', ');
      
      const examples = signature.examples
        ? '\nExamples:\n' + signature.examples.map(ex => `  ${ex}`).join('\n')
        : '';

      return {
        success: true,
        output: `${signature.name}(${params})\n${signature.description}${examples}`
      };
    }

    // Show all available functions
    const allSignatures = this.getAllSignatures();
    const functionList = allSignatures
      .map(sig => `  ${sig.name} - ${sig.description}`)
      .join('\n');

    return {
      success: true,
      output: `Available commands:\n${functionList}\n\nType help("functionName") for detailed help`
    };
  }

  // ========== Helper Functions ==========

  /**
   * Create a Cartesian grid in GRDECL format
   * This matches the format expected by GrdeclScene.svelte
   */
  private createCartesianGRDECL(nx: number, ny: number, nz: number): any {
    // Cell dimensions
    const dx = 10.0; // meters
    const dy = 10.0; // meters
    const dz = 1.0;  // meters

    // Total cells
    const totalCells = nx * ny * nz;

    // Generate COORD (pillar coordinates)
    // For a Cartesian grid, we need (nx+1)*(ny+1) pillars
    const coord: number[] = [];
    for (let j = 0; j <= ny; j++) {
      for (let i = 0; i <= nx; i++) {
        const x = i * dx;
        const y = j * dy;
        // Top of pillar
        coord.push(x, y, 0);
        // Bottom of pillar  
        coord.push(x, y, nz * dz);
      }
    }

    // Generate ZCORN (z-coordinates of cell corners)
    // For each cell, we need 8 corners (4 top + 4 bottom)
    const zcorn: number[] = [];
    for (let k = 0; k < nz; k++) {
      // Top corners of layer
      for (let j = 0; j < ny; j++) {
        for (let i = 0; i < nx; i++) {
          const z_top = k * dz;
          // Each cell contributes 4 corners on top face
          zcorn.push(z_top, z_top, z_top, z_top);
        }
      }
      // Bottom corners of layer
      for (let j = 0; j < ny; j++) {
        for (let i = 0; i < nx; i++) {
          const z_bottom = (k + 1) * dz;
          // Each cell contributes 4 corners on bottom face
          zcorn.push(z_bottom, z_bottom, z_bottom, z_bottom);
        }
      }
    }

    // Generate ACTNUM (all cells active)
    const actnum: number[] = new Array(totalCells).fill(1);

    // Pre-compute cell vertices for visualization
    const cellVertices: number[][][] = [];
    
    for (let k = 0; k < nz; k++) {
      for (let j = 0; j < ny; j++) {
        for (let i = 0; i < nx; i++) {
          const x0 = i * dx;
          const x1 = (i + 1) * dx;
          const y0 = j * dy;
          const y1 = (j + 1) * dy;
          const z0 = k * dz;
          const z1 = (k + 1) * dz;

          // 8 vertices of hexahedral cell (corner-point ordering)
          cellVertices.push([
            [x0, y0, z0], // 0: bottom-front-left
            [x1, y0, z0], // 1: bottom-front-right
            [x1, y1, z0], // 2: bottom-back-right
            [x0, y1, z0], // 3: bottom-back-left
            [x0, y0, z1], // 4: top-front-left
            [x1, y0, z1], // 5: top-front-right
            [x1, y1, z1], // 6: top-back-right
            [x0, y1, z1]  // 7: top-back-left
          ]);
        }
      }
    }

    // Return GRDECL-format data structure
    return {
      specgrid: {
        nx,
        ny,
        nz
      },
      coord,
      zcorn,
      actnum,
      cells: {
        num: totalCells,
        cellVertices
      }
    };
  }
}

// Singleton instance
export const functionRegistry = new FunctionRegistry();