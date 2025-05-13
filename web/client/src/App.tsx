import * as React from "react";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";

const isDev = import.meta.env.MODE === "development";
const baseUrl = isDev ? "http://localhost" : "http://totem.local";

const changeCommand = async (command: string) => {
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
    .replace(".jpeg", "");
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
  const [customCommand, setCustomCommand] = React.useState("");
  const handleCustomCommand = React.useCallback(() => {
    if (customCommand === "") {
      return;
    }
    changeCommand(customCommand);
    setCustomCommand("");
  }, [customCommand]);

  const [affirmationsInput, setAffirmationsInput] = React.useState("");
  const handleAffirmations = React.useCallback(() => {
    if (affirmationsInput !== "") {
      changeCommand("affirmations:" + affirmationsInput);
    } else {
      changeCommand("affirmations");
    }
  }, [affirmationsInput]);

  const [singleInput1, setSingleInput1] = React.useState("");
  const [singleInput2, setSingleInput2] = React.useState("");
  const handleSingle = React.useCallback(() => {
    if (singleInput1 === "" || singleInput2 === "") {
      return;
    }

    changeCommand("single:" + singleInput1 + ":" + singleInput2);
    setSingleInput1("");
    setSingleInput2("");
  }, [singleInput1, singleInput2]);
  return (
    <div className="flex flex-col gap-2">
      <div className="p-4 border-b">
        <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight">
          Totem
        </h3>
      </div>
      <div className="flex flex-col gap-2 p-4">
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-2">
            <h4 className="font-medium tracking-tight scroll-m-20 col-span-2">
              Custom command/scrolling text
            </h4>
            <div className="flex gap-2">
              <Input
                value={customCommand}
                onChange={(e) => setCustomCommand(e.target.value)}
              />
              <Button
                className="aspect-square"
                disabled={customCommand === ""}
                onClick={handleCustomCommand}
              >
                Go
              </Button>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <h4 className="font-medium tracking-tight scroll-m-20 col-span-2">
              Affirmations
            </h4>
            <div className="flex gap-2">
              <Input
                value={affirmationsInput}
                onChange={(e) => setAffirmationsInput(e.target.value)}
                placeholder="Name (leave empty for 'You')"
              />
              <Button className="aspect-square" onClick={handleAffirmations}>
                Go
              </Button>
            </div>
          </div>
          <div className="flex flex-col gap-2 mb-8">
            <h4 className="font-medium tracking-tight scroll-m-20 col-span-2">
              Single (idk what this is)
            </h4>
            <div className="flex gap-2">
              <Input
                className="flex-1"
                value={singleInput1}
                onChange={(e) => setSingleInput1(e.target.value)}
                placeholder="File (e.g. tim)"
              />
              <Input
                className="flex-1"
                value={singleInput2}
                onChange={(e) => setSingleInput2(e.target.value)}
                placeholder="is single"
              />
              <Button
                className="aspect-square"
                onClick={handleSingle}
                disabled={singleInput1 === "" || singleInput2 === ""}
              >
                Go
              </Button>
            </div>
          </div>
          <Button onClick={() => changeCommand("pokerscope")}>
            Pokerscope
          </Button>
          {allCommands.map((command) => (
            <Button
              key={command.name}
              onClick={() => changeCommand(filenameToCommand(command.name))}
            >
              {command.name}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
