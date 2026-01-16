
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Point, Level, GameStats, ControlMode } from './types.ts';
import { LEVELS } from './levels.ts';

// Procedural Sound Engine
const createSoundEngine = () => {
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  
  const playTone = (freq: number, type: OscillatorType, duration: number, volume: number, fadeOut = true) => {
    if (ctx.state === 'suspended') ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    if (fadeOut) {
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    }
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + duration);
  };

  return {
    move: () => playTone(600, 'sine', 0.05, 0.1),
    collision: () => playTone(120, 'triangle', 0.1, 0.05),
    win: () => {
      const now = ctx.currentTime;
      [440, 554.37, 659.25, 880].forEach((f, i) => {
        playTone(f, 'sine', 0.6, 0.05 - (i * 0.01));
      });
    },
    click: () => playTone(800, 'sine', 0.03, 0.05),
    undo: () => {
      if (ctx.state === 'suspended') ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    }
  };
};

const Celebration: React.FC<{ active: boolean }> = ({ active }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<any[]>([]);

  useEffect(() => {
    if (!active) {
      particles.current = [];
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    // Create initial burst
    const colors = ['#0ea5e9', '#f43f5e', '#f59e0b', '#10b981'];
    for (let i = 0; i < 150; i++) {
      particles.current.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 20,
        vy: (Math.random() - 0.7) * 25,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
        gravity: 0.45,
        drag: 0.98,
        type: Math.random() > 0.5 ? 'square' : 'circle'
      });
    }

    let animationFrame: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particles.current.forEach((p, i) => {
        p.vx *= p.drag;
        p.vy *= p.drag;
        p.vy += p.gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, 1 - (p.y / canvas.height));
        
        if (p.type === 'square') {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });

      // Add a few more floating orbs occasionally
      if (Math.random() > 0.9) {
        particles.current.push({
          x: Math.random() * canvas.width,
          y: canvas.height + 10,
          vx: (Math.random() - 0.5) * 2,
          vy: -Math.random() * 3 - 2,
          size: Math.random() * 15 + 10,
          color: colors[Math.floor(Math.random() * colors.length)],
          rotation: 0,
          rotationSpeed: 0,
          gravity: -0.02,
          drag: 1,
          type: 'circle'
        });
      }

      // Remove off-screen particles
      particles.current = particles.current.filter(p => p.y < canvas.height + 100);

      animationFrame = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrame);
    };
  }, [active]);

  if (!active) return null;

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 pointer-events-none z-[45]"
    />
  );
};

const MiniMaze: React.FC<{ level: Level }> = ({ level }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 120;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const rows = level.grid.length;
    const cols = level.grid[0].length;
    const cellSize = size / Math.max(rows, cols);
    const offsetX = (size - cols * cellSize) / 2;
    const offsetY = (size - rows * cellSize) / 2;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, size, size);

    level.grid.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell === 1) {
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(offsetX + x * cellSize, offsetY + y * cellSize, cellSize, cellSize);
        }
      });
    });

    // Start
    ctx.fillStyle = '#0ea5e9';
    ctx.beginPath();
    ctx.arc(offsetX + level.start.x * cellSize + cellSize / 2, offsetY + level.start.y * cellSize + cellSize / 2, cellSize / 3, 0, Math.PI * 2);
    ctx.fill();

    // Exit
    ctx.fillStyle = '#f43f5e';
    ctx.beginPath();
    ctx.arc(offsetX + level.exit.x * cellSize + cellSize / 2, offsetY + level.exit.y * cellSize + cellSize / 2, cellSize / 3, 0, Math.PI * 2);
    ctx.fill();
  }, [level]);

  return (
    <div className="w-32 h-32 bg-slate-950 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center shadow-inner">
      <canvas ref={canvasRef} style={{ width: '120px', height: '120px' }} />
    </div>
  );
};

