/**
 * GRDECL Parser for Eclipse-style corner-point grid format
 * Parses SPECGRID, COORD, ZCORN, and ACTNUM sections
 */

export interface GrdeclData {
  specgrid: {
    nx: number;
    ny: number;
    nz: number;
  };
  coord: number[][];  // Pillar coordinates [x1, y1, z1, x2, y2, z2]
  zcorn: number[];    // Z-coordinates of cell corners
  actnum: number[];   // Active cell indicators (1 = active, 0 = inactive)
  cells: {
    num: number;
    vertices: number[][];  // All unique vertices
    cellVertices: number[][][]; // Vertices for each cell [cellIndex][vertexIndex][x, y, z]
  };
}

/**
 * Parse a GRDECL file and extract grid data
 */
export function parseGrdecl(fileContent: string): GrdeclData {
  const lines = fileContent.split('\n').map(line => line.trim());
  
  let specgrid = { nx: 0, ny: 0, nz: 0 };
  let coord: number[][] = [];
  let zcorn: number[] = [];
  let actnum: number[] = [];
  
  let currentSection = '';
  let sectionData: string[] = [];
  
  // Parse sections
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    
    if (line.startsWith('SPECGRID')) {
      currentSection = 'SPECGRID';
      sectionData = [];
      continue;
    } else if (line.startsWith('COORD')) {
      currentSection = 'COORD';
      sectionData = [];
      continue;
    } else if (line.startsWith('ZCORN')) {
      currentSection = 'ZCORN';
      sectionData = [];
      continue;
    } else if (line.startsWith('ACTNUM')) {
      currentSection = 'ACTNUM';
      sectionData = [];
      continue;
    }
    
    // Check if line contains end marker
    if (line === '/' || line.endsWith('/')) {
      // If line has data before the slash, add it to section data
      if (line.length > 1 && currentSection) {
        const dataBeforeSlash = line.substring(0, line.lastIndexOf('/')).trim();
        if (dataBeforeSlash.length > 0) {
          sectionData.push(dataBeforeSlash);
        }
      }
      
      // End of section - parse it
      if (currentSection === 'SPECGRID') {
        specgrid = parseSpecgrid(sectionData);
      } else if (currentSection === 'COORD') {
        coord = parseCoord(sectionData);
      } else if (currentSection === 'ZCORN') {
        zcorn = parseZcorn(sectionData);
      } else if (currentSection === 'ACTNUM') {
        actnum = parseActnum(sectionData, specgrid);
      }
      currentSection = '';
      sectionData = [];
    } else if (currentSection && line.length > 0) {
      sectionData.push(line);
    }
  }
  
  // Generate cell vertices
  const cells = generateCellVertices(specgrid, coord, zcorn, actnum);
  
  console.log('📊 GRDECL Parsing Summary:', {
    specgrid,
    numPillars: coord.length,
    numZcorn: zcorn.length,
    numActnum: actnum.length,
    activeCells: cells.num
  });
  
  return {
    specgrid,
    coord,
    zcorn,
    actnum,
    cells
  };
}

/**
 * Parse SPECGRID section (grid dimensions)
 */
function parseSpecgrid(data: string[]): { nx: number; ny: number; nz: number } {
  const values = data.join(' ')
    .split(/\s+/)
    .filter(v => v.length > 0 && !v.includes('/') && v !== 'F');
  
  console.log('🔍 SPECGRID parsing:', { data, values });
  
  return {
    nx: parseInt(values[0]),
    ny: parseInt(values[1]),
    nz: parseInt(values[2])
  };
}

/**
 * Parse COORD section (pillar coordinates)
 */
function parseCoord(data: string[]): number[][] {
  const values = data.join(' ')
    .split(/\s+/)
    .filter(v => v.length > 0 && !v.includes('/'))
    .map(v => parseFloat(v));
  
  const pillars: number[][] = [];
  for (let i = 0; i < values.length; i += 6) {
    pillars.push([
      values[i], values[i + 1], values[i + 2],  // Top point
      values[i + 3], values[i + 4], values[i + 5]  // Bottom point
    ]);
  }
  
  return pillars;
}

/**
 * Parse ZCORN section (Z-coordinates of cell corners)
 */
function parseZcorn(data: string[]): number[] {
  return data.join(' ')
    .split(/\s+/)
    .filter(v => v.length > 0 && !v.includes('/'))
    .map(v => parseFloat(v));
}

/**
 * Parse ACTNUM section (active cells)
 */
function parseActnum(data: string[], specgrid: { nx: number; ny: number; nz: number }): number[] {
  const text = data.join(' ');
  const actnum: number[] = [];
  
  // Handle compressed format like "48*1"
  const tokens = text.split(/\s+/).filter(v => v.length > 0 && !v.includes('/'));
  
  for (const token of tokens) {
    if (token.includes('*')) {
      const [count, value] = token.split('*');
      const repeatCount = parseInt(count);
      const repeatValue = parseInt(value);
      for (let i = 0; i < repeatCount; i++) {
        actnum.push(repeatValue);
      }
    } else {
      actnum.push(parseInt(token));
    }
  }
  
  // If no ACTNUM specified, assume all cells are active
  const totalCells = specgrid.nx * specgrid.ny * specgrid.nz;
  if (actnum.length === 0) {
    for (let i = 0; i < totalCells; i++) {
      actnum.push(1);
    }
  }
  
  return actnum;
}

