import { useEffect, useState } from "react";
import { sendCanvas } from "./api";

type Matrix = number[][];

type GameState = {
  bird: {
    x: number;
    y: number;
  };
  pipes: {
    x: number;
    y: number;
  }[];
};

const INITIAL_GAME_STATE: GameState = {
  bird: {
    x: 32,
    y: 32,
  },
  pipes: [
    {
      x: 40,
      y: 0,
    },
    {
      x: 50,
      y: 32,
    },
    {
      x: 63,
      y: 0,
    },
  ],
};

const getEmptyMatrix = (): Matrix => {
  const size = 64;
  return Array(size)
    .fill(0)
    .map(() => Array(size).fill(0));
};

const getGameStateMatrix = (gameState: GameState): Matrix => {
  const matrix = getEmptyMatrix();

  // Draw pipes
  gameState.pipes.forEach((pipe) => {
    for (let y = 0; y < 32; y++) {
      matrix[pipe.y + y][pipe.x] = 100;
    }
  });

  // Draw bird
  matrix[gameState.bird.y][gameState.bird.x] = 100;

  return matrix;
};

// const testMatrix: Matrix = (() => {
//   // Create a 64x64 matrix
//   const size = 64;
//   const result: Matrix = Array(size)
//     .fill(0)
//     .map(() => Array(size).fill(0));
//
//   // Draw a simple pattern - a circle in the middle
//   const centerX = size / 2;
//   const centerY = size / 2;
//   const radius = size / 4;
//
//   for (let y = 0; y < size; y++) {
//     for (let x = 0; x < size; x++) {
//       // Calculate distance from center
//       const distance = Math.sqrt(
//         Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
//       );
//
//       // Set intensity based on distance from center
//       if (distance < radius) {
//         result[y][x] = 80; // Solid inside
//       } else if (distance < radius + 5) {
//         result[y][x] = 50; // Gradient edge
//       } else if (distance < radius + 10) {
//         result[y][x] = 20; // Faint outer edge
//       }
//     }
//   }
//
//   return result;
// })();

const birdJump = (gameState: GameState): GameState => {
  const newGameState = { ...gameState };
  newGameState.bird.y -= 3;
  return newGameState;
};

const getNextFrame = (gameState: GameState): GameState => {
  const newGameState = {
    ...gameState,
    bird: {
      x: gameState.bird.x,
      y: gameState.bird.y + 1,
    },
    pipes: gameState.pipes.map((pipe) => ({
      x: pipe.x - 1,
      y: pipe.y,
    })),
  };
  if (newGameState.pipes[0].x < 0) {
    newGameState.pipes.shift();
    newGameState.pipes.push({
      x: 63,
      y: Math.random() < 0.5 ? 0 : 32,
    });
  }
  if (newGameState.bird.y >= 64) {
    newGameState.bird.y = 63;
  }
  if (newGameState.bird.y < 0) {
    newGameState.bird.y = 0;
  }
  sendCanvas(getGameStateMatrix(newGameState));
  return newGameState;
};

export const FlappyBird = () => {
  const [gameState, setGameState] = useState<GameState>(INITIAL_GAME_STATE);
  const matrix = getGameStateMatrix(gameState);
  useEffect(() => {
    const interval = setInterval(() => {
      setGameState((s) => getNextFrame(s));
    }, 100);
    return () => clearInterval(interval);
  }, []);
  return (
    <div
      className="flex flex-col gap-2"
      onClick={() => setGameState((s) => getNextFrame(birdJump(s)))}
    >
      <p className="text-2xl font-bold text-center mt-4">flappy bird</p>
      <Matrix matrix={matrix} />
    </div>
  );
};

export const Matrix = ({ matrix }: { matrix: Matrix }) => {
  return (
    <div className="grid grid-cols-64 grid-rows-64 aspect-square border-1 border-white">
      {matrix.map((row, i) =>
        row.map((cell, j) => (
          <div
            key={`${i}-${j}`}
            style={{
              backgroundColor: `rgba(255, 255, 255, ${cell / 100})`,
            }}
          />
        )),
      )}
    </div>
  );
};
