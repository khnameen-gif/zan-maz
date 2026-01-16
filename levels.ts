
import { Level } from './types.ts';
import { generateMaze, findFurthestPoint } from './mazeGenerator.ts';

function getLevelDifficulty(id: number): 'Easy' | 'Medium' | 'Hard' | 'Expert' {
  if (id <= 20) return 'Easy';
  if (id <= 100) return 'Medium';
  if (id <= 300) return 'Hard';
  return 'Expert';
}

function getLevelSize(id: number): number {
  const base = 9;
  const growth = Math.floor(id / 15) * 2;
  return Math.min(base + growth, 41);
}

export const LEVELS: Level[] = Array.from({ length: 500 }, (_, i) => {
  const id = i + 1;
  const size = getLevelSize(id);
  const grid = generateMaze(size, size);
  const start = { x: 1, y: 1 };
  const exit = findFurthestPoint(grid, start);

  return {
    id,
    difficulty: getLevelDifficulty(id),
    grid,
    start,
    exit
  };
});
