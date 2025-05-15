import { useEffect, useRef, useState } from "react";
import { Canvas } from "./Canvas";

export type Pixel = [number, number, number];
type Matrix = Pixel[][];

const GRAVITY = 300;
const MAX_SPEED = 100;

type State = "initial" | "playing" | "dead";

type GameState = {
  state: State;
  frame: number;
  score: number;
  bird: {
    x: number;
    y: number;
    vy: number;
  };
  pipes: {
    x: number;
    height: number;
    position: "top" | "bottom";
  }[];
  nextPipeSpawn: number;
};

const MATRIX_SIZE = 64;
const PIPE_WIDTH = 8;
const PIPE_HEAD_SIZE = 6;

const INITIAL_GAME_STATE: GameState = {
  state: "initial",
  frame: 0,
  nextPipeSpawn: 32,
  score: 0,
  bird: {
    x: 10,
    y: 48,
    vy: 0,
  },
  pipes: [],
};

const GAP_HEIGHT_EASY = 42;
const GAP_HEIGHT_HARD = 32;
const GAP_HEIGHT_EXTREME = 24;
const PIPE_SPAWN_EASY = 48;
const PIPE_SPAWN_HARD = 32;
const PIPE_SPAWN_EXTREME = 28;

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

// prettier-ignore
const birdPixelArray2 = [
  [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, "#FFFF00", "#FFFF00", "#FFFF00", null, null, null, null, null, null],
  [null, null, null, null, null, null, "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", null, null, null, null],
  [null, null, null, null, null, null, "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#000000", "#FFFF00", "#FF9900", null, null, null],
  [null, null, null, null, null, null, "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FF9900", "#FF9900", "#FF9900", null],
  [null, null,null,null,null, null, "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FF9900", "#FF9900", "#FF9900", "#FF9900"],
  [null,null,null,null,null,null, null, "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FF9900", "#FF9900", null, null],
  [null, null, "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", null, null, null],
  ["#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#000000", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", null, null],
  [null, "FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#000000", "#FFFF00", "#000000", "#000000", "#000000", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", null],
  [null, null, "#FFFF00", "#000000", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#000000", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", null],
  [null, null, "#000000", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#000000", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", null, null],
  [null, null, "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#000000", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", "#FFFF00", null, null, null],
  [null, null, "#FFFF00", "#FFFF00", "#FFFF00", null, null, null, null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null]
];

const drawBird = (
  matrix: Matrix,
  bird: { x: number; y: number },
  pixelArray: (string | null)[][],
) => {
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
        const color = pixelArray[y][x];
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
const PIPE_HOLE_COLOUR = [0, 128, 0] as Pixel;

const getGameStateMatrix = (gameState: GameState): Matrix => {
  const matrix = getEmptyMatrix();

  // Draw pipes
  gameState.pipes.forEach((pipe) => {
    for (let i = 0; i < pipe.height; i++) {
      const drawHead = pipe.height - i < PIPE_HEAD_SIZE;
      let y;
      if (pipe.position === "top") {
        y = i;
      } else {
        y = MATRIX_SIZE - i - 1;
      }
      for (let j = 0; j < PIPE_WIDTH; j++) {
        // pipe.x can be negative
        if (pipe.x + j >= MATRIX_SIZE || pipe.x + j < 0) {
          continue;
        }
        matrix[y][pipe.x + j] =
          j === 0 && !drawHead ? PIPE_HOLE_COLOUR : PIPE_COLOUR;
      }
      if (drawHead) {
        const left = pipe.x - 1;
        const right = pipe.x + PIPE_WIDTH;
        if (left >= 0 && left < MATRIX_SIZE) {
          matrix[y][left] = PIPE_COLOUR;
        }
        if (right >= 0 && right < MATRIX_SIZE) {
          matrix[y][right] = PIPE_COLOUR;
        }
      }
    }
  });

  // Draw bird
  if (gameState.bird.vy > 0) {
    drawBird(matrix, gameState.bird, birdPixelArray);
  } else {
    drawBird(matrix, gameState.bird, birdPixelArray2);
  }

  return matrix;
};

const onClick = (gameState: GameState): GameState => {
  if (gameState.state === "initial") {
    return { ...gameState, state: "playing" as const };
  }
  if (gameState.state === "dead") {
    return gameState;
  }
  const newGameState = { ...gameState, state: "playing" as const };
  newGameState.bird.vy = -100;
  return newGameState;
};

const COLLISION_DISTANCE = 4;
const getNextFrame = (gameState: GameState): GameState => {
  if (gameState.state !== "playing") {
    return gameState;
  }
  const difficulty = Math.floor(gameState.score / 10);
  const hasDoublePipes = difficulty >= 1;
  const gapSize =
    difficulty >= 4
      ? GAP_HEIGHT_EXTREME
      : difficulty >= 2
        ? GAP_HEIGHT_HARD
        : GAP_HEIGHT_EASY;
  const pipeSpawnTime =
    difficulty >= 5
      ? PIPE_SPAWN_EXTREME
      : difficulty >= 3
        ? PIPE_SPAWN_HARD
        : PIPE_SPAWN_EASY;

  const dt = 0.05; // change to take last frame's time vs. this frame's time
  let newGameState = {
    ...gameState,
    frame: gameState.frame + 1,
    bird: {
      x: gameState.bird.x,
      y: gameState.bird.y,
      vy: Math.min(Math.round(gameState.bird.vy + GRAVITY * dt), MAX_SPEED),
    },
    pipes: gameState.pipes.map((pipe) => ({
      x: pipe.x - 1,
      height: pipe.height,
      position: pipe.position,
    })),
  };
  newGameState.bird.y += newGameState.bird.vy * dt;
  if (newGameState.pipes.find((pipe) => pipe.x < -PIPE_WIDTH)) {
    newGameState.score += 1;
  }
  newGameState.pipes = newGameState.pipes.filter(
    (pipe) => pipe.x >= -PIPE_WIDTH,
  );

  if (newGameState.nextPipeSpawn <= newGameState.frame) {
    newGameState.nextPipeSpawn += pipeSpawnTime;
    if (hasDoublePipes) {
      const targetY = Math.floor(Math.random() * MATRIX_SIZE);
      const topPipeHeight = Math.max(0, targetY - Math.floor(gapSize / 2));
      const bottomPipeHeight = Math.min(
        MATRIX_SIZE - 1,
        MATRIX_SIZE - (targetY + Math.floor(gapSize / 2)),
      );
      if (topPipeHeight > 0) {
        newGameState.pipes.push({
          x: MATRIX_SIZE + 3,
          height: topPipeHeight,
          position: "top",
        });
      }
      if (bottomPipeHeight > 0) {
        newGameState.pipes.push({
          x: MATRIX_SIZE + 3,
          height: bottomPipeHeight,
          position: "bottom",
        });
      }
    } else {
      newGameState.pipes.push({
        x: MATRIX_SIZE + 3,
        height: Math.floor(MATRIX_SIZE / 2),
        position: Math.random() < 0.5 ? "top" : "bottom",
      });
    }
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
        if (newGameState.bird.y <= pipe.height + COLLISION_DISTANCE) {
          newGameState = { ...newGameState, state: "dead" as const };
        }
      } else {
        if (
          newGameState.bird.y >=
          MATRIX_SIZE - pipe.height - COLLISION_DISTANCE
        ) {
          newGameState = { ...newGameState, state: "dead" as const };
        }
      }
    }
  });
  return newGameState;
};

export const FlappyBird = () => {
  const [gameState, setGameState] = useState<GameState>(INITIAL_GAME_STATE);
  const matrix = getGameStateMatrix(gameState);
  const deathTimeout = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    const interval = setInterval(() => {
      setGameState((s) => {
        if (s.state === "dead" && !deathTimeout.current) {
          deathTimeout.current = setTimeout(() => {
            setGameState(INITIAL_GAME_STATE);
          }, 5000);
        }
        if (s.state !== "dead") {
          deathTimeout.current = null;
        }
        return getNextFrame(s);
      });
    }, 50);
    return () => clearInterval(interval);
  }, []);
  return (
    <div
      className="flex flex-col gap-2"
      onClick={() => setGameState((s) => getNextFrame(onClick(s)))}
    >
      <Matrix matrix={matrix} score={gameState.score} state={gameState.state} />
    </div>
  );
};

export const Matrix = ({
  score,
  state,
  matrix,
}: {
  state: State;
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
        if (state === "initial") {
          // Draw a background rectangle behind the text
          ctx.fillStyle = "rgba(0, 0, 0, 0.5)"; // Semi-transparent black background
          ctx.fillRect(0, 24, 64, 16); // x, y, width, height

          ctx.font = "11px sans-serif";
          ctx.fillStyle = "white";
          ctx.fillText("click to start", 2, 36);
        }
        if (state === "playing" || state === "dead") {
          ctx.font = "16px sans-serif";
          let colour = "white";
          if (score < 10) {
            colour = "white";
          } else if (score < 20) {
            colour = "skyblue";
          } else if (score < 30) {
            colour = "teal";
          } else if (score < 40) {
            colour = "cyan";
          } else {
            colour = "red";
          }
          ctx.fillStyle = colour;
          ctx.fillText(score.toString(), 4, 16);
        }
        if (state === "dead") {
          // Draw a background rectangle behind the text
          ctx.fillStyle = "rgba(0, 0, 0, 0.5)"; // Semi-transparent black background
          ctx.fillRect(0, 24, 64, 16); // x, y, width, height

          ctx.font = "12px sans-serif";
          ctx.fillStyle = "white"; // Reset fill style for text
          ctx.fillText("game over", 4, 36);
        }
      }
    }
  }, [matrix, score, state]);
  return <Canvas ref={canvasRef} />;
};
