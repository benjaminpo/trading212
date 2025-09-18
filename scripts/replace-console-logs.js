const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');

function listFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    if (e.name.startsWith('.')) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      files.push(...listFiles(full));
    } else if (/(\.(ts|tsx|js|jsx))$/i.test(e.name)) {
      files.push(full);
    }
  }
  return files;
}

function ensureLoggerImport(source) {
  if (!source.includes("@/lib/logger")) {
    const importRegex = /^(import\s.+\n)+/m;
    if (importRegex.test(source)) {
      return source.replace(importRegex, (m) => m + 'import logger from "@/lib/logger";\n');
    }
    return 'import logger from "@/lib/logger";\n' + source;
  }
  return source;
}

function processFile(file) {
  let src = fs.readFileSync(file, 'utf8');
  if (!src.includes('console.log(')) return false;
  src = src.replace(/\bconsole\.log\(/g, 'logger.info(');
  src = ensureLoggerImport(src);
  fs.writeFileSync(file, src);
  return true;
}

const files = listFiles(SRC);
let changed = 0;
for (const f of files) {
  if (processFile(f)) changed++;
}
console.log(`Updated ${changed} files.`);

