
import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { Canvas } from "./Canvas";
import { useInterval } from "./useInterval";

const MouseConstants = {
  INVALID: 0,
  MOUSE_LEFT: 1,
  MOUSE_MIDDLE: 2,
  MOUSE_RIGHT: 3,
} as const;

type Particle = {
  px: number;
  py: number;
  vx: number;
  vy: number;
  lifetime: number;
  color: string;
};

type State = {
  particles: Particle[];
};

const INITIAL_VELOCITY = 1;

const getNextParticle = (particle: Particle) => {
  return {
    ...particle,
    px: particle.px + particle.vx,
    py: particle.py + particle.vy,
    // gravity
    vy: particle.vy + 0.03,
    lifetime: particle.lifetime - 1,
  };
};

const getNextFrame = (state: State) => {
  return {
    ...state,
    particles: state.particles.filter((p) => p.lifetime > 0).map((p) => getNextParticle(p)),
  };
};

/*
 * Get the coordinates of a mouse event relative to a canvas element
 *
 * http://stackoverflow.com/questions/10449890/detect-mouse-click-location-within-canvas
 */
function getMouse(e: MouseEvent, canvas: HTMLCanvasElement) {
  let element: HTMLElement | null = canvas;
  let offsetX = 0;
  let offsetY = 0;

  // Compute the total offset. It's possible to cache this if you want
  if (element.offsetParent !== undefined) {
    do {
      offsetX += element.offsetLeft;
      offsetY += element.offsetTop;
    } while ((element = element.offsetParent as HTMLElement));
  }

  // Add padding and border style widths to offset
  // Also add the <html> offsets in case there's a position:fixed bar (like the stumbleupon bar)
  // This part is not strictly necessary, it depends on your styling
  // offsetX += stylePaddingLeft + styleBorderLeft + htmlLeft;
  // offsetY += stylePaddingTop + styleBorderTop + htmlTop;

  const mx = e.pageX - offsetX;
  const my = e.pageY - offsetY;

  // We return a simple javascript object with x and y defined
  let x = (mx / canvas.offsetWidth) * canvas.width;
  x = Math.max(0, Math.round(x));
  x = Math.min(canvas.width - 1, x);
  let y = (my / canvas.offsetHeight) * canvas.height;
  y = Math.max(0, Math.round(y));
  y = Math.min(canvas.height - 1, y);
  return { x, y };
}

const PARTICLE_DEBOUNCE = 10

export const Draw = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouse = useRef<{x: number, y: number} | null>(null);
  const [state, setState] = useState<State>({
    particles: [],
  });

  useInterval(() => {
    if (canvasRef.current == null) {
      return;
    }
    setState((state) => getNextFrame(state));
    const drawCtx = canvasRef.current.getContext("2d");
    if (drawCtx == null) {
      return;
    }
    drawCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    state.particles.forEach((p) => {
      drawCtx.beginPath();
      drawCtx.globalAlpha = p.lifetime / 100;
      drawCtx.fillStyle = p.color;
      drawCtx.arc(p.px, p.py, p.lifetime / 100 * 2, 0, Math.PI * 2);
      drawCtx.fill();
      drawCtx.closePath();
    });
  }, 1000 / 60);

  // particle spawning
  useInterval(() => {
    if (canvasRef.current == null) {
      return;
    }
    if (!mouse.current) {
      return
    }
    // create a particle and send it in a random direction
    setState((state) => ({
      ...state,
      particles: [
        ...state.particles,
        {
          px: mouse.current!.x,
          py: mouse.current!.y,
          vx: Math.random() * INITIAL_VELOCITY - INITIAL_VELOCITY / 2,
          vy: Math.random() * INITIAL_VELOCITY - INITIAL_VELOCITY / 2,
          lifetime: 100,
          // random shade of blue
          color: `rgb(${Math.floor(155 + Math.random()*50)}, ${155 + Math.floor(Math.random()*50)}, 255)`,
        },
      ],
    }));
  }, PARTICLE_DEBOUNCE);


  useDocumentBodyListener("mousedown", (e: MouseEvent) => {
    if (canvasRef.current == null) {
      return;
    }
    const drawCtx = canvasRef.current.getContext("2d");
    if (drawCtx == null) {
      return;
    }
    // If the mouseDown event was left click within the canvas
    if (e.which === MouseConstants.MOUSE_LEFT) {
      // Prevent the default action of turning into highlight cursor
      e.preventDefault();
      // Also unhighlight anything that may be highlighted
      window.getSelection()?.removeAllRanges();

      // We started dragging from within so we are now drawing
      mouse.current = getMouse(e, canvasRef.current);
    }
  });
  useDocumentBodyListener("mousemove", (e: MouseEvent) => {
    if (canvasRef.current == null) {
      return;
    }
    const drawCtx = canvasRef.current.getContext("2d");
    if (drawCtx == null) {
      return;
    }
    // If we started drawing within the canvas, draw the next part of the line
      mouse.current = getMouse(e, canvasRef.current);
  });

  useDocumentBodyListener("mouseup", function (e) {
    // If we released the left mouse button, stop drawing and finish the line
    if (mouse.current && e.which === MouseConstants.MOUSE_LEFT) {
      mouse.current = null;
    }
  });
  useDocumentBodyListener(
    "touchstart",
    (e: TouchEvent) => {
      // If the touchstart is within the canvas
      if (e.target === canvasRef.current) {
        // Prevent page scrolling
        e.preventDefault();
        // Convert touch position to mouse position and trigger the mouse event counterpart
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent("mousedown", {
          clientX: touch.clientX,
          clientY: touch.clientY,
        });
        document.body.dispatchEvent(mouseEvent);
      }
    },
    { passive: false }
  );
  useDocumentBodyListener(
    "touchmove",
    function (e) {
      // If the touchmove is within the canvas
      if (e.target === canvasRef.current) {
        // Prevent page scrolling
        e.preventDefault();
        // Convert touch position to mouse position and trigger the mouse event counterpart
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent("mousemove", {
          clientX: touch.clientX,
          clientY: touch.clientY,
        });
        document.body.dispatchEvent(mouseEvent);
      }
    },
    { passive: false }
  );
  useDocumentBodyListener(
    "touchend",
    function (e) {
      // If the touchstart is within the canvas
      if (e.target === canvasRef.current) {
        // Prevent page scrolling
        e.preventDefault();
        // Convert touch position to mouse position and trigger the mouse event counterpart
        const mouseEvent = new MouseEvent("mouseup", {});
        document.body.dispatchEvent(mouseEvent);
      }
    },
    { passive: false }
  );

  return <Canvas ref={canvasRef} />;
};

const useDocumentBodyListener = (
  event: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  callback: (arg: any) => void,
  options: AddEventListenerOptions = {}
) => {
  // Store the latest callback in a ref, so we do not bind a stale callback to the current closure.
  const callbackRef = React.useRef<(arg: Event) => void>(() => {});
  callbackRef.current = callback;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const runEventCallback = (arg: any) => {
    // We need to force render React because sometimes two events come in without giving
    // React a chance to update the callback function. This ensures callback will be latest.
    ReactDOM.flushSync(() => {
      callbackRef.current(arg); // this works
    });
  };
  React.useEffect(() => {
    document.body.addEventListener(event, runEventCallback, options);
    return () =>
      document.body.removeEventListener(event, runEventCallback, options);
  }, [event, options]);
};
