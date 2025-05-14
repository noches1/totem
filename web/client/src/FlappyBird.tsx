import { useEffect, useRef, useState } from "react";
import { sendCanvas } from "./api";
import { useInterval } from "./useInterval";

export type Pixel = [number, number, number];
type Matrix = Pixel[][];

const GRAVITY = 300;
const MAX_SPEED = 100;

type GameState = {
  state: "playing" | "dead";
  score: number;
  bird: {
    x: number;
    y: number;
    vy: number;
  };
  pipes: {
    x: number;
    position: "top" | "bottom";
  }[];
};

const MATRIX_SIZE = 64;
const PIPE_LENGTH = 24;

const INITIAL_GAME_STATE: GameState = {
  state: "dead",
  score: 0,
  bird: {
    x: 10,
    y: 32,
    vy: 0,
  },
  pipes: [
    {
      x: 30,
      position: "top",
    },
    {
      x: 60,
      position: "bottom",
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
  ["#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#000000", "#FFFF00", "#FFFF00", "#FFFF00", "#000000", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", null, null],
  [null, "FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#000000", "#000000", "#000000", "#000000", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", null],
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
          matrix[Math.floor(matrixY)][Math.floor(matrixX)] = [r, g, b];
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

const PIPE_COLOUR = [0, 255, 0] as Pixel;

const getGameStateMatrix = (gameState: GameState): Matrix => {
  const matrix = getEmptyMatrix();

  // Draw pipes
  gameState.pipes.forEach((pipe) => {
    for (let i = 0; i < PIPE_LENGTH; i++) {
      let y;
      if (pipe.position === "top") {
        y = i;
      } else {
        y = MATRIX_SIZE - i - 1;
      }
      matrix[y][pipe.x] = PIPE_COLOUR;
      if (pipe.x + 1 < MATRIX_SIZE) {
        matrix[y][pipe.x + 1] = PIPE_COLOUR;
      }
      if (pipe.x + 2 < MATRIX_SIZE) {
        matrix[y][pipe.x + 2] = PIPE_COLOUR;
      }
      if (i > (PIPE_LENGTH * 3) / 4) {
        if (pipe.x + 3 < MATRIX_SIZE) {
          matrix[y][pipe.x + 3] = PIPE_COLOUR;
        }
        if (pipe.x - 1 >= 0) {
          matrix[y][pipe.x - 1] = PIPE_COLOUR;
        }
      }
    }
  });

  // Draw bird
  drawBird(matrix, gameState.bird);

  return matrix;
};

const birdJump = (gameState: GameState): GameState => {
  if (gameState.state === "dead") {
    return { ...gameState, state: "playing" as const };
  }
  const newGameState = { ...gameState, state: "playing" as const };
  newGameState.bird.vy = -100;
  return newGameState;
};

const COLLISION_DISTANCE = 4;
const getNextFrame = (gameState: GameState): GameState => {
  if (gameState.state === "dead") {
    return gameState;
  }
  const dt = 0.05; // change to take last frame's time vs. this frame's time
  let newGameState = {
    ...gameState,
    bird: {
      x: gameState.bird.x,
      y: gameState.bird.y,
      vy: Math.min(Math.round(gameState.bird.vy + GRAVITY * dt), MAX_SPEED),
    },
    pipes: gameState.pipes.map((pipe) => ({
      x: pipe.x - 1,
      position: pipe.position,
    })),
  };
  newGameState.bird.y += newGameState.bird.vy * dt;
  if (newGameState.pipes[0].x < 0) {
    newGameState.score += 1;
    newGameState.pipes.shift();
    newGameState.pipes.push({
      x: 63,
      position: Math.random() < 0.5 ? "top" : "bottom",
    });
  }
  if (newGameState.bird.y >= 64) {
    newGameState.bird.y = 63;
    newGameState.bird.vy = 0;
  }
  if (newGameState.bird.y < 0) {
    newGameState.bird.y = 0;
    newGameState.bird.vy = 0;
  }
  // collision detection, bird within 2px of pipe
  newGameState.pipes.forEach((pipe) => {
    if (
      newGameState.bird.x >= pipe.x - COLLISION_DISTANCE &&
      newGameState.bird.x <= pipe.x + 3 + COLLISION_DISTANCE
    ) {
      if (pipe.position === "top") {
        if (newGameState.bird.y <= PIPE_LENGTH + COLLISION_DISTANCE) {
          newGameState = INITIAL_GAME_STATE;
        }
      } else {
        if (
          newGameState.bird.y >=
          MATRIX_SIZE - PIPE_LENGTH - COLLISION_DISTANCE
        ) {
          newGameState = INITIAL_GAME_STATE;
        }
      }
    }
  });
  return newGameState;
};

export const FlappyBird = () => {
  const [gameState, setGameState] = useState<GameState>(INITIAL_GAME_STATE);
  const matrix = getGameStateMatrix(gameState);
  useEffect(() => {
    const interval = setInterval(() => {
      setGameState((s) => getNextFrame(s));
    }, 50);
    return () => clearInterval(interval);
  }, []);
  return (
    <div
      className="flex flex-col gap-2"
      onClick={() => setGameState((s) => getNextFrame(birdJump(s)))}
    >
      <p className="text-2xl font-bold text-center mt-4">flappy bird</p>
      <Matrix matrix={matrix} score={gameState.score} />
    </div>
  );
};

/**
 * @param imgDataData  The ImageData.data Uint8ClampedArray (length = w*h*4)
 * @returns Uint8Array length = w*h, each byte in RGB332 format
 */
function encodeRgb332(imgDataData: Uint8ClampedArray): Uint8Array {
  const nPixels = imgDataData.length / 4;
  const out = new Uint8Array(nPixels);

  for (let i = 0; i < nPixels; i++) {
    const base = i * 4;
    const r8 = imgDataData[base + 0];
    const g8 = imgDataData[base + 1];
    const b8 = imgDataData[base + 2];
    // ignore alpha

    // quantize down to 3,3,2 bits:
    const r3 = r8 >> 5; // top 3 bits of red
    const g3 = g8 >> 5; // top 3 bits of green
    const b2 = b8 >> 6; // top 2 bits of blue

    // pack into one byte: RRR GGG BB
    out[i] = (r3 << 5) | (g3 << 2) | b2;
  }

  return out;
}

export const Matrix = ({
  score,
  matrix,
}: {
  score: number;
  matrix: Matrix;
}) => {
  const W = 64;
  const H = 64;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
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
        ctx.font = "16px sans-serif";
        ctx.fillStyle = "white";
        ctx.fillText(score.toString(), 4, 16);
      }
    }
  }, [matrix, score]);
  useInterval(
    () => {
      if (canvasRef.current == null) {
        return;
      }

      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx == null) {
        return;
      }
      const imgData = ctx.getImageData(0, 0, W, H);
      const flat = imgData.data;
      const rgb332 = encodeRgb332(flat);
      sendCanvas(rgb332);
    },
    Math.round(1 / 20),
  );
  return (
    <canvas
      width={64}
      height={64}
      className="aspect-square border-1 border-white"
      ref={canvasRef}
      style={{ imageRendering: "pixelated" }}
    ></canvas>
  );
};
