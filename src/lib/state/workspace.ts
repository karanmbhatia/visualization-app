// state/workspace.ts

export interface GridData {
  vertices: number[][];
  faces: {
    nodePos: number[];
    nodes: number[];
  };
  cells: {
    num: number;
    facePos: number[];
    faces: number[][];
  };
  metadata?: {
    gridDims?: number[];
    type?: string;
    [key: string]: any;
  };
  solution?: {
    pressureBar?: number[];
    [key: string]: any;
  };
}

export interface VisualizationState {
  showWireframe: boolean;
  colormap: string;
  showEdges: boolean;
  cameraView: 'default' | 'top' | 'side' | 'front';
}

export interface CommandHistoryState {
  commands: string[];
  outputs: string[];
  currentIndex: number;
}

export interface FileMetadata {
  name: string;
  path: string;
  type: string;
  loadedAt: Date;
}

export interface Workspace {
  // Grid data - named grids (like MATLAB variables)
  grids: Map<string, GridData>;
  activeGrid: string | null;
  
  // Visualization settings
  visualization: VisualizationState;
  
  // Command history
  history: CommandHistoryState;
  
  // Loaded files
  loadedFiles: Map<string, FileMetadata>;
  
  // Additional workspace variables
  variables: Map<string, any>;
}

class WorkspaceManager {
  private workspace: Workspace;

  constructor() {
    this.workspace = this.createDefaultWorkspace();
  }

  private createDefaultWorkspace(): Workspace {
    return {
      grids: new Map(),
      activeGrid: null,
      visualization: {
        showWireframe: false,
        colormap: 'jet',
        showEdges: true,
        cameraView: 'default'
      },
      history: {
        commands: [],
        outputs: [],
        currentIndex: -1
      },
      loadedFiles: new Map(),
      variables: new Map()
    };
  }

  getWorkspace(): Workspace {
    return this.workspace;
  }

  setActiveGrid(gridName: string): void {
    if (this.workspace.grids.has(gridName)) {
      this.workspace.activeGrid = gridName;
    } else {
      throw new Error(`Grid "${gridName}" not found in workspace`);
    }
  }

  getActiveGrid(): GridData | null {
    if (this.workspace.activeGrid) {
      return this.workspace.grids.get(this.workspace.activeGrid) || null;
    }
    return null;
  }

  addGrid(name: string, data: GridData): void {
    this.workspace.grids.set(name, data);
    if (!this.workspace.activeGrid) {
      this.workspace.activeGrid = name;
    }
  }

  removeGrid(name: string): void {
    this.workspace.grids.delete(name);
    if (this.workspace.activeGrid === name) {
      this.workspace.activeGrid = null;
    }
  }

  updateVisualization(settings: Partial<VisualizationState>): void {
    this.workspace.visualization = {
      ...this.workspace.visualization,
      ...settings
    };
  }

  getVisualization(): VisualizationState {
    return this.workspace.visualization;
  }

  setVariable(name: string, value: any): void {
    this.workspace.variables.set(name, value);
  }

  getVariable(name: string): any {
    return this.workspace.variables.get(name);
  }

  clearWorkspace(): void {
    this.workspace = this.createDefaultWorkspace();
  }

  listGrids(): string[] {
    return Array.from(this.workspace.grids.keys());
  }

  listVariables(): string[] {
    return Array.from(this.workspace.variables.keys());
  }
}

// Singleton instance
export const workspaceManager = new WorkspaceManager();