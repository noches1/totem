import pako from "pako";
const isDev = import.meta.env.MODE === "development";
const baseUrl = isDev ? "http://localhost" : "http://totem.local";

export const sendCanvas = async (flat: Uint8Array) => {
  const deflated = pako.deflate(flat);
  await fetch(baseUrl + "/api/canvas", {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
    },
    body: flat,
  });
};

export const baseUrl = IS_DEV ? "http://localhost" : "http://totem.local";

export const changeCommand = async (command: string) => {
  await fetch(baseUrl + "/api/command", {
    method: "POST",
    body: JSON.stringify({ command }),
  });
};

/**
 * @param imgDataData  The ImageData.data Uint8ClampedArray (length = w*h*4)
 * @returns Uint8Array length = w*h, each byte in RGB332 format
 */
export function encodeRgb332(imgDataData: Uint8ClampedArray): Uint8Array {
  const nPixels = imgDataData.length / 4;
  const out = new Uint8Array(nPixels);

  for (let i = 0; i < nPixels; i++) {
    const base = i * 4;
    const alpha = imgDataData[base + 3]
    const r8 = Math.floor(imgDataData[base + 0] * alpha / 255)
    const g8 = Math.floor(imgDataData[base + 1] * alpha / 255)
    const b8 = Math.floor(imgDataData[base + 2] * alpha / 255)

    // quantize down to 3,3,2 bits:
    const r3 = r8 >> 5; // top 3 bits of red
    const g3 = g8 >> 5; // top 3 bits of green
    const b2 = b8 >> 6; // top 2 bits of blue

    // pack into one byte: RRR GGG BB
    out[i] = (r3 << 5) | (g3 << 2) | b2;
  }

  return out;
}
