import type { Pixel } from "./FlappyBird";

const isDev = import.meta.env.MODE === "development";
const baseUrl = isDev ? "http://localhost" : "http://totem.local";

export const sendCanvas = async (grid: Pixel[][]) => {
  const flat = new Uint8Array(64 * 64);
  for (let y = 0; y < 64; y++) {
    for (let x = 0; x < 64; x++) {
      const [r, g, b] = grid[y][x];
      // Convert RGB to RGB332 format (3 bits for R, 3 bits for G, 2 bits for B)
      const r3 = Math.round((r / 255) * 7); // 3 bits for red (0-7)
      const g3 = Math.round((g / 255) * 7); // 3 bits for green (0-7)
      const b2 = Math.round((b / 255) * 3); // 2 bits for blue (0-3)
      flat[y * 64 + x] = (r3 << 5) | (g3 << 2) | b2;
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
