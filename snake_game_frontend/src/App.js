import React, { useRef, useEffect, useState, useCallback } from 'react';
import './App.css';

/**
 * PUBLIC_INTERFACE
 * The main Snake Game component.
 * - Renders an interactive snake game board and handles all game logic and UI.
 */
const BOARD_SIZE = 20; // 20x20 grid
const INITIAL_SNAKE = [
  { x: 9, y: 10 },
  { x: 8, y: 10 },
  { x: 7, y: 10 }
];
const INITIAL_DIRECTION = { x: 1, y: 0 };
const SPEED = 110; // ms per frame

const COLORS = {
  board: '#fff',
  snake: '#3b5998', // primary
  head: '#fdd835', // accent
  food: '#5bc236', // secondary
  border: '#e9ecef',
  gameOverBg: 'rgba(0,0,0,0.91)',
  text: '#222'
};

function getRandomFood(snake) {
  // Exclude squares occupied by snake
  let newFood;
  do {
    newFood = {
      x: Math.floor(Math.random() * BOARD_SIZE),
      y: Math.floor(Math.random() * BOARD_SIZE)
    };
  } while (snake.some(segment => segment.x === newFood.x && segment.y === newFood.y));
  return newFood;
}

function areEqual(a, b) {
  return a.x === b.x && a.y === b.y;
}

function useInterval(callback, delay, active = true) {
  const savedCallback = useRef();
  useEffect(() => { savedCallback.current = callback; }, [callback]);
  useEffect(() => {
    if (!active) return;
    if (delay === null) return;
    const id = setInterval(() => savedCallback.current(), delay);
    return () => clearInterval(id);
  }, [delay, active]);
}

