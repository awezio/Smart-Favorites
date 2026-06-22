import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const repoRoot = join(import.meta.dirname, "..");

function loadBookmarkParser() {
  const parserPath = join(repoRoot, "lib", "parsers", "bookmark-parser.ts");
  const source = readFileSync(parserPath, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  const module = { exports: {} };
  const sandboxRequire = (id) => {
    if (id === "cheerio") return require("cheerio");
    return require(id);
  };

  vm.runInNewContext(compiled, {
    exports: module.exports,
    module,
    require: sandboxRequire,
  });

  return module.exports;
}

const { parseBookmarksHtml } = loadBookmarkParser();

const extensionExport = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
    <DT><H3>Toolbar</H3>
    <DL><p>
        <DT><A HREF="https://example.com" ADD_DATE="1782090000">Example</A>
        <DT><H3>Nested</H3>
        <DL><p>
            <DT><A HREF="https://nested.example.com" ADD_DATE="1782090001">Nested Example</A>
        </DL><p>
    </DL><p>
</DL><p>
`;

const parsed = parseBookmarksHtml(extensionExport);

assert.equal(
  parsed.length,
  2,
  "Parser should read bookmarks from the exact Netscape HTML shape emitted by the browser extension.",
);
assert.deepEqual(
  JSON.parse(
    JSON.stringify(parsed.map((bookmark) => [bookmark.title, bookmark.url, bookmark.folder_path])),
  ),
  [
    ["Example", "https://example.com", "/Toolbar"],
    ["Nested Example", "https://nested.example.com", "/Toolbar/Nested"],
  ],
  "Parser should preserve nested folder paths from extension HTML.",
);

console.log("bookmark parser contract passed");
