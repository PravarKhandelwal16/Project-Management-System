// RN rejects raw text inside View/Fragment, even when JS renderer mocks accept it.
// This regression was found on the Android emulator during Stage 8 review.
import fs from "node:fs";
import path from "node:path";
import { parse } from "@babel/parser";
function files(directory) {
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) =>
      entry.isDirectory()
        ? files(path.join(directory, entry.name))
        : entry.name.endsWith(".tsx")
          ? [path.join(directory, entry.name)]
          : [],
    );
}
test("native JSX has no raw explicit text outside Text/Txt containers", () => {
  const errors = [];
  for (const file of files(path.join(__dirname, "../src"))) {
    const ast = parse(fs.readFileSync(file, "utf8"), {
      sourceType: "module",
      plugins: ["typescript", "jsx"],
    });
    function visit(node, inText = false) {
      if (!node || typeof node !== "object") return;
      const text =
        inText ||
        (node.type === "JSXElement" &&
          ["Text", "Txt"].includes(node.openingElement.name.name));
      if (!text && node.type === "JSXText" && node.value.trim())
        errors.push(file + ":" + node.loc.start.line);
      if (
        !text &&
        node.type === "JSXExpressionContainer" &&
        node.expression.type === "StringLiteral" &&
        node.expression.value
      )
        errors.push(file + ":" + node.loc.start.line);
      for (const [key, value] of Object.entries(node)) {
        if (key === "loc") continue;
        if (Array.isArray(value)) value.forEach((child) => visit(child, text));
        else if (value && typeof value === "object") visit(value, text);
      }
    }
    visit(ast);
  }
  expect(errors).toEqual([]);
});