// PUBLIC_INTERFACE
function App() {
  // Game state
  const [snake, setSnake] = useState(INITIAL_SNAKE);
  const [direction, setDirection] = useState(INITIAL_DIRECTION);
  const [food, setFood] = useState(getRandomFood(INITIAL_SNAKE));
  const [score, setScore] = useState(0);
  const [running, setRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [theme, setTheme] = useState('light');

  // Touch state (for swipes)
  const touchStart = useRef(null);
  const [boardFocused, setBoardFocused] = useState(false);

  // Handle theme globally
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Start/restart game
  const startGame = useCallback(() => {
    setSnake(INITIAL_SNAKE);
    setDirection(INITIAL_DIRECTION);
    setFood(getRandomFood(INITIAL_SNAKE));
    setScore(0);
    setRunning(true);
    setGameOver(false);
  }, []);

  // Game Loop
  useInterval(
    () => {
      setSnake(prevSnake => {
        if (!running || gameOver) return prevSnake;
        const head = prevSnake[0];
        const next = { x: head.x + direction.x, y: head.y + direction.y };

        // Check game over (out of bounds or self-collision)
        if (
          next.x < 0 ||
          next.y < 0 ||
          next.x >= BOARD_SIZE ||
          next.y >= BOARD_SIZE ||
          prevSnake.some(seg => areEqual(seg, next))
        ) {
          setGameOver(true);
          setRunning(false);
          return prevSnake;
        }

        let newSnake;
        if (areEqual(next, food)) {
          // Eat food, grow snake
          newSnake = [next, ...prevSnake];
          setFood(getRandomFood(newSnake));
          setScore(sc => sc + 1);
        } else {
          // Move snake
          newSnake = [next, ...prevSnake.slice(0, -1)];
        }
        return newSnake;
      });
    },
    SPEED,
    running && !gameOver
  );

  // Keyboard controls
  useEffect(() => {
    if (!running) return;
    function handle(e) {
      let { x, y } = direction;
      switch (e.key) {
        case 'ArrowUp': case 'w': case 'W':
          if (y !== 1) setDirection({ x: 0, y: -1 });
          break;
        case 'ArrowDown': case 's': case 'S':
          if (y !== -1) setDirection({ x: 0, y: 1 });
          break;
        case 'ArrowLeft': case 'a': case 'A':
          if (x !== 1) setDirection({ x: -1, y: 0 });
          break;
        case 'ArrowRight': case 'd': case 'D':
          if (x !== -1) setDirection({ x: 1, y: 0 });
          break;
        default:
      }
    }
    window.addEventListener('keydown', handle, { passive: false });
    return () => window.removeEventListener('keydown', handle);
  }, [direction, running]);

  // Touch controls (swipe)
  function onTouchStart(e) {
    if (!running) return;
    const touch = e.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
  }
  function onTouchEnd(e) {
    if (!running || !touchStart.current) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStart.current.x;
    const dy = touch.clientY - touchStart.current.y;
    if (Math.abs(dx) < 15 && Math.abs(dy) < 15) return;
    let { x, y } = direction;
    if (Math.abs(dx) > Math.abs(dy)) {
      // Horizontal swipe
      if (dx > 0 && x !== -1) setDirection({ x: 1, y: 0 });
      else if (dx < 0 && x !== 1) setDirection({ x: -1, y: 0 });
    } else {
      // Vertical swipe
      if (dy > 0 && y !== -1) setDirection({ x: 0, y: 1 });
      else if (dy < 0 && y !== 1) setDirection({ x: 0, y: -1 });
    }
    touchStart.current = null;
  }

  // Board rendering
  function renderBoard() {
    // 1px border between cells, so cell size should ensure board fits snugly
    return (
      <div
        className="snake-board"
        tabIndex={0}
        onFocus={() => setBoardFocused(true)}
        onBlur={() => setBoardFocused(false)}
        data-focused={boardFocused}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        role="region"
        aria-label="Snake game board"
        style={{
          outline: boardFocused ? `2px solid ${COLORS.primary}` : 'none',
        }}
      >
        {[...Array(BOARD_SIZE * BOARD_SIZE).keys()].map((idx) => {
          const x = idx % BOARD_SIZE;
          const y = Math.floor(idx / BOARD_SIZE);
          const isHead = areEqual({ x, y }, snake[0]);
          const isSnake = snake.some((seg, i) => i !== 0 && areEqual(seg, { x, y }));
          const isFood = areEqual({ x, y }, food);

          return (
            <div
              key={idx}
              className="cell"
              style={{
                background: isHead
                  ? COLORS.head
                  : isSnake
                  ? COLORS.snake
                  : isFood
                  ? COLORS.food
                  : 'transparent',
                border: `1px solid ${COLORS.border}`,
                transition: 'background 0.1s',
              }}
              aria-label={
                isHead
                  ? 'Snake head'
                  : isSnake
                  ? 'Snake'
                  : isFood
                  ? 'Food'
                  : undefined
              }
            />
          );
        })}
      </div>
    );
  }

  // PUBLIC_INTERFACE
  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  return (
    <div className="App" style={{ background: COLORS.board, minHeight: "100vh" }}>
      <header className="snake-header">
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
        </button>
        <h1 className="snake-title">Snake</h1>
        <div className="score-box" style={{ color: COLORS.primary }}>
          <span>Score: </span>
          <span style={{ fontWeight: 700 }}>{score}</span>
        </div>
      </header>

      <main className="snake-main">
        <div className="snake-board-container">
          {/* Game Board */}
          {renderBoard()}
          {/* Game Over overlay */}
          {gameOver && (
            <div className="game-over-screen">
              <div className="game-over-panel">
                <div className="game-over-title">Game Over</div>
                <div className="game-over-score">Score: {score}</div>
                <button
                  className="snake-btn snake-btn-accent"
                  onClick={startGame}
                >
                  Restart Game
                </button>
              </div>
            </div>
          )}
        </div>
        {/* Start button (only if not running and not game over) */}
        {!running && !gameOver && (
          <button
            className="snake-btn snake-btn-primary start-btn"
            onClick={startGame}
            autoFocus
          >
            Start Game
          </button>
        )}
      </main>

      <footer className="snake-footer">
        <div style={{ fontSize: 13, color: '#93a3b1', opacity: 0.7, marginTop: 14 }}>
          Controls: <span style={{ color: COLORS.primary }}>⭠⭢⭡⭣</span> (or WASD), tap or swipe for mobile.
        </div>
      </footer>
    </div>
  );
}

export default App;
