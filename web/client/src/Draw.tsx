import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { Canvas } from "./Canvas";
import { useInterval } from "./useInterval";
import { changeCommand } from "./api";
import { Button } from "./components/ui/button";
import { Slider } from "./components/ui/slider";
import { cn } from "./lib/utils";

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
    lifetime: Math.max(0, particle.lifetime - 10 / settings.lifetime),
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

const BLACK = {
  r: 0,
  g: 0,
  b: 0,
} satisfies Colour;

const WHITE_50 = {
  r: 24,
  g: 24,
  b: 24,
} satisfies Colour;

const WHITE_100 = {
  r: 48,
  g: 48,
  b: 48,
} satisfies Colour;

const WHITE_200 = {
  r: 96,
  g: 96,
  b: 96,
} satisfies Colour;

const WHITE_300 = {
  r: 132,
  g: 132,
  b: 132,
} satisfies Colour;

const WHITE_400 = {
  r: 188,
  g: 188,
  b: 188,
} satisfies Colour;

const WHITE_500 = {
  r: 212,
  g: 212,
  b: 212,
} satisfies Colour;

const WHITE_600 = {
  r: 255,
  g: 255,
  b: 255,
} satisfies Colour;

const RED = {
  r: 255,
  g: 0,
  b: 0,
} satisfies Colour;

const BLUE = {
  r: 0,
  g: 0,
  b: 255,
} satisfies Colour;

const GREEN = {
  r: 0,
  g: 255,
  b: 0,
} satisfies Colour;

const YELLOW = {
  r: 255,
  g: 255,
  b: 0,
} satisfies Colour;

const VIOLET = {
  r: 148,
  g: 0,
  b: 211,
} satisfies Colour;

const INDIGO = {
  r: 75,
  g: 0,
  b: 130,
} satisfies Colour;

const ORANGE = {
  r: 255,
  g: 127,
  b: 0,
} satisfies Colour;

const COLOUR_RANDOMNESS = 200;

const clamp = (value: number) => {
  return Math.max(0, Math.min(value, 255));
};

type ColourSetting =
  | "red"
  | "green"
  | "blue"
  | "rainbow"
  | "rainbow-light"
  | "animated"
  | "animated-rainbow";
type GravitySetting = number;
type Lifetime = number;
type Spread = number;
type Amount = number;
type Size = number;
type Settings = {
  amount: Amount;
  colour: ColourSetting;
  gravity: GravitySetting;
  lifetime: Lifetime;
  size: Size;
  spread: Spread;
};

interface Preset {
  name: string;
  settings: Settings;
}

const PRESETS: Preset[] = [
  {
    name: "Icy Rose Cascade",
    settings: {
      amount: 100,
      colour: "blue",
      gravity: 0.03,
      lifetime: 10,
      size: 3,
      spread: 1,
    },
  },
  {
    name: "Blood Nebula",
    settings: {
      colour: "red",
      amount: 100,
      gravity: 0,
      lifetime: 10,
      spread: 1,
      size: 10,
    },
  },
  {
    name: "Verdant Bloom",
    settings: {
      colour: "green",
      amount: 100,
      gravity: 0,
      lifetime: 10,
      spread: 0.3,
      size: 3,
    },
  },
  {
    name: "Sketch",
    settings: {
      amount: 100,
      colour: "rainbow-light",
      gravity: 0,
      lifetime: 100,
      size: 2,
      spread: 0,
    },
  },
];

/**
 * Linearly interpolate across an array of values.
 *
 * @param values  – array of numbers [v0, v1, …, vN]
 * @param t       – interpolation position, in [0..1]
 * @returns       – the interpolated number
 */
function interpolateValues(values: number[], t: number): number {
  const n = values.length;
  if (n === 0) throw new Error("Need at least one value to interpolate");
  if (n === 1) return values[0];

  // Clamp t to [0,1]
  const tt = Math.min(1, Math.max(0, t));
  // Scale into [0 .. n-1]
  const scaled = tt * (n - 1);
  const idx = Math.min(Math.floor(scaled), n - 2);
  const frac = scaled - idx;

  return values[idx] * (1 - frac) + values[idx + 1] * frac;
}

function getAnimatedColour(colours: Colour[], progress: number) {
  return {
    r: interpolateValues(
      colours.map((colour) => colour.r),
      progress,
    ),
    g: interpolateValues(
      colours.map((colour) => colour.g),
      progress,
    ),
    b: interpolateValues(
      colours.map((colour) => colour.b),
      progress,
    ),
  };
}

const ANIMATED_COLOUR_FRAMES = 1200; // cycles through all the colours within x frames
const colourFromSetting = (setting: ColourSetting, currentFrame: number) => {
  const progress = currentFrame / ANIMATED_COLOUR_FRAMES;
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
      return { r: 175, g: 200, b: 200 };
    case "animated":
      return getAnimatedColour(
        [
          BLACK,
          WHITE_50,
          WHITE_100,
          WHITE_200,
          WHITE_300,
          WHITE_400,
          WHITE_500,
          WHITE_600,
          BLACK,
        ],
        progress,
      );
    case "animated-rainbow":
      return getAnimatedColour(
        [RED, ORANGE, YELLOW, GREEN, BLUE, INDIGO, VIOLET, RED],
        progress,
      );
  }
};

const randomnessFromSetting = (setting: ColourSetting) => {
  switch (setting) {
    case "animated":
      return 0;
    case "animated-rainbow":
      return 130;
    default:
      return COLOUR_RANDOMNESS;
  }
};

const getRandomColour = (
  colour: Colour,
  randomness: number = COLOUR_RANDOMNESS,
) => {
  const r = clamp(
    Math.floor(colour.r + Math.random() * randomness - randomness / 2),
  );
  const g = clamp(
    Math.floor(colour.g + Math.random() * randomness - randomness / 2),
  );
  const b = clamp(
    Math.floor(colour.b + Math.random() * randomness - randomness / 2),
  );
  return { r, g, b };
};

