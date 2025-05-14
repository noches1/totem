import type { Pixel } from "./FlappyBird";

const isDev = import.meta.env.MODE === "development";
const baseUrl = isDev ? "http://localhost" : "http://totem.local";

export const sendCanvas = async (grid: Pixel[][]) => {
  const flat = new Uint8Array(64 * 64);
  for (let y = 0; y < 64; y++) {
    for (let x = 0; x < 64; x++) {
      flat[y * 64 + x] = (grid[y][x][0] + grid[y][x][1] + grid[y][x][2]) * 100 / 765;
    }
  }
  await fetch(baseUrl + "/api/canvas", {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
    },
    body: flat,
  });
};
