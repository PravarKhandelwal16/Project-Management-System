const { spawn } = require("node:child_process");
const fs = require("node:fs"),
  path = require("node:path");
const stop = path.resolve(__dirname, "../../mobile/.expo/stop-preview");
const child = spawn(
  process.execPath,
  ["--test", "tests/helpers/mobilePreview.js"],
  {
    cwd: path.resolve(__dirname, ".."),
    env: { ...process.env, NODE_ENV: "test" },
    stdio: "inherit",
  },
);
process.on("SIGINT", () => {
  fs.mkdirSync(path.dirname(stop), { recursive: true });
  fs.writeFileSync(stop, "stop");
});
child.once("exit", (code) => {
  process.exitCode = code || 0;
});
