import { sendCanvas } from "./api";
import { useInterval } from "./useInterval";
import { encodeRgb332 } from "./api";
import { IS_DEV } from "./constants";
import React from "react";

// @ts-ignore
export const Canvas = React.forwardRef((_, ref: React.RefObject<HTMLCanvasElement | null>) => {
  const W = 64;
  const H = 64;
  useInterval(
    () => {
      if (ref.current == null) {
        return;
      }

      const canvas = ref.current;
      const ctx = canvas.getContext("2d");
      if (ctx == null) {
        return;
      }
      const imgData = ctx.getImageData(0, 0, W, H);
      const flat = imgData.data;
      const rgb332 = encodeRgb332(flat);
      if (!IS_DEV) {
        sendCanvas(rgb332);
      }
    },
    Math.round(1000 / 10),
  );
  return (
    <canvas
      width={64}
      height={64}
      className="aspect-square border-1 border-white"
      ref={ref}
      style={{ imageRendering: "pixelated" }}
    ></canvas>
  );
});
