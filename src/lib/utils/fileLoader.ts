// utils/fileLoader.ts

import type { GridData } from '../state/workspace';

export class FileLoader {
  /**
   * Load a file from a URL
   */
  static async loadFile(url: string): Promise<string> {
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to load file: ${response.statusText}`);
      }

      return await response.text();
    } catch (error) {
      throw new Error(`File loading error: ${error.message}`);
    }
  }

  /**
   * Load and parse a GRDECL file
   */
  static async loadGRDECL(url: string): Promise<GridData> {
    const content = await this.loadFile(url);
    return this.parseGRDECL(content);
  }

  /**
   * Parse GRDECL file content
   * This is a simplified parser - you'll need to expand this based on your needs
   */
  static parseGRDECL(content: string): GridData {
    // TODO: Implement full GRDECL parsing
    // This is a placeholder that extracts basic sections
    
    const sections: { [key: string]: string } = {};
    const sectionRegex = /(\w+)\s+([\s\S]*?)(?=\n\w+\s+|$)/g;
    
    let match;
    while ((match = sectionRegex.exec(content)) !== null) {
      sections[match[1]] = match[2].trim();
    }

    // Parse SPECGRID section (grid dimensions)
    let nx = 10, ny = 10, nz = 10;
    if (sections.SPECGRID) {
      const dims = sections.SPECGRID.split(/\s+/).filter(d => d).map(Number);
      [nx, ny, nz] = dims.slice(0, 3);
    }

    // Parse COORD section (pillar coordinates)
    const coords: number[] = [];
    if (sections.COORD) {
      const values = sections.COORD.split(/\s+/).filter(v => v).map(Number);
      coords.push(...values);
    }

    // Parse ZCORN section (z-coordinates of corners)
    const zcorn: number[] = [];
    if (sections.ZCORN) {
      const values = sections.ZCORN.split(/\s+/).filter(v => v).map(Number);
      zcorn.push(...values);
    }

    // For now, return a simplified grid structure
    // A full implementation would construct the actual 3D grid from COORD and ZCORN
    return {
      vertices: this.generateVerticesFromGRDECL(nx, ny, nz, coords, zcorn),
      faces: {
        nodePos: [],
        nodes: []
      },
      cells: {
        num: nx * ny * nz,
        facePos: [],
        faces: []
      },
      metadata: {
        gridDims: [nx, ny, nz],
        type: 'grdecl',
        sections: Object.keys(sections)
      }
    };
  }

  /**
   * Generate vertices from GRDECL COORD and ZCORN data
   */
  private static generateVerticesFromGRDECL(
    nx: number,
    ny: number,
    nz: number,
    coords: number[],
    zcorn: number[]
  ): number[][] {
    const vertices: number[][] = [];

    // Simplified: generate regular grid if COORD/ZCORN are not available
    if (coords.length === 0 || zcorn.length === 0) {
      for (let k = 0; k <= nz; k++) {
        for (let j = 0; j <= ny; j++) {
          for (let i = 0; i <= nx; i++) {
            vertices.push([i, j, k]);
          }
        }
      }
      return vertices;
    }

    // TODO: Implement proper pillar-based grid construction
    // This requires:
    // 1. Reading pillar lines from COORD
    // 2. Interpolating z-coordinates from ZCORN
    // 3. Constructing corner-point geometry

    return vertices;
  }

  /**
   * Load JSON file (for your existing data format)
   */
  static async loadJSON(url: string): Promise<any> {
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to load file: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(`JSON loading error: ${error.message}`);
    }
  }

  /**
   * Parse file extension
   */
  static getFileExtension(filename: string): string {
    const parts = filename.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
  }

  /**
   * Determine file type
   */
  static getFileType(filename: string): 'grdecl' | 'json' | 'unknown' {
    const ext = this.getFileExtension(filename);
    
    if (ext === 'grdecl' || ext === 'grdecl') {
      return 'grdecl';
    } else if (ext === 'json') {
      return 'json';
    }
    
    return 'unknown';
  }
}