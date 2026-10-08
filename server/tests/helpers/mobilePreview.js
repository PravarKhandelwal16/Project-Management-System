// Interactive Android review against the same Express app and a disposable test database.
const { test } = require("node:test");
const fs = require("node:fs"),
  path = require("node:path");
const fixtures = require("./fixtures");
const state = path.resolve(__dirname, "../../../mobile/.expo");
const stop = path.join(state, "stop-preview");
test(
  "interactive native review (stop with Ctrl+C or .expo/stop-preview)",
  { timeout: 3600000 },
  async (t) => {
    fs.mkdirSync(state, { recursive: true });
    if (fs.existsSync(stop)) fs.unlinkSync(stop);
    const base = fixtures.getBase();
    fs.writeFileSync(
      path.join(state, "test-api.json"),
      JSON.stringify({
        baseUrl: base,
        androidUrl: base.replace("127.0.0.1", "10.0.2.2"),
        ids: fixtures.ids,
      }),
    );
    console.log(
      "Isolated mobile API: " +
        base +
        " (test fixture accounts are documented in docs/MOBILE_TESTING.md)",
    );
    await new Promise((resolve) => {
      const finish = () => {
        clearInterval(poll);
        resolve();
      };
      const poll = setInterval(() => {
        if (fs.existsSync(stop)) finish();
      }, 500);
      t.signal.addEventListener("abort", finish, { once: true });
    });
    for (const file of [stop, path.join(state, "test-api.json")])
      if (fs.existsSync(file)) fs.unlinkSync(file);
  },
);
