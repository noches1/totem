import { useEffect } from "react";

import { useRef } from "react";
import { Canvas } from "./Canvas";

export const Draw = () => {
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
            const [r, g, b] = [0, 255, 0];
            data[i + 0] = r;
            data[i + 1] = g;
            data[i + 2] = b;
            data[i + 3] = 255;
          }
        }
        ctx.putImageData(imgData, 0, 0);
          // Draw a background rectangle behind the text
          ctx.fillStyle = "rgba(0, 0, 0, 0.5)"; // Semi-transparent black background
          ctx.fillRect(0, 24, 64, 16); // x, y, width, height

          ctx.font = "11px sans-serif";
          ctx.fillStyle = "white";
          ctx.fillText("click to start", 2, 36);
      }
    }
  }, []);
  return <Canvas ref={canvasRef} />;
};
