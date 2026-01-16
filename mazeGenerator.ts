
import { Point } from './types.ts';

export function generateMaze(width: number, height: number): number[][] {
  const w = width % 2 === 0 ? width + 1 : width;
  const h = height % 2 === 0 ? height + 1 : height;

  const grid: number[][] = Array.from({ length: h }, () => Array(w).fill(1));

  const dirs = [
    [0, 2], [0, -2], [2, 0], [-2, 0]
  ];

  function walk(x: number, y: number) {
    grid[y][x] = 0;

    const shuffledDirs = [...dirs].sort(() => Math.random() - 0.5);

    for (const [dx, dy] of shuffledDirs) {
      const nx = x + dx;
      const ny = y + dy;

      if (nx > 0 && nx < w - 1 && ny > 0 && ny < h - 1 && grid[ny][nx] === 1) {
        grid[y + dy / 2][x + dx / 2] = 0;
        walk(nx, ny);
      }
    }
  }

  walk(1, 1);
  return grid;
}

export function findFurthestPoint(grid: number[][], start: Point): Point {
  const rows = grid.length;
  const cols = grid[0].length;
  const distances: number[][] = Array.from({ length: rows }, () => Array(cols).fill(-1));
  
  const queue: [number, number, number][] = [[start.x, start.y, 0]];
  distances[start.y][start.x] = 0;
  
  let furthest: Point = start;
  let maxDist = 0;

  while (queue.length > 0) {
    const [x, y, d] = queue.shift()!;
    
    if (d > maxDist) {
      maxDist = d;
      furthest = { x, y };
    }

    const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
    for (const [dx, dy] of dirs) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && nx < cols && ny >= 0 && ny < rows && grid[ny][nx] === 0 && distances[ny][nx] === -1) {
        distances[ny][nx] = d + 1;
        queue.push([nx, ny, d + 1]);
      }
    }
  }

  return furthest;
}
