
import React, { useRef } from "react";
import ReactDOM from "react-dom";
import { Canvas } from "./Canvas";

const MouseConstants = {
  INVALID: 0,
  MOUSE_LEFT: 1,
  MOUSE_MIDDLE: 2,
  MOUSE_RIGHT: 3,
} as const;

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

export const Draw = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseLeftIsDown = useRef(false);

  const draw = (e: MouseEvent) => {
    if (canvasRef.current == null) {
      return;
    }
    const drawCtx = canvasRef.current.getContext("2d");
    if (drawCtx == null) {
      return;
    }
    const mouse = getMouse(e, canvasRef.current);
    drawCtx.beginPath();
    drawCtx.fillStyle = "red";
    drawCtx.arc(mouse.x, mouse.y, 2, 0, Math.PI * 2);
    drawCtx.fill();
  };

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
      mouseLeftIsDown.current = true;

      draw(e);
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
    if (mouseLeftIsDown.current) {
      draw(e);
    }
  });

  useDocumentBodyListener("mouseup", function (e) {
    // If we released the left mouse button, stop drawing and finish the line
    if (mouseLeftIsDown.current && e.which === MouseConstants.MOUSE_LEFT) {
      mouseLeftIsDown.current = false;
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