/**
 * Generate 3D vertices for each cell from COORD and ZCORN
 */
function generateCellVertices(
  specgrid: { nx: number; ny: number; nz: number },
  coord: number[][],
  zcorn: number[],
  actnum: number[]
): {
  num: number;
  vertices: number[][];
  cellVertices: number[][][];
} {
  const { nx, ny, nz } = specgrid;
  const allVertices: number[][] = [];
  const cellVertices: number[][][] = [];
  const vertexMap = new Map<string, number>();
  
  let vertexIndex = 0;
  let activeCellCount = 0;
  
  // Helper to get pillar index
  const getPillarIndex = (i: number, j: number): number => {
    return j * (nx + 1) + i;
  };
  
  // Helper to interpolate along pillar
  const interpolatePillar = (pillar: number[], z: number): [number, number, number] => {
    const [x1, y1, z1, x2, y2, z2] = pillar;
    const t = (z - z1) / (z2 - z1);
    return [
      x1 + t * (x2 - x1),
      y1 + t * (y2 - y1),
      z
    ];
  };
  
  // Helper to add unique vertex
  const addVertex = (x: number, y: number, z: number): number => {
    const key = `${x.toFixed(6)},${y.toFixed(6)},${z.toFixed(6)}`;
    if (vertexMap.has(key)) {
      return vertexMap.get(key)!;
    }
    allVertices.push([x, y, z]);
    vertexMap.set(key, vertexIndex);
    return vertexIndex++;
  };
  
  // Generate vertices for each active cell
  for (let k = 0; k < nz; k++) {
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const cellIdx = i + j * nx + k * nx * ny;
        
        // Skip inactive cells
        if (actnum[cellIdx] === 0) {
          cellVertices.push([]);
          continue;
        }
        
        activeCellCount++;
        
        // Get the 8 corners of this cell
        // Corner ordering for hexahedral cell:
        // Bottom face (k): 0-1-2-3, Top face (k+1): 4-5-6-7
        //
        //     7----6
        //    /|   /|
        //   4----5 |
        //   | 3--|-2
        //   |/   |/
        //   0----1
        
        const corners: number[][] = [];
        
        // Get Z-coordinates for the 8 corners
        const zcornOffset = 2 * (i + j * (2 * nx) + k * (2 * nx * 2 * ny));
        
        // Bottom face (k layer)
        const z0 = zcorn[zcornOffset];                    // (i, j, k) - corner 0
        const z1 = zcorn[zcornOffset + 1];                // (i+1, j, k) - corner 1
        const z2 = zcorn[zcornOffset + 2 * nx + 1];       // (i+1, j+1, k) - corner 2
        const z3 = zcorn[zcornOffset + 2 * nx];           // (i, j+1, k) - corner 3
        
        // Top face (k+1 layer)
        const z4 = zcorn[zcornOffset + 4 * nx * ny];                  // (i, j, k+1) - corner 4
        const z5 = zcorn[zcornOffset + 4 * nx * ny + 1];              // (i+1, j, k+1) - corner 5
        const z6 = zcorn[zcornOffset + 4 * nx * ny + 2 * nx + 1];     // (i+1, j+1, k+1) - corner 6
        const z7 = zcorn[zcornOffset + 4 * nx * ny + 2 * nx];         // (i, j+1, k+1) - corner 7
        
        // Get pillars for the 4 corners of this cell
        const pillar00 = coord[getPillarIndex(i, j)];
        const pillar10 = coord[getPillarIndex(i + 1, j)];
        const pillar11 = coord[getPillarIndex(i + 1, j + 1)];
        const pillar01 = coord[getPillarIndex(i, j + 1)];
        
        // Interpolate XY positions along pillars at the Z depths
        const c0 = interpolatePillar(pillar00, z0);
        const c1 = interpolatePillar(pillar10, z1);
        const c2 = interpolatePillar(pillar11, z2);
        const c3 = interpolatePillar(pillar01, z3);
        const c4 = interpolatePillar(pillar00, z4);
        const c5 = interpolatePillar(pillar10, z5);
        const c6 = interpolatePillar(pillar11, z6);
        const c7 = interpolatePillar(pillar01, z7);
        
        // Add vertices and store indices
        const cellVerts: number[][] = [
          [c0[0], c0[1], c0[2]],
          [c1[0], c1[1], c1[2]],
          [c2[0], c2[1], c2[2]],
          [c3[0], c3[1], c3[2]],
          [c4[0], c4[1], c4[2]],
          [c5[0], c5[1], c5[2]],
          [c6[0], c6[1], c6[2]],
          [c7[0], c7[1], c7[2]]
        ];
        
        cellVertices.push(cellVerts);
        
        // Add to global vertex list
        for (const vert of cellVerts) {
          addVertex(vert[0], vert[1], vert[2]);
        }
      }
    }
  }
  
  return {
    num: activeCellCount,
    vertices: allVertices,
    cellVertices
  };
}