import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { Canvas } from "./Canvas";
import { useInterval } from "./useInterval";
import { changeCommand } from "./api";
import { Button } from "./components/ui/button";

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

const getNextParticle = (particle: Particle, settings: Settings) => {
  return {
    ...particle,
    px: particle.px + particle.vx,
    py: particle.py + particle.vy,
    // gravity
    vy: particle.vy + settings.gravity,
    lifetime: Math.max(0, particle.lifetime - (10 / settings.lifetime)),
  };
};

const getNextFrame = (state: State, settings: Settings) => {
  return {
    ...state,
    particles: state.particles
      .filter((p) => p.lifetime > 0)
      .map((p) => getNextParticle(p, settings)),
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

type Colour = {
  r: number;
  g: number;
  b: number;
};

const COLOUR_RANDOMNESS = 200;

const clamp = (value: number) => {
  return Math.max(0, Math.min(value, 255));
};

type ColourSetting = 'red' | 'green' | 'blue' | 'rainbow' | 'rainbow-light'
type GravitySetting = 0 | 0.03 | 0.1;
type Lifetime = 2 | 5 | 10;
type Spread = 0.3 | 1 | 3;
type Amount = 30 | 100 | 1000; // particles per second
type Size = 1 | 3 | 10;
type Settings = {
  amount: Amount;
  colour: ColourSetting;
  gravity: GravitySetting;
  lifetime: Lifetime;
  size: Size;
  spread: Spread;
};

const colourFromSetting = (setting: ColourSetting) => {
  switch (setting) {
    case "blue":
      return { r: 50, g: 50, b: 200 };
    case "red":
      return { r: 200, g: 50, b: 50 };
    case "green":
      return { r: 50, g: 200, b: 50 };
    case "rainbow":
      return { r: 125, g: 125, b: 125 };
    case "rainbow-light":
      return { r: 255, g: 255, b: 255 };
  }
};

const getRandomColour = (colour: Colour) => {
  const r = clamp(
    Math.floor(
      colour.r + Math.random() * COLOUR_RANDOMNESS - COLOUR_RANDOMNESS / 2
    )
  );
  const g = clamp(
    Math.floor(
      colour.g + Math.random() * COLOUR_RANDOMNESS - COLOUR_RANDOMNESS / 2
    )
  );
  const b = clamp(
    Math.floor(
      colour.b + Math.random() * COLOUR_RANDOMNESS - COLOUR_RANDOMNESS / 2
    )
  );
  return { r, g, b };
};

export const Draw = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouse = useRef<{ x: number; y: number } | null>(null);
  const [state, setState] = useState<State>({
    particles: [],
  });
  const [settings, setSettings] = useState<Settings>({
    amount: 100,
    colour: 'blue',
    gravity: 0.03,
    lifetime: 10,
    size: 3,
    spread: 1,
  });

  useEffect(() => {
    changeCommand("canvas");
  }, []);

  useInterval(() => {
    if (canvasRef.current == null) {
      return;
    }
    setState((state) => getNextFrame(state, settings));
    const drawCtx = canvasRef.current.getContext("2d");
    if (drawCtx == null) {
      return;
    }
    drawCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    state.particles.forEach((p) => {
      drawCtx.beginPath();
      drawCtx.globalAlpha = p.lifetime / 100;
      drawCtx.fillStyle = p.color;
      drawCtx.arc(
        p.px,
        p.py,
        ((p.lifetime / 100)) * settings.size,
        0,
        Math.PI * 2
      );
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
      return;
    }
    // create a particle and send it in a random direction
    const newColour = getRandomColour(colourFromSetting(settings.colour));
    const newParticle = {
      px: mouse.current!.x,
      py: mouse.current!.y,
      vx: Math.random() * settings.spread - settings.spread / 2,
      vy: Math.random() * settings.spread - settings.spread / 2,
      lifetime: 100,
      color: `rgb(${newColour.r}, ${newColour.g}, ${newColour.b})`,
    };
    setState((state) => ({
      ...state,
      particles: [...state.particles, newParticle],
    }));
  }, Math.floor(1000 / settings.amount));

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
    if (mouse.current) {
      mouse.current = getMouse(e, canvasRef.current);
    }
  });

  useDocumentBodyListener("mouseup", function (e) {
    console.log("mouseup");
    // If we released the left mouse button, stop drawing and finish the line
    if (e.which === MouseConstants.MOUSE_LEFT) {
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

  return (
    <div className="w-full flex flex-col items-center gap-6">
      <Canvas ref={canvasRef} />
      <div className="flex flex-row gap-2 items-center">
        Colour
        <ColourSetting
          settings={settings}
          setSettings={setSettings}
          property="colour"
          value="blue"
          className="bg-blue-500"
        />
        <ColourSetting
          settings={settings}
          setSettings={setSettings}
          property="colour"
          value="red"
          className="bg-red-500"
        />
        <ColourSetting
          settings={settings}
          setSettings={setSettings}
          property="colour"
          value="green"
          className="bg-green-500"
        />
        <ColourSetting
          settings={settings}
          setSettings={setSettings}
          property="colour"
          value="rainbow"
          className="bg-gradient-to-r from-purple-300 via-green-300 to-yellow-300"
        />
        <ColourSetting
          settings={settings}
          setSettings={setSettings}
          property="colour"
          value="rainbow-light"
          className="bg-gradient-to-r from-blue-200 via-pink-200 to-green-200"
        />
      </div>
      <div className="flex flex-row gap-2 items-center">
        Gravity
        <Button disabled={settings.gravity === 0} onClick={() => setSettings({ ...settings, gravity: 0 })}>
          0
        </Button>
        <Button disabled={settings.gravity === 0.03} onClick={() => setSettings({ ...settings, gravity: 0.03 })}>
          0.03
        </Button>
        <Button disabled={settings.gravity === 0.1} onClick={() => setSettings({ ...settings, gravity: 0.1 })}>
          0.1
        </Button>
      </div>
      <div className="flex flex-row gap-2 items-center">
        Lifetime
        <Button disabled={settings.lifetime === 2} onClick={() => setSettings({ ...settings, lifetime: 2 })}>
          2
        </Button>
        <Button disabled={settings.lifetime === 5} onClick={() => setSettings({ ...settings, lifetime: 5 })}>
          5
        </Button>
        <Button disabled={settings.lifetime === 10} onClick={() => setSettings({ ...settings, lifetime: 10 })}>
          10
        </Button>
      </div>
      <div className="flex flex-row gap-2 items-center">
        Spread
        <Button disabled={settings.spread === 0.3} onClick={() => setSettings({ ...settings, spread: 0.3 })}>
          0.3
        </Button>
        <Button disabled={settings.spread === 1} onClick={() => setSettings({ ...settings, spread: 1 })}>
          1
        </Button>
        <Button disabled={settings.spread === 3} onClick={() => setSettings({ ...settings, spread: 3 })}>
          3
        </Button>
      </div>
      <div className="flex flex-row gap-2 items-center">
        Amount
        <Button disabled={settings.amount === 30} onClick={() => setSettings({ ...settings, amount: 30 })}>
          30
        </Button>
        <Button disabled={settings.amount === 100} onClick={() => setSettings({ ...settings, amount: 100 })}>
          100
        </Button>
        <Button disabled={settings.amount === 1000} onClick={() => setSettings({ ...settings, amount: 1000 })}>
          1000
        </Button>
      </div>
      <div className="flex flex-row gap-2 items-center">
        Size
        <Button disabled={settings.size === 1} onClick={() => setSettings({ ...settings, size: 1 })}>
          1
        </Button>
        <Button disabled={settings.size === 3} onClick={() => setSettings({ ...settings, size: 3 })}>
          3
        </Button>
        <Button disabled={settings.size === 10} onClick={() => setSettings({ ...settings, size: 10 })}>
          10
        </Button>
      </div>
      <div className="flex flex-row gap-2 items-center">
        <Button 
          onClick={() => {
            const randomSettings: Settings = {
              amount: [30, 100, 1000][Math.floor(Math.random() * 3)] as Amount,
              colour: ['red', 'green', 'blue', 'rainbow'][Math.floor(Math.random() * 4)] as ColourSetting,
              gravity: [0, 0.03, 0.1][Math.floor(Math.random() * 3)] as GravitySetting,
              lifetime: [2, 5, 10][Math.floor(Math.random() * 3)] as Lifetime,
              size: [1, 3, 10][Math.floor(Math.random() * 3)] as Size,
              spread: [0.3, 1, 3][Math.floor(Math.random() * 3)] as Spread
            };
            setSettings(randomSettings);
          }}
        >
          Randomise All Settings
        </Button>
      </div>
    </div>
  );
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

type ColourSettingProps<T extends keyof Settings> = {
  settings: Settings;
  property: T;
  setSettings: React.Dispatch<React.SetStateAction<Settings>>;
  value: Settings[T];
  className: string;
};

const ColourSetting = <T extends keyof Settings>({
  settings,
  setSettings,
  property,
  value,
  className,
}: ColourSettingProps<T>) => {
  return (
    <Button
      className={
        className +
        (settings[property] === value ? " outline-solid outline-2 outline-offset-2 outline-white" : "")
      }
      onClick={() => setSettings({ ...settings, [property]: value })}
    >
      &nbsp;
    </Button>
  );
};
