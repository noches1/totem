import { Button } from "./components/ui/button";

const isDev = import.meta.env.MODE === "development";
const baseUrl = isDev ? "http://localhost" : "http://totem.local";

type Command = "chibis" | "pokerscope" | "anime";
const changeCommand = async (command: Command) => {
  await fetch(baseUrl + "/api/command", {
    method: "POST",
    body: JSON.stringify({ command }),
  });
};

function App() {
  return (
    <div className="flex flex-col gap-2">
      <div className="p-4 border-b">
        <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight">
          Totem
        </h3>
      </div>
      <div className="p-4 flex flex-col gap-6">
        <h4 className="scroll-m-20 text-xl font-semibold tracking-tight">
          Currently displaying: PLACEHOLDER
        </h4>

        <div className="flex flex-col gap-2">
          <h4 className="scroll-m-20 text-xl font-semibold tracking-tight">
            Commands
          </h4>
          <div className="flex flex-col gap-2">
            <Button onClick={() => changeCommand("chibis")}>Chibis</Button>
            <Button onClick={() => changeCommand("pokerscope")}>
              Pokerscope
            </Button>
            <Button onClick={() => changeCommand("anime")}>Anime</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
