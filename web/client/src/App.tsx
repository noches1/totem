import * as React from "react";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";

const isDev = import.meta.env.MODE === "development";
const baseUrl = isDev ? "http://localhost" : "http://totem.local";

type CommandName = "chibis" | "pokerscope" | "anime" | "affirmations";
const changeCommand = async (command: CommandName) => {
  await fetch(baseUrl + "/api/command", {
    method: "POST",
    body: JSON.stringify({ command }),
  });
};

interface Command {
  type: "directory" | "file" | "special";
  name: string;
}

const filenameToCommand = (filename: string) => {
  return filename
    .replace(".png", "")
    .replace(".gif", "")
    .replace(".jpg", "")
    .replace(".jpeg", "") as CommandName;
};

function App() {
  const [allCommands, setAllCommands] = React.useState<Command[]>([]);
  React.useEffect(() => {
    const f = async () => {
      const response = await fetch(baseUrl + "/api/commands");
      if (response.ok) {
        const json = await response.json();
        const commands = json.commands as Command[];
        commands.sort((a, b) => a.name.localeCompare(b.name));
        setAllCommands(json.commands);
      }
    };
    f();
  }, []);
  const [input, setInput] = React.useState("");
  const handleCustomCommand = React.useCallback(() => {
    if (input !== "") {
      changeCommand(input as CommandName);
      setInput('');
    }
  }, [input]);
  return (
    <div className="flex flex-col gap-2">
      <div className="p-4 border-b">
        <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight">
          Totem
        </h3>
      </div>
      <div className="p-4 flex flex-col gap-6">
        <h4 className="scroll-m-20 text-xl font-semibold tracking-tight">
          Currently displaying: look at the totem
        </h4>

        <div className="flex flex-col gap-2">
          <h4 className="scroll-m-20 text-xl font-semibold tracking-tight">
            Commands
          </h4>
          <div className="flex flex-col gap-2">
            <p className="font-medium tracking-tight scroll-m-20">Custom command</p>
            <Input value={input} onChange={(e) => setInput(e.target.value)} />
            <Button className="mb-8" onClick={handleCustomCommand}>Go</Button>
            <Button onClick={() => changeCommand("affirmations")}>
              Affirmations
            </Button>
            <Button onClick={() => changeCommand("pokerscope")}>
              Pokerscope
            </Button>
            {allCommands.map((command) => (
              <Button
                key={command.name}
                onClick={() => changeCommand(filenameToCommand(command.name))}
              >
                {command.name} ({command.type})
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
