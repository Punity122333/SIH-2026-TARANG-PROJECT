#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
const ROOT = new URL("../", import.meta.url).pathname;
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", ".venv", "__pycache__", "coverage", ".pytest_cache"]);
const JS_EXTS = new Set([".ts", ".tsx", ".js", ".mjs", ".cjs", ".jsx"]);
const CSS_EXTS = new Set([".css"]);
const PY_EXTS = new Set([".py"]);
const HTML_EXTS = new Set([".html"]);
const HASH_EXTS = new Set([".yml", ".yaml", ".toml", ".sh", ".env"]);
function listFiles(dir, out) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.name === ".git") continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      listFiles(full, out);
    } else {
      out.push(full);
    }
  }
  return out;
}
function scanJs(text, onlyBlock) {
  const hits = [];
  const n = text.length;
  let i = 0;
  let mode = "code";
  const stack = [];
  let braceDepth = 0;
  let line = 1;
  let lineStart = 0;
  function record(kind, pos) {
    const l = text.slice(0, pos).split("\n").length;
    hits.push({ line: l, kind });
  }
  while (i < n) {
    const c = text[i];
    const nxt = i + 1 < n ? text[i + 1] : "";
    if (c === "\n") line++;
    if (mode === "code" || mode === "expr") {
      if (c === "'" ) {
        stack.push({ m: mode, b: braceDepth });
        mode = "single";
        i++;
        continue;
      }
      if (c === '"') {
        stack.push({ m: mode, b: braceDepth });
        mode = "double";
        i++;
        continue;
      }
      if (c === "`") {
        stack.push({ m: mode, b: braceDepth });
        mode = "templ";
        i++;
        continue;
      }
      if (c === "/" && nxt === "/" && !onlyBlock) {
        record("line", i);
        i += 2;
        while (i < n && text[i] !== "\n") i++;
        continue;
      }
      if (c === "/" && nxt === "*") {
        record("block", i);
        i += 2;
        while (i < n) {
          if (text[i] === "*" && text[i + 1] === "/") { i += 2; break; }
          i++;
        }
        continue;
      }
      if (mode === "expr") {
        if (c === "{") braceDepth++;
        if (c === "}") {
          braceDepth--;
          if (braceDepth === 0) {
            const prev = stack.pop();
            mode = "templ";
            if (prev) braceDepth = prev.b;
            i++;
            continue;
          }
        }
      }
      i++;
      continue;
    }
    if (mode === "single") {
      if (c === "\\") { i += 2; continue; }
      if (c === "'") {
        const prev = stack.pop();
        mode = prev ? prev.m : "code";
        if (prev) braceDepth = prev.b;
      }
      i++;
      continue;
    }
    if (mode === "double") {
      if (c === "\\") { i += 2; continue; }
      if (c === '"') {
        const prev = stack.pop();
        mode = prev ? prev.m : "code";
        if (prev) braceDepth = prev.b;
      }
      i++;
      continue;
    }
    if (mode === "templ") {
      if (c === "\\") { i += 2; continue; }
      if (c === "`") {
        const prev = stack.pop();
        mode = prev ? prev.m : "code";
        if (prev) braceDepth = prev.b;
        i++;
        continue;
      }
      if (c === "$" && nxt === "{") {
        stack.push({ m: "templ", b: braceDepth });
        mode = "expr";
        braceDepth = 1;
        i += 2;
        continue;
      }
      i++;
      continue;
    }
  }
  return hits;
}
function scanCss(text) {
  const hits = [];
  let i = 0;
  const n = text.length;
  let mode = "code";
  while (i < n) {
    if (mode === "code") {
      if (text[i] === '"' || text[i] === "'") {
        const q = text[i];
        i++;
        while (i < n) {
          if (text[i] === "\\") { i += 2; continue; }
          if (text[i] === q) { i++; break; }
          i++;
        }
        continue;
      }
      if (text[i] === "/" && text[i + 1] === "*") {
        const l = text.slice(0, i).split("\n").length;
        hits.push({ line: l, kind: "block" });
        i += 2;
        while (i < n) {
          if (text[i] === "*" && text[i + 1] === "/") { i += 2; break; }
          i++;
        }
        continue;
      }
      i++;
    }
  }
  return hits;
}
function scanHtml(text) {
  const hits = [];
  let idx = text.indexOf("<!--");
  while (idx !== -1) {
    const l = text.slice(0, idx).split("\n").length;
    hits.push({ line: l, kind: "html" });
    idx = text.indexOf("<!--", idx + 4);
  }
  return hits;
}
function scanHashFile(text, file) {
  const hits = [];
  const lines = text.split("\n");
  lines.forEach((raw, k) => {
    if (k === 0 && raw.startsWith("#!")) return;
    let inS = false;
    let inD = false;
    for (let i = 0; i < raw.length; i++) {
      const c = raw[i];
      if (c === "'" && !inD) {
        if (i > 0 && raw[i - 1] === "\\") continue;
        inS = !inS;
        continue;
      }
      if (c === '"' && !inS) {
        if (i > 0 && raw[i - 1] === "\\") continue;
        inD = !inD;
        continue;
      }
      if (c === "#" && !inS && !inD) {
        const prev = i === 0 ? " " : raw[i - 1];
        if (i === 0 || prev === " " || prev === "\t" || prev === "=" || prev === ":") {
          hits.push({ line: k + 1, kind: "hash" });
          break;
        }
      }
    }
  });
  return hits;
}
function scanPythonFile(file) {
  const code = [
    "import tokenize, ast, sys",
    "p = sys.argv[1]",
    "found = []",
    "src = open(p, encoding='utf-8').read()",
    "toks = list(tokenize.generate_tokens(iter(src.splitlines(True)).__next__))",
    "lc = [t.start[0] for t in toks if t.type == tokenize.COMMENT]",
    "tree = ast.parse(src)",
    "docs = []",
    "def walk(n):",
    "  for c in ast.iter_child_nodes(n):",
    "    walk(c)",
    "  b = getattr(n, 'body', None)",
    "  if isinstance(n, (ast.Module, ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)) and b:",
    "    f = b[0]",
    "    if isinstance(f, ast.Expr) and isinstance(f.value, ast.Constant) and isinstance(f.value.value, str):",
    "      docs.append(f.lineno)",
    "walk(tree)",
    "print('C:' + ','.join(map(str, lc)) + ';D:' + ','.join(map(str, docs)))",
  ].join("\n");
  const r = spawnSync("python3", ["-c", code, file], { encoding: "utf-8" });
  if (r.status !== 0) return [{ line: 1, kind: "py-parse" }];
  const out = (r.stdout || "").trim();
  const m = out.match(/C:(.*);D:(.*)/);
  const hits = [];
  if (m) {
    if (m[1].trim() !== "") for (const s of m[1].split(",")) hits.push({ line: Number(s), kind: "py-comment" });
    if (m[2].trim() !== "") for (const s of m[2].split(",")) hits.push({ line: Number(s), kind: "py-docstring" });
  }
  return hits;
}
const all = listFiles(ROOT, []);
let failures = [];
for (const f of all) {
  const rel = path.relative(ROOT, f);
  if (rel.startsWith("scripts" + path.sep + "check-no-comments")) {
    if (f.endsWith(".mjs")) {
      const text = fs.readFileSync(f, "utf-8");
      const lines = text.split("\n");
      let tmp = lines.slice(1).join("\n");
      const h = scanJs(tmp, false);
      if (h.length > 0) failures.push({ file: rel, hits: h });
      continue;
    }
  }
  const ext = path.extname(f).toLowerCase();
  const base = path.basename(f);
  if (JS_EXTS.has(ext)) {
    const text = fs.readFileSync(f, "utf-8");
    const h = scanJs(text, false);
    if (h.length > 0) failures.push({ file: rel, hits: h });
  } else if (CSS_EXTS.has(ext)) {
    const text = fs.readFileSync(f, "utf-8");
    const h = scanCss(text);
    if (h.length > 0) failures.push({ file: rel, hits: h });
  } else if (PY_EXTS.has(ext)) {
    const h = scanPythonFile(f);
    if (h.length > 0) failures.push({ file: rel, hits: h });
  } else if (HTML_EXTS.has(ext)) {
    const text = fs.readFileSync(f, "utf-8");
    const h = scanHtml(text);
    if (h.length > 0) failures.push({ file: rel, hits: h });
  } else if (HASH_EXTS.has(ext) || base === ".env.example" || base.endsWith(".env.example") || ext === ".sh") {
    const text = fs.readFileSync(f, "utf-8");
    const h = scanHashFile(text, f);
    if (h.length > 0) failures.push({ file: rel, hits: h });
  } else if (f.endsWith(".env.example")) {
    const text = fs.readFileSync(f, "utf-8");
    const h = scanHashFile(text, f);
    if (h.length > 0) failures.push({ file: rel, hits: h });
  }
}
{
  const envPath = path.join(ROOT, ".env.example");
  if (fs.existsSync(envPath)) {
    const text = fs.readFileSync(envPath, "utf-8");
    const h = scanHashFile(text, envPath);
    if (h.length > 0 && !failures.some((x) => x.file.endsWith(".env.example"))) {
      failures.push({ file: ".env.example", hits: h });
    }
  }
}
if (failures.length === 0) {
  console.log("no-comments: PASS (0 comments)");
} else {
  for (const f of failures) {
    for (const h of f.hits) console.log(h.kind + " " + f.file + ":" + h.line);
  }
  console.log("no-comments: FAIL (" + failures.length + " files)");
  process.exit(1);
}
