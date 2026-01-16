
export interface Point {
  x: number;
  y: number;
}

export interface Level {
  id: number;
  grid: number[][];
  start: Point;
  exit: Point;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Expert';
}

export interface GameStats {
  moves: number;
  seconds: number;
  level: number;
  bestSeconds: number | null;
  sessionMoves: number;
  sessionSeconds: number;
  levelsCleared: number;
}

export type ControlMode = 'tilt' | 'buttons' | 'keys';