export const Draw = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouse = useRef<{ x: number; y: number } | null>(null);
  const [state, setState] = useState<State>({
    particles: [],
  });
  const [settings, setSettings] = useState<Settings>(PRESETS[0].settings);

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
        (p.lifetime / 100) * settings.size,
        0,
        Math.PI * 2,
      );
      drawCtx.fill();
      drawCtx.closePath();
    });
  }, 1000 / 60);

  const frame = useRef(0);

  // particle spawning
  useInterval(
    () => {
      if (canvasRef.current == null) {
        return;
      }
      frame.current += 1;
      if (frame.current >= ANIMATED_COLOUR_FRAMES) {
        frame.current = 0;
      }
      if (!mouse.current) {
        return;
      }
      // create a particle and send it in a random direction
      const newColour = getRandomColour(
        colourFromSetting(settings.colour, frame.current),
        randomnessFromSetting(settings.colour),
      );
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
    },
    Math.floor(1000 / settings.amount),
  );

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
    { passive: false },
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
    { passive: false },
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
    { passive: false },
  );

  return (
    <div className="w-full flex flex-col items-center gap-6">
      <Canvas ref={canvasRef} />
      <div className="flex flex-col gap-2 w-full">
        {PRESETS.map((preset) => (
          <Button
            className={
              preset.settings === settings
                ? "outline outline-2 outline-solid outline-primary outline-offset-2"
                : ""
            }
            key={preset.name}
            onClick={() => setSettings(preset.settings)}
          >
            {preset.name}
          </Button>
        ))}
        <Button
          onClick={() => {
            const randomSettings: Settings = {
              amount: [30, 100, 1000][Math.floor(Math.random() * 3)] as Amount,
              colour: ["red", "green", "blue", "rainbow"][
                Math.floor(Math.random() * 4)
              ] as ColourSetting,
              gravity: [0, 0.03, 0.1][
                Math.floor(Math.random() * 3)
              ] as GravitySetting,
              lifetime: [2, 5, 10][Math.floor(Math.random() * 3)] as Lifetime,
              size: [1, 3, 10][Math.floor(Math.random() * 3)] as Size,
              spread: [0.3, 1, 3][Math.floor(Math.random() * 3)] as Spread,
            };
            setSettings(randomSettings);
          }}
        >
          I'm feeling lucky
        </Button>
      </div>
      <div className="grid gap-x-4 items-center grid-cols-2 w-full">
        <h4 className="scroll-m-20 text-xl font-semibold tracking-tight col-span-2 py-3">
          Advanced settings
        </h4>
        <div className="flex flex-row gap-2 items-center col-start-1 col-span-2 justify-evenly my-3">
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
            className="bg-gradient-to-r from-purple-400 via-green-400 to-red-400"
          />
          <ColourSetting
            settings={settings}
            setSettings={setSettings}
            property="colour"
            value="rainbow-light"
            className="bg-gradient-to-r from-blue-200 via-pink-200 to-green-200"
          />
          <ColourSetting
            settings={settings}
            setSettings={setSettings}
            property="colour"
            value="animated"
            className="bg-gradient-to-r from-red-500 via-blue-500 to-red-500"
          />
          <ColourSetting
            settings={settings}
            setSettings={setSettings}
            property="colour"
            value="animated-rainbow"
            className="bg-conic/decreasing from-violet-700 to-violet-700 via-lime-300"
          />
        </div>
        <h4 className="scroll-m-20 text-md font-medium tracking-tight">
          Gravity ({settings.gravity})
        </h4>
        <Slider
          className="w-full h-14"
          value={[settings.gravity]}
          onValueChange={(value) =>
            setSettings({ ...settings, gravity: value[0] })
          }
          max={0.1}
          min={0}
          step={0.01}
        />
        <h4 className="scroll-m-20 text-md font-medium tracking-tight">
          Lifetime ({settings.lifetime})
        </h4>
        <Slider
          className="w-full h-14"
          value={[settings.lifetime]}
          onValueChange={(value) =>
            setSettings({ ...settings, lifetime: value[0] })
          }
          max={100}
          min={2}
          step={1}
        />
        <h4 className="scroll-m-20 text-md font-medium text-md tracking-tight">
          Spread ({settings.spread})
        </h4>
        <Slider
          className="w-full h-14"
          value={[settings.spread]}
          onValueChange={(value) =>
            setSettings({ ...settings, spread: value[0] })
          }
          max={3}
          min={0}
          step={0.1}
        />
        <h4 className="scroll-m-20 text-md font-medium tracking-tight">
          Amount ({settings.amount})
        </h4>
        <Slider
          className="w-full h-14"
          value={[settings.amount]}
          onValueChange={(value) =>
            setSettings({ ...settings, amount: value[0] })
          }
          max={1000}
          min={10}
          step={50}
        />
        <h4 className="scroll-m-20 text-md font-medium tracking-tight">
          Size ({settings.size})
        </h4>
        <Slider
          className="w-full h-14"
          value={[settings.size]}
          onValueChange={(value) =>
            setSettings({ ...settings, size: value[0] })
          }
          max={10}
          min={1}
        />
      </div>
    </div>
  );
};

const useDocumentBodyListener = (
  event: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  callback: (arg: any) => void,
  options: AddEventListenerOptions = {},
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
      className={cn(
        "rounded-full size-8 aspect-square",
        settings[property] === value &&
          "outline-solid outline-2 outline-offset-2 outline-primary",
        className,
      )}
      onClick={() => setSettings({ ...settings, [property]: value })}
    />
  );
};
