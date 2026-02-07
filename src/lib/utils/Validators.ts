// utils/validators.ts

export class Validators {
  /**
   * Validate grid dimensions
   */
  static validateGridDimensions(nx: number, ny: number, nz: number): { valid: boolean; error?: string } {
    if (!Number.isInteger(nx) || !Number.isInteger(ny) || !Number.isInteger(nz)) {
      return {
        valid: false,
        error: 'Grid dimensions must be integers'
      };
    }

    if (nx < 1 || ny < 1 || nz < 1) {
      return {
        valid: false,
        error: 'Grid dimensions must be positive'
      };
    }

    if (nx > 1000 || ny > 1000 || nz > 1000) {
      return {
        valid: false,
        error: 'Grid dimensions too large (max 1000 per dimension)'
      };
    }

    const totalCells = nx * ny * nz;
    if (totalCells > 1000000) {
      return {
        valid: false,
        error: `Too many cells (${totalCells}). Maximum is 1,000,000`
      };
    }

    return { valid: true };
  }

  /**
   * Validate colormap name
   */
  static validateColormap(colormap: string): { valid: boolean; error?: string } {
    const validColormaps = ['jet', 'viridis', 'plasma', 'cool', 'hot', 'rainbow'];
    
    if (!validColormaps.includes(colormap.toLowerCase())) {
      return {
        valid: false,
        error: `Invalid colormap. Must be one of: ${validColormaps.join(', ')}`
      };
    }

    return { valid: true };
  }

  /**
   * Validate camera view
   */
  static validateCameraView(view: string): { valid: boolean; error?: string } {
    const validViews = ['default', 'top', 'bottom', 'left', 'right', 'front', 'back'];
    
    if (!validViews.includes(view.toLowerCase())) {
      return {
        valid: false,
        error: `Invalid view. Must be one of: ${validViews.join(', ')}`
      };
    }

    return { valid: true };
  }

  /**
   * Validate file path
   */
  static validateFilePath(path: string): { valid: boolean; error?: string } {
    if (!path || path.trim().length === 0) {
      return {
        valid: false,
        error: 'File path cannot be empty'
      };
    }

    // Check for potentially dangerous paths
    if (path.includes('..') || path.startsWith('/')) {
      return {
        valid: false,
        error: 'Invalid file path (no directory traversal allowed)'
      };
    }

    return { valid: true };
  }

  /**
   * Validate numeric range
   */
  static validateRange(value: number, min: number, max: number, name: string = 'Value'): { valid: boolean; error?: string } {
    if (typeof value !== 'number' || isNaN(value)) {
      return {
        valid: false,
        error: `${name} must be a number`
      };
    }

    if (value < min || value > max) {
      return {
        valid: false,
        error: `${name} must be between ${min} and ${max}`
      };
    }

    return { valid: true };
  }

  /**
   * Validate boolean
   */
  static validateBoolean(value: any, name: string = 'Value'): { valid: boolean; error?: string } {
    if (typeof value !== 'boolean') {
      return {
        valid: false,
        error: `${name} must be true or false`
      };
    }

    return { valid: true };
  }

  /**
   * Validate string is not empty
   */
  static validateNonEmptyString(value: any, name: string = 'Value'): { valid: boolean; error?: string } {
    if (typeof value !== 'string') {
      return {
        valid: false,
        error: `${name} must be a string`
      };
    }

    if (value.trim().length === 0) {
      return {
        valid: false,
        error: `${name} cannot be empty`
      };
    }

    return { valid: true };
  }
}