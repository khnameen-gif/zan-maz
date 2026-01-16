
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Point, Level, GameStats, ControlMode } from './types';
import { LEVELS } from './levels';

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

const VisualTimer: React.FC<{ seconds: number; best: number | null }> = ({ seconds, best }) => {
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  
  let progress = 0;
  if (best && best > 0) {
    progress = Math.min(seconds / best, 1);
  } else {
    progress = (seconds % 60) / 60;
  }
  
  const offset = circumference - progress * circumference;
  const isOverBest = best !== null && seconds > best;

  return (
    <div className="absolute top-4 left-4 flex items-center gap-3 bg-slate-950/40 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-700/50 shadow-2xl pointer-events-none z-10">
      <div className="relative w-12 h-12 flex items-center justify-center">
        <svg className="w-full h-full -rotate-90 drop-shadow-[0_0_8px_rgba(14,165,233,0.3)]">
          <circle
            cx="24"
            cy="24"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            className="text-slate-800/80"
          />
          <circle
            cx="24"
            cy="24"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className={`${isOverBest ? 'text-rose-500' : 'text-sky-500'} transition-all duration-1000 ease-linear`}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
           <i className={`fa-solid fa-clock-rotate-left text-[10px] ${isOverBest ? 'text-rose-400' : 'text-sky-400 opacity-40'}`}></i>
        </div>
      </div>
      <div className="flex flex-col">
        <span className="text-[10px] uppercase font-black text-slate-500 leading-none mb-0.5 tracking-wider">Elapsed</span>
        <span className={`text-lg font-mono font-bold leading-none ${isOverBest ? 'text-rose-400' : 'text-white'}`}>
          {seconds}s
        </span>
      </div>
    </div>
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
    bestSeconds: null
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

  const level = LEVELS[currentLevelIdx];

  // Initialize SFX engine on first user interaction
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
      if (currentBest === null || prev.seconds < currentBest) {
        localStorage.setItem(`zenmaze_best_${level.id}`, prev.seconds.toString());
        return { ...prev, bestSeconds: prev.seconds };
      }
      return prev;
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
  }, []); // Only run once on mount

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

  // Keyboard controls
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

  // Tilt controls handler
  useEffect(() => {
    if (controlMode !== 'tilt') return;

    const handleOrientation = (e: DeviceOrientationEvent) => {
      const beta = e.beta || 0;  // -180 to 180 (forward/backward)
      const gamma = e.gamma || 0; // -90 to 90 (left/right)
      
      const x = Math.max(-1, Math.min(1, gamma / 30));
      const y = Math.max(-1, Math.min(1, (beta - 45) / 30)); // 45deg is neutral tilt
      setTiltData({ x, y });

      const now = Date.now();
      if (now - lastTiltMoveRef.current > 180) { // Threshold for tilt movement speed
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

  // Rendering
  const render = useCallback((time: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rows = level.grid.length;
    const cols = level.grid[0].length;
    const padding = 10;
    
    // Scale canvas to device pixel ratio
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

    ctx.clearRect(0, 0, rect.width, rect.height);

    // Background Grid
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(offsetX, offsetY, cols * cellSize, rows * cellSize);

    // Draw Walls
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

    // Draw Exit
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

    // Draw Player
    const pX = offsetX + playerPos.x * cellSize + cellSize / 2;
    const pY = offsetY + playerPos.y * cellSize + cellSize / 2;
    
    ctx.save();
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#0ea5e9';
    ctx.fillStyle = '#0ea5e9';
    ctx.beginPath();
    ctx.arc(pX, pY, cellSize / 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Player inner glow
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

  const handleLevelSelectOpen = () => {
    sfx.current?.click();
    setShowLevelSelect(true);
  };

  const handleControlModeToggle = () => {
    sfx.current?.click();
    setControlMode(controlMode === 'buttons' ? 'tilt' : 'buttons');
  };

  const handleReset = () => {
    sfx.current?.click();
    resetLevel(currentLevelIdx);
  };

  const filteredLevels = LEVELS.map((l, i) => ({ ...l, index: i }))
    .filter(l => {
      const matchesDiff = difficultyFilter === null || l.difficulty === difficultyFilter;
      const matchesSearch = searchQuery === '' || l.id.toString().includes(searchQuery);
      return matchesDiff && matchesSearch;
    });

  const difficultyOptions = ['Easy', 'Medium', 'Hard', 'Expert'];

  const previewLevel = hoveredLevelIdx !== null ? LEVELS[hoveredLevelIdx] : LEVELS[currentLevelIdx];

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto p-4 md:p-6 overflow-hidden">
      {/* Celebration Animation Canvas */}
      <Celebration active={isWon} />

      {/* Header & Progress */}
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

      {/* Stats Cards */}
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

      {/* Main Game View */}
      <div className="flex-grow relative flex items-center justify-center bg-slate-900/30 rounded-3xl border border-slate-800/50 overflow-hidden mb-6">
        {/* Visual Timer Overlay */}
        <VisualTimer seconds={stats.seconds} best={stats.bestSeconds} />

        <canvas 
          ref={canvasRef} 
          className={`w-full h-full max-w-full max-h-full transition-all duration-500 ${isWon ? 'scale-90 opacity-40 blur-sm' : ''}`}
        />

        {/* Victory Flash */}
        {isWon && (
          <div className="absolute inset-0 bg-white/10 animate-pulse pointer-events-none rounded-3xl" />
        )}

        {/* Tilt Indicator Overlay */}
        {controlMode === 'tilt' && (
          <div className="absolute bottom-4 right-4 w-16 h-16 rounded-full border border-slate-700 bg-slate-900/50 flex items-center justify-center backdrop-blur-sm">
            <div 
              className="w-4 h-4 rounded-full bg-sky-500 shadow-lg shadow-sky-500/50 transition-transform duration-75"
              style={{ transform: `translate(${tiltData.x * 20}px, ${tiltData.y * 20}px)` }}
            />
          </div>
        )}
      </div>

      {/* Controls Bar */}
      <div className="flex gap-4 items-center mb-6">
        <button 
          onClick={handleLevelSelectOpen}
          className="bg-slate-800 hover:bg-slate-700 w-14 h-14 rounded-2xl flex items-center justify-center transition-colors shadow-lg"
          title="Level Select"
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
            onClick={handleReset}
            className="bg-slate-800 hover:bg-slate-700 rounded-2xl font-bold text-xs uppercase tracking-widest text-slate-300 flex items-center justify-center gap-2 shadow-lg"
          >
            <i className="fa-solid fa-rotate-right"></i> Reset
          </button>
          <button 
            onClick={handleControlModeToggle}
            className={`rounded-2xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
              controlMode === 'tilt' ? 'bg-sky-500 text-white shadow-xl shadow-sky-500/30' : 'bg-slate-800 text-slate-300 shadow-lg'
            }`}
          >
            <i className={`fa-solid ${controlMode === 'tilt' ? 'fa-mobile-screen' : 'fa-gamepad'}`}></i> 
            {controlMode === 'tilt' ? 'Tilt' : 'Buttons'}
          </button>
        </div>
      </div>

      {/* Directional Buttons (Visible whenever in 'buttons' mode) */}
      {controlMode === 'buttons' && (
        <div className="grid grid-cols-3 gap-3 w-56 mx-auto pb-4 transition-all animate-in fade-in zoom-in duration-200">
          <div />
          <button 
            onClick={() => move(0, -1)} 
            className="w-16 h-16 bg-slate-800 active:bg-sky-600 rounded-2xl flex items-center justify-center text-2xl shadow-xl border border-slate-700 active:scale-90 transition-all"
          >
            <i className="fa-solid fa-chevron-up"></i>
          </button>
          <div />
          <button 
            onClick={() => move(-1, 0)} 
            className="w-16 h-16 bg-slate-800 active:bg-sky-600 rounded-2xl flex items-center justify-center text-2xl shadow-xl border border-slate-700 active:scale-90 transition-all"
          >
            <i className="fa-solid fa-chevron-left"></i>
          </button>
          <button 
            onClick={() => move(0, 1)} 
            className="w-16 h-16 bg-slate-800 active:bg-sky-600 rounded-2xl flex items-center justify-center text-2xl shadow-xl border border-slate-700 active:scale-90 transition-all"
          >
            <i className="fa-solid fa-chevron-down"></i>
          </button>
          <button 
            onClick={() => move(1, 0)} 
            className="w-16 h-16 bg-slate-800 active:bg-sky-600 rounded-2xl flex items-center justify-center text-2xl shadow-xl border border-slate-700 active:scale-90 transition-all"
          >
            <i className="fa-solid fa-chevron-right"></i>
          </button>
        </div>
      )}

      {/* Win Modal Overlay */}
      {isWon && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center z-50 p-6">
          <div className="bg-slate-900 border border-slate-800 w-full max-sm:w-full max-w-sm rounded-[2.5rem] p-8 text-center shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 bg-sky-500/20 text-sky-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <i className="fa-solid fa-trophy text-4xl animate-bounce"></i>
            </div>
            <h2 className="text-3xl font-black text-white mb-2">SOLVED!</h2>
            <p className="text-slate-400 mb-8 font-medium">You completed level {stats.level} with grace.</p>
            
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-slate-800/50 p-4 rounded-3xl">
                <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Total Time</p>
                <p className="text-xl font-mono font-bold text-white">{stats.seconds}s</p>
              </div>
              <div className="bg-slate-800/50 p-4 rounded-3xl">
                <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Total Moves</p>
                <p className="text-xl font-mono font-bold text-white">{stats.moves}</p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button 
                onClick={() => { sfx.current?.click(); resetLevel(currentLevelIdx + 1); }}
                className="w-full bg-sky-500 hover:bg-sky-400 text-white font-black py-4 rounded-2xl shadow-xl shadow-sky-500/30 transition-all active:scale-95"
              >
                NEXT MAZE
              </button>
              <button 
                onClick={() => { sfx.current?.click(); setIsWon(false); }}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-4 rounded-2xl transition-all"
              >
                REPLAY
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Level Select Modal */}
      {showLevelSelect && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl flex flex-col z-50 animate-in slide-in-from-bottom duration-300">
          <div className="p-6 flex flex-col border-b border-slate-800">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold tracking-tight">SELECT LEVEL</h2>
              <button onClick={() => { sfx.current?.click(); setShowLevelSelect(false); }} className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            
            {/* Preview Area */}
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
                        ? `Personal Best: ${localStorage.getItem(`zenmaze_best_${previewLevel.id}`)}s` 
                        : 'No records yet'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative mb-6">
              <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"></i>
              <input 
                type="number"
                placeholder="Find level by ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-3.5 pl-11 pr-12 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all"
              />
              {searchQuery && (
                <button 
                  onClick={() => { sfx.current?.click(); setSearchQuery(''); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 bg-slate-800 rounded-full flex items-center justify-center text-slate-400 hover:text-white"
                >
                  <i className="fa-solid fa-xmark text-[10px]"></i>
                </button>
              )}
            </div>
            
            {/* Filters */}
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
                <div className="w-16 h-16 bg-slate-900/50 rounded-full flex items-center justify-center mb-4">
                  <i className="fa-solid fa-magnifying-glass text-2xl opacity-20"></i>
                </div>
                <p className="font-medium">No levels found.</p>
                <p className="text-sm opacity-60">Try a different search or filter.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
