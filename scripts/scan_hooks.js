const fs = require("fs");
const path = require("path");

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    if (file === "node_modules" || file === ".next" || file === ".git") continue;
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(walk(fullPath));
    } else if (file.endsWith(".tsx") || file.endsWith(".jsx")) {
      results.push(fullPath);
    }
  }
  return results;
}

const files = walk(".");
const hookRegex = /\b(useState|useEffect|useMemo|useCallback|useRef|useContext|useReducer|usePathname|useRouter|useSearchParams)\s*\(/;

for (const f of files) {
  const content = fs.readFileSync(f, "utf8");
  const lines = content.split("\n");
  let foundEarlyReturn = false;
  let returnLine = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*if\s*\([^)]*(loading|!session|!user)[^)]*\)\s*(\{|\b)/.test(line)) {
      foundEarlyReturn = true;
      returnLine = i + 1;
    }
    if (foundEarlyReturn && hookRegex.test(line)) {
      console.log(`Potential hook after early return in ${f}:${i + 1} (return was near ${returnLine}): ${line.trim()}`);
    }
    // reset if new component function
    if (/^export (default )?function\b/.test(line)) {
      foundEarlyReturn = false;
    }
  }
}
