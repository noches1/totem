import { useEffect, useRef, useState } from "react";
import { sendCanvas } from "./api";

export type Pixel = [number, number, number];
type Matrix = Pixel[][];

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

const MATRIX_SIZE = 64;
const PIPE_LENGTH = 24;
const PIPE_TOP_Y = 0;
const BOTTOM_PIPE_Y = MATRIX_SIZE - PIPE_LENGTH;

const INITIAL_GAME_STATE: GameState = {
  bird: {
    x: 10,
    y: 32,
  },
  pipes: [
    {
      x: 20,
      y: PIPE_TOP_Y,
    },
    {
      x: 40,
      y: BOTTOM_PIPE_Y,
    },
    {
      x: 60,
      y: PIPE_TOP_Y,
    },
  ],
};

// prettier-ignore
const birdPixelArray = [
  [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, "#FFFF00", "#FFFF00", "#FFFF00", null, null, null, null, null, null],
  [null, null, null, null, null, null, "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", null, null, null, null],
  [null, null, null, null, null, null, "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#000000", "#FFFF00", "#FF9900", null, null, null],
  [null, null, null, null, null, null, "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FF9900", "#FF9900", "#FF9900", null],
  ["#FFFF00", null, "#FFFF00", "#FFFF00", "#FFFF00", null, "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FF9900", "#FF9900", "#FF9900", "#FF9900"],
  [null, "#FFFF00", "#000000", "#FFFF00", "#FFFF00", "#FFFF00", null, "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FF9900", "#FF9900", null, null],
  [null, null, "#FFFF00", "#000000", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", null, null, null],
  [null, "#FFFF00", "#FFFF00", "#FFFF00", "#000000", "#FFFF00", "#FFFF00", "#FFFF00", "#000000", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", null, null],
  [null, null, "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#000000", "#000000", "#000000", "#000000", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", null],
  [null, null, "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", null],
  [null, null, null, null, "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", null, null],
  [null, null, null, null, null, "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", null, null, null],
  [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null]
];

const drawBird = (matrix: Matrix, bird: { x: number; y: number }) => {
  // Calculate the top-left position to center the bird
  const startX = bird.x - 8;
  const startY = bird.y - 8;

  // Draw the bird pixel by pixel
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const matrixY = startY + y;
      const matrixX = startX + x;

      // Only draw if within matrix bounds
      if (
        matrixY >= 0 &&
        matrixY < MATRIX_SIZE &&
        matrixX >= 0 &&
        matrixX < MATRIX_SIZE
      ) {
        const color = birdPixelArray[y][x];
        // Convert color to grayscale value between 0 and 100
        if (color) {
          // Extract RGB values from hex color
          const r = parseInt(color.slice(1, 3), 16);
          const g = parseInt(color.slice(3, 5), 16);
          const b = parseInt(color.slice(5, 7), 16);
          matrix[matrixY][matrixX] = [r, g, b];
        }
      }
    }
  }
};

const getEmptyMatrix = (): Matrix => {
  const size = 64;
  return Array(size)
    .fill(null)
    .map(() => Array(size).fill([0, 0, 0]));
};

const getGameStateMatrix = (gameState: GameState): Matrix => {
  const matrix = getEmptyMatrix();

  // Draw pipes
  gameState.pipes.forEach((pipe) => {
    for (let y = 0; y < PIPE_LENGTH; y++) {
      matrix[pipe.y + y][pipe.x] = [255, 255, 255];
    }
  });

  // Draw bird
  drawBird(matrix, gameState.bird);

  return matrix;
};

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
      y: Math.random() < 0.5 ? PIPE_TOP_Y : BOTTOM_PIPE_Y,
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
  const W = 64;
  const H = 64;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  if (canvasRef.current) {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (ctx != null) {
      const imgData = ctx.createImageData(W, H);
      const data = imgData.data;
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const i = (y * W + x) * 4;
          const [r, g, b] = matrix[y][x];
          data[i + 0] = r;
          data[i + 1] = g;
          data[i + 2] = b;
          data[i + 3] = 255;
        }
      }
      ctx.putImageData(imgData, 0, 0);
    }
  }
  return (
    <canvas
      width={64}
      height={64}
      className="aspect-square border"
      ref={canvasRef}
      style={{ imageRendering: "pixelated" }}
    >
      {matrix.map((row, i) =>
        row.map((cell, j) => (
          <div
            key={`${i}-${j}`}
            style={{
              backgroundColor: `rgba(${cell[0]}, ${cell[1]}, ${cell[2]}, 1)`,
            }}
          />
        )),
      )}
    </canvas>
  );
};
