// command/types.ts

export interface CommandResult {
  success: boolean;
  output: string;
  data?: {
    grid?: any;
    visualization?: VisualizationSettings;
    [key: string]: any;
  };
  error?: string;
}

export interface VisualizationSettings {
  showWireframe?: boolean;
  colormap?: string;
  showEdges?: boolean;
  cameraView?: 'default' | 'top' | 'side' | 'front';
}

export interface FunctionSignature {
  name: string;
  params: FunctionParameter[];
  description: string;
  returns?: string;
  examples?: string[];
}

export interface FunctionParameter {
  name: string;
  type: 'number' | 'string' | 'boolean';
  optional?: boolean;
  defaultValue?: any;
}

export interface ParsedCommand {
  functionName: string;
  args: any[];
}

export type CommandFunction = (...args: any[]) => Promise<CommandResult> | CommandResult;