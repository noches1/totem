const isDev = import.meta.env.MODE === "development";
const baseUrl = isDev ? "http://localhost" : "http://totem.local";

export const sendCanvas = async (flat: Uint8Array) => {
  await fetch(baseUrl + "/api/canvas", {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
    },
    body: flat,
  });
};