const App: React.FC = () => {
  const [currentLevelIdx, setCurrentLevelIdx] = useState(0);
  const [playerPos, setPlayerPos] = useState<Point>(LEVELS[0].start);
  const [history, setHistory] = useState<Point[]>([]);
  const [stats, setStats] = useState<GameStats>({
    moves: 0,
    seconds: 0,
    level: 1,
    bestSeconds: null,
    sessionMoves: 0,
    sessionSeconds: 0,
    levelsCleared: 0
  });
  const [controlMode, setControlMode] = useState<ControlMode>('buttons');
  const [isWon, setIsWon] = useState(false);
  const [showLevelSelect, setShowLevelSelect] = useState(false);
  const [hoveredLevelIdx, setHoveredLevelIdx] = useState<number | null>(null);
  const [difficultyFilter, setDifficultyFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [tiltData, setTiltData] = useState({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timerRef = useRef<number | null>(null);
  const lastTiltMoveRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);
  const sfx = useRef<ReturnType<typeof createSoundEngine> | null>(null);
  const starFieldRef = useRef<{x: number, y: number, s: number, a: number}[]>([]);
  const nebulaFieldRef = useRef<{x: number, y: number, r: number, c: string}[]>([]);

  const level = LEVELS[currentLevelIdx];

  // Initialize Parallax Fields
  useEffect(() => {
    const stars = [];
    for (let i = 0; i < 120; i++) {
      stars.push({
        x: Math.random() * 2000,
        y: Math.random() * 2000,
        s: Math.random() * 1.5 + 0.5,
        a: Math.random() * 0.4 + 0.1
      });
    }
    starFieldRef.current = stars;

    const nebulae = [];
    const colors = ['#0ea5e9', '#f43f5e', '#6366f1'];
    for (let i = 0; i < 15; i++) {
      nebulae.push({
        x: Math.random() * 2000,
        y: Math.random() * 2000,
        r: Math.random() * 100 + 50,
        c: colors[Math.floor(Math.random() * colors.length)]
      });
    }
    nebulaFieldRef.current = nebulae;
  }, []);

  // Initialize SFX
  useEffect(() => {
    const initAudio = () => {
      if (!sfx.current) sfx.current = createSoundEngine();
      window.removeEventListener('click', initAudio);
      window.removeEventListener('keydown', initAudio);
    };
    window.addEventListener('click', initAudio);
    window.addEventListener('keydown', initAudio);
  }, []);

  // Persistence
  useEffect(() => {
    const savedBest = localStorage.getItem(`zenmaze_best_${level.id}`);
    setStats(prev => ({
      ...prev,
      level: level.id,
      bestSeconds: savedBest ? parseInt(savedBest, 10) : null
    }));
  }, [level.id]);

  const handleWin = useCallback(() => {
    setIsWon(true);
    sfx.current?.win();
    if (timerRef.current) clearInterval(timerRef.current);
    
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate([50, 30, 100]);
    }

    setStats(prev => {
      const currentBest = prev.bestSeconds;
      let newBest = currentBest;
      if (currentBest === null || prev.seconds < currentBest) {
        localStorage.setItem(`zenmaze_best_${level.id}`, prev.seconds.toString());
        newBest = prev.seconds;
      }

      // Career Stat Persistence
      const careerMoves = parseInt(localStorage.getItem('zenmaze_total_moves') || '0', 10) + prev.moves;
      const careerSeconds = parseInt(localStorage.getItem('zenmaze_total_seconds') || '0', 10) + prev.seconds;
      const careerCleared = parseInt(localStorage.getItem('zenmaze_total_cleared') || '0', 10) + 1;
      
      localStorage.setItem('zenmaze_total_moves', careerMoves.toString());
      localStorage.setItem('zenmaze_total_seconds', careerSeconds.toString());
      localStorage.setItem('zenmaze_total_cleared', careerCleared.toString());

      return { 
        ...prev, 
        bestSeconds: newBest,
        sessionMoves: prev.sessionMoves + prev.moves,
        sessionSeconds: prev.sessionSeconds + prev.seconds,
        levelsCleared: prev.levelsCleared + 1
      };
    });
  }, [level.id]);

  const resetLevel = useCallback((idx: number) => {
    const targetLevel = LEVELS[idx];
    setPlayerPos(targetLevel.start);
    setHistory([]);
    setStats(prev => ({ 
      ...prev, 
      moves: 0, 
      seconds: 0, 
      level: targetLevel.id,
      bestSeconds: localStorage.getItem(`zenmaze_best_${targetLevel.id}`) 
        ? parseInt(localStorage.getItem(`zenmaze_best_${targetLevel.id}`)!, 10) 
        : null
    }));
    setIsWon(false);
    setCurrentLevelIdx(idx);
    
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setStats(prev => ({ ...prev, seconds: prev.seconds + 1 }));
    }, 1000);
  }, []);

  useEffect(() => {
    resetLevel(0);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  const move = useCallback((dx: number, dy: number) => {
    if (isWon) return;

    setPlayerPos(prev => {
      const nextX = prev.x + dx;
      const nextY = prev.y + dy;

      const isInsideBounds = 
        nextY >= 0 && nextY < level.grid.length &&
        nextX >= 0 && nextX < level.grid[0].length;
      
      const isWall = !isInsideBounds || level.grid[nextY][nextX] === 1;

      if (!isWall) {
        sfx.current?.move();
        setHistory(h => [...h, prev]);
        setStats(s => ({ ...s, moves: s.moves + 1 }));
        
        if (nextX === level.exit.x && nextY === level.exit.y) {
          handleWin();
        }
        
        return { x: nextX, y: nextY };
      } else {
        sfx.current?.collision();
        if (controlMode === 'tilt' && window.navigator && window.navigator.vibrate) {
          window.navigator.vibrate(15);
        }
        return prev;
      }
    });
  }, [level, isWon, controlMode, handleWin]);

  const undo = useCallback(() => {
    if (isWon) return;
    setHistory(prevHistory => {
      if (prevHistory.length === 0) return prevHistory;
      sfx.current?.undo();
      const newHistory = [...prevHistory];
      const lastPos = newHistory.pop();
      if (lastPos) {
        setPlayerPos(lastPos);
        setStats(s => ({ ...s, moves: Math.max(0, s.moves - 1) }));
      }
      return newHistory;
    });
  }, [isWon]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showLevelSelect) return;
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        undo();
        return;
      }
      switch (e.key) {
        case 'ArrowUp': move(0, -1); break;
        case 'ArrowDown': move(0, 1); break;
        case 'ArrowLeft': move(-1, 0); break;
        case 'ArrowRight': move(1, 0); break;
        case 'u': undo(); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [move, undo, showLevelSelect]);

  useEffect(() => {
    if (controlMode !== 'tilt') return;

    const handleOrientation = (e: DeviceOrientationEvent) => {
      const beta = e.beta || 0;
      const gamma = e.gamma || 0;
      const x = Math.max(-1, Math.min(1, gamma / 30));
      const y = Math.max(-1, Math.min(1, (beta - 45) / 30));
      setTiltData({ x, y });

      const now = Date.now();
      if (now - lastTiltMoveRef.current > 180) {
        const threshold = 0.4;
        if (Math.abs(x) > threshold || Math.abs(y) > threshold) {
          if (Math.abs(x) > Math.abs(y)) {
            move(x > 0 ? 1 : -1, 0);
          } else {
            move(0, y > 0 ? 1 : -1);
          }
          lastTiltMoveRef.current = now;
        }
      }
    };

    const requestPermission = async () => {
      if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
        try {
          const state = await (DeviceOrientationEvent as any).requestPermission();
          if (state === 'granted') window.addEventListener('deviceorientation', handleOrientation);
        } catch (err) { console.error(err); }
      } else {
        window.addEventListener('deviceorientation', handleOrientation);
      }
    };

    requestPermission();
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, [controlMode, move]);

  const render = useCallback((time: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rows = level.grid.length;
    const cols = level.grid[0].length;
    const padding = 10;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const cellSize = Math.min(
      (rect.width - padding * 2) / cols,
      (rect.height - padding * 2) / rows
    );

    const offsetX = (rect.width - cols * cellSize) / 2;
    const offsetY = (rect.height - rows * cellSize) / 2;

    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, rect.width, rect.height);

    const normX = playerPos.x / (cols || 1);
    const normY = playerPos.y / (rows || 1);

    const p1X = -normX * 20;
    const p1Y = -normY * 20;
    ctx.save();
    starFieldRef.current.forEach(star => {
      ctx.fillStyle = `rgba(148, 163, 184, ${star.a})`;
      ctx.beginPath();
      const sx = (star.x + p1X + 2000) % rect.width;
      const sy = (star.y + p1Y + 2000) % rect.height;
      ctx.arc(sx, sy, star.s, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();

    const p2X = -normX * 60;
    const p2Y = -normY * 60;
    ctx.save();
    nebulaFieldRef.current.forEach(orb => {
      const gradient = ctx.createRadialGradient(
        (orb.x + p2X + 2000) % rect.width,
        (orb.y + p2Y + 2000) % rect.height,
        0,
        (orb.x + p2X + 2000) % rect.width,
        (orb.y + p2Y + 2000) % rect.height,
        orb.r
      );
      gradient.addColorStop(0, orb.c + '11');
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(
        (orb.x + p2X + 2000) % rect.width,
        (orb.y + p2Y + 2000) % rect.height,
        orb.r,
        0,
        Math.PI * 2
      );
      ctx.fill();
    });
    ctx.restore();

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(offsetX, offsetY, cols * cellSize, rows * cellSize);

    level.grid.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell === 1) {
          ctx.fillStyle = '#1e293b';
          ctx.beginPath();
          ctx.roundRect(offsetX + x * cellSize + 1, offsetY + y * cellSize + 1, cellSize - 2, cellSize - 2, cellSize * 0.15);
          ctx.fill();
        }
      });
    });

    const pulse = (Math.sin(time / 400) + 1) / 2;
    const exitX = offsetX + level.exit.x * cellSize + cellSize / 2;
    const exitY = offsetY + level.exit.y * cellSize + cellSize / 2;
    
    ctx.save();
    ctx.shadowBlur = 10 + pulse * 15;
    ctx.shadowColor = '#f43f5e';
    ctx.fillStyle = `rgba(244, 63, 94, ${0.4 + pulse * 0.3})`;
    ctx.beginPath();
    ctx.arc(exitX, exitY, (cellSize / 3) + pulse * (cellSize / 8), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f43f5e';
    ctx.beginPath();
    ctx.arc(exitX, exitY, cellSize / 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const pX = offsetX + playerPos.x * cellSize + cellSize / 2;
    const pY = offsetY + playerPos.y * cellSize + cellSize / 2;
    
    ctx.save();
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#0ea5e9';
    ctx.fillStyle = '#0ea5e9';
    ctx.beginPath();
    ctx.arc(pX, pY, cellSize / 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7dd3fc';
    ctx.beginPath();
    ctx.arc(pX - cellSize/10, pY - cellSize/10, cellSize / 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    animationFrameRef.current = requestAnimationFrame(render);
  }, [level, playerPos]);

  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [render]);

  const filteredLevels = LEVELS.map((l, i) => ({ ...l, index: i }))
    .filter(l => {
      const matchesDiff = difficultyFilter === null || l.difficulty === difficultyFilter;
      const matchesSearch = searchQuery === '' || l.id.toString().includes(searchQuery);
      return matchesDiff && matchesSearch;
    });

  const tiltIntensity = Math.sqrt(tiltData.x ** 2 + tiltData.y ** 2);

  // FIX: Define previewLevel based on hover state or current level
  const previewLevel = hoveredLevelIdx !== null ? LEVELS[hoveredLevelIdx] : level;
  // FIX: Define difficultyOptions array
  const difficultyOptions: ('Easy' | 'Medium' | 'Hard' | 'Expert')[] = ['Easy', 'Medium', 'Hard', 'Expert'];

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto p-4 md:p-6 overflow-hidden">
      <Celebration active={isWon} />

      <div className="mb-6">
        <div className="flex justify-between items-end mb-2">
          <h1 className="text-2xl font-bold tracking-tight text-sky-400">
            ZEN MAZE <span className="text-slate-500 font-normal">Level {stats.level}</span>
          </h1>
          <span className="text-xs font-medium text-slate-400 uppercase tracking-widest">
            {level.difficulty}
          </span>
        </div>
        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-sky-500 transition-all duration-700 ease-out" 
            style={{ width: `${(stats.level / 500) * 100}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="bg-slate-900/50 border border-slate-800 p-3 rounded-2xl flex flex-col items-center">
          <span className="text-[10px] text-slate-500 uppercase font-bold mb-1">Time</span>
          <span className="text-lg font-mono font-bold text-white leading-none">{stats.seconds}s</span>
        </div>
        <div className="bg-slate-900/50 border border-slate-800 p-3 rounded-2xl flex flex-col items-center">
          <span className="text-[10px] text-slate-500 uppercase font-bold mb-1">Moves</span>
          <span className="text-lg font-mono font-bold text-white leading-none">{stats.moves}</span>
        </div>
        <div className="bg-slate-900/50 border border-slate-800 p-3 rounded-2xl flex flex-col items-center">
          <span className="text-[10px] text-slate-500 uppercase font-bold mb-1">Best</span>
          <span className="text-lg font-mono font-bold text-amber-500 leading-none">
            {stats.bestSeconds ? `${stats.bestSeconds}s` : '--'}
          </span>
        </div>
        <div className="bg-slate-900/50 border border-slate-800 p-3 rounded-2xl flex flex-col items-center">
          <span className="text-[10px] text-slate-500 uppercase font-bold mb-1">Size</span>
          <span className="text-lg font-mono font-bold text-white leading-none">
            {level.grid[0].length}×{level.grid.length}
          </span>
        </div>
      </div>

      <div className="flex-grow relative flex items-center justify-center bg-slate-900/30 rounded-3xl border border-slate-800/50 overflow-hidden mb-6">
        <canvas 
          ref={canvasRef} 
          className={`w-full h-full max-w-full max-h-full transition-all duration-500 ${isWon ? 'scale-90 opacity-40 blur-sm' : ''}`}
        />

        {isWon && (
          <div className="absolute inset-0 bg-white/10 animate-pulse pointer-events-none rounded-3xl" />
        )}

        {controlMode === 'tilt' && (
          <div className="absolute bottom-4 right-4 w-20 h-20 rounded-full border border-slate-700/50 bg-slate-900/40 flex items-center justify-center backdrop-blur-md shadow-inner overflow-hidden">
            <div 
              className="absolute inset-0 opacity-30 transition-all duration-100 ease-out"
              style={{ 
                background: `radial-gradient(circle at ${50 + tiltData.x * 40}% ${50 + tiltData.y * 40}%, #0ea5e9 0%, transparent 70%)`,
                transform: `scale(${1 + tiltIntensity * 0.5})`
              }}
            />
            <div className="absolute w-1 h-1 bg-slate-700 rounded-full opacity-50" />
            {tiltIntensity > 0.7 && (
              <div className="absolute w-full h-full rounded-full border border-sky-500/30 animate-ping" />
            )}
            <div 
              className="w-5 h-5 rounded-full bg-sky-500 transition-all duration-100 ease-out flex items-center justify-center"
              style={{ 
                transform: `translate(${tiltData.x * 28}px, ${tiltData.y * 28}px) scale(${1 + tiltIntensity * 0.3})`,
                boxShadow: `0 0 ${15 + tiltIntensity * 20}px rgba(14, 165, 233, ${0.4 + tiltIntensity * 0.6})`
              }}
            >
              <div className="w-1.5 h-1.5 bg-sky-200 rounded-full opacity-80 -translate-x-1 -translate-y-1" />
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-4 items-center mb-6">
        <button 
          onClick={() => { sfx.current?.click(); setShowLevelSelect(true); }}
          className="bg-slate-800 hover:bg-slate-700 w-14 h-14 rounded-2xl flex items-center justify-center transition-colors shadow-lg"
        >
          <i className="fa-solid fa-list-ul text-slate-300"></i>
        </button>
        
        <div className="flex-grow grid grid-cols-3 gap-2 h-14">
          <button 
            onClick={undo}
            disabled={history.length === 0}
            className={`rounded-2xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
              history.length === 0 ? 'bg-slate-900 text-slate-700 cursor-not-allowed opacity-50' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 shadow-lg'
            }`}
          >
            <i className="fa-solid fa-rotate-left"></i> Undo
          </button>
          <button 
            onClick={() => { sfx.current?.click(); resetLevel(currentLevelIdx); }}
            className="bg-slate-800 hover:bg-slate-700 rounded-2xl font-bold text-xs uppercase tracking-widest text-slate-300 flex items-center justify-center gap-2 shadow-lg"
          >
            <i className="fa-solid fa-rotate-right"></i> Reset
          </button>
          <button 
            onClick={() => { sfx.current?.click(); setControlMode(controlMode === 'buttons' ? 'tilt' : 'buttons'); }}
            className={`rounded-2xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
              controlMode === 'tilt' ? 'bg-sky-500 text-white shadow-xl shadow-sky-500/30' : 'bg-slate-800 text-slate-300 shadow-lg'
            }`}
          >
            <i className={`fa-solid ${controlMode === 'tilt' ? 'fa-mobile-screen' : 'fa-gamepad'}`}></i> 
            {controlMode === 'tilt' ? 'Tilt' : 'Buttons'}
          </button>
        </div>
      </div>

      {controlMode === 'buttons' && (
        <div className="grid grid-cols-3 gap-3 w-56 mx-auto pb-4 transition-all animate-in fade-in zoom-in duration-200">
          <div />
          <button onClick={() => move(0, -1)} className="w-16 h-16 bg-slate-800 active:bg-sky-600 rounded-2xl flex items-center justify-center text-2xl shadow-xl border border-slate-700 active:scale-90 transition-all">
            <i className="fa-solid fa-chevron-up"></i>
          </button>
          <div />
          <button onClick={() => move(-1, 0)} className="w-16 h-16 bg-slate-800 active:bg-sky-600 rounded-2xl flex items-center justify-center text-2xl shadow-xl border border-slate-700 active:scale-90 transition-all">
            <i className="fa-solid fa-chevron-left"></i>
          </button>
          <button onClick={() => move(0, 1)} className="w-16 h-16 bg-slate-800 active:bg-sky-600 rounded-2xl flex items-center justify-center text-2xl shadow-xl border border-slate-700 active:scale-90 transition-all">
            <i className="fa-solid fa-chevron-down"></i>
          </button>
          <button onClick={() => move(1, 0)} className="w-16 h-16 bg-slate-800 active:bg-sky-600 rounded-2xl flex items-center justify-center text-2xl shadow-xl border border-slate-700 active:scale-90 transition-all">
            <i className="fa-solid fa-chevron-right"></i>
          </button>
        </div>
      )}

      {/* Win Modal Overlay */}
      {isWon && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center z-50 p-4 md:p-6">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-[2.5rem] p-6 md:p-8 shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="w-14 h-14 bg-sky-500/20 text-sky-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fa-solid fa-trophy text-2xl animate-bounce"></i>
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-white mb-1 text-center uppercase tracking-tight">Level Complete!</h2>
            <p className="text-slate-500 mb-6 font-medium text-center">Mastered Maze {stats.level}</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
              {/* CURRENT MAZE */}
              <div className="bg-slate-800/40 p-4 rounded-3xl border border-slate-700/20">
                <p className="text-[10px] uppercase font-black text-sky-500 mb-2 tracking-widest text-center">This Maze</p>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[11px] text-slate-400 font-bold uppercase">Time</span>
                  <span className="text-sm font-mono font-bold text-white">{stats.seconds}s</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-slate-400 font-bold uppercase">Moves</span>
                  <span className="text-sm font-mono font-bold text-white">{stats.moves}</span>
                </div>
                {stats.bestSeconds && stats.seconds <= stats.bestSeconds && (
                    <div className="mt-2 text-[10px] font-black text-emerald-400 bg-emerald-400/10 py-1 text-center rounded-full border border-emerald-400/20 uppercase">New Record!</div>
                )}
              </div>

              {/* SESSION STATS */}
              <div className="bg-slate-800/40 p-4 rounded-3xl border border-slate-700/20">
                <p className="text-[10px] uppercase font-black text-slate-400 mb-2 tracking-widest text-center">Session</p>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[11px] text-slate-500 font-bold uppercase">Solved</span>
                  <span className="text-sm font-mono font-bold text-slate-200">{stats.levelsCleared}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-slate-500 font-bold uppercase">Time</span>
                  <span className="text-sm font-mono font-bold text-slate-200">{stats.sessionSeconds}s</span>
                </div>
              </div>

              {/* CAREER STATS */}
              <div className="bg-slate-950/50 p-4 rounded-3xl border border-slate-800/50">
                <p className="text-[10px] uppercase font-black text-amber-500 mb-2 tracking-widest text-center">Career</p>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[11px] text-slate-500 font-bold uppercase">Total Time</span>
                  <span className="text-sm font-mono font-bold text-slate-300">{localStorage.getItem('zenmaze_total_seconds') || 0}s</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-slate-500 font-bold uppercase">Total Moves</span>
                  <span className="text-sm font-mono font-bold text-slate-300">{localStorage.getItem('zenmaze_total_moves') || 0}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button 
                onClick={() => { sfx.current?.click(); resetLevel(currentLevelIdx + 1); }}
                className="w-full bg-sky-500 hover:bg-sky-400 text-white font-black py-4 rounded-2xl shadow-xl shadow-sky-500/30 transition-all active:scale-95 flex items-center justify-center gap-3"
              >
                NEXT MAZE <i className="fa-solid fa-arrow-right"></i>
              </button>
              <button 
                onClick={() => { sfx.current?.click(); setIsWon(false); }}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-4 rounded-2xl transition-all"
              >
                REPLAY THIS LEVEL
              </button>
            </div>
          </div>
        </div>
      )}

      {showLevelSelect && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl flex flex-col z-50 animate-in slide-in-from-bottom duration-300">
          <div className="p-6 flex flex-col border-b border-slate-800">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold tracking-tight uppercase">Select Maze</h2>
              <button onClick={() => { sfx.current?.click(); setShowLevelSelect(false); }} className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            
            <div className="mb-6 flex gap-6 items-center bg-slate-900/40 p-4 rounded-3xl border border-slate-800/50">
              <MiniMaze level={previewLevel} />
              <div className="flex-grow">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-2xl font-black text-white leading-none">LEVEL {previewLevel.id}</h3>
                  <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                    previewLevel.difficulty === 'Easy' ? 'bg-emerald-500/10 text-emerald-400' :
                    previewLevel.difficulty === 'Medium' ? 'bg-sky-500/10 text-sky-400' :
                    previewLevel.difficulty === 'Hard' ? 'bg-amber-500/10 text-amber-400' :
                    'bg-rose-500/10 text-rose-400'
                  }`}>
                    {previewLevel.difficulty}
                  </span>
                </div>
                <div className="flex flex-col gap-1 text-slate-500">
                  <div className="flex items-center gap-2">
                    <i className="fa-solid fa-maximize text-[10px]"></i>
                    <span className="text-xs font-mono">{previewLevel.grid[0].length} × {previewLevel.grid.length} Grid</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <i className="fa-solid fa-star text-[10px] text-amber-500"></i>
                    <span className="text-xs font-medium">
                      {localStorage.getItem(`zenmaze_best_${previewLevel.id}`) 
                        ? `Best: ${localStorage.getItem(`zenmaze_best_${previewLevel.id}`)}s` 
                        : 'No records yet'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative mb-6">
              <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"></i>
              <input 
                type="number"
                placeholder="Maze ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-3.5 pl-11 pr-12 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all"
              />
            </div>
            
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => { sfx.current?.click(); setDifficultyFilter(null); }}
                className={`px-4 py-2 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all border ${
                  difficultyFilter === null ? 'bg-sky-500 border-sky-500 text-white shadow-lg shadow-sky-500/20' : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                All
              </button>
              {difficultyOptions.map(diff => (
                <button
                  key={diff}
                  onClick={() => { sfx.current?.click(); setDifficultyFilter(diff); }}
                  className={`px-4 py-2 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all border ${
                    difficultyFilter === diff ? 'bg-sky-500 border-sky-500 text-white shadow-lg shadow-sky-500/20' : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {diff}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-grow overflow-y-auto p-4 md:p-8">
            {filteredLevels.length > 0 ? (
              <div className="grid grid-cols-5 md:grid-cols-10 gap-2 md:gap-4 pb-20">
                {filteredLevels.map((l) => (
                  <button
                    key={l.id}
                    onMouseEnter={() => setHoveredLevelIdx(l.index)}
                    onMouseLeave={() => setHoveredLevelIdx(null)}
                    onClick={() => {
                      sfx.current?.click();
                      resetLevel(l.index);
                      setShowLevelSelect(false);
                    }}
                    className={`aspect-square rounded-xl font-bold text-sm flex items-center justify-center transition-all ${
                      l.index === currentLevelIdx ? 'bg-sky-500 text-white ring-4 ring-sky-500/30 scale-110 shadow-xl' : 
                      localStorage.getItem(`zenmaze_best_${l.id}`) ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700/50' : 'bg-slate-900/50 text-slate-700 border border-slate-900 hover:border-slate-800'
                    }`}
                  >
                    {l.id}
                  </button>
                ))}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-600">
                <i className="fa-solid fa-ghost text-4xl mb-2 opacity-20"></i>
                <p className="font-medium">No results found.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
