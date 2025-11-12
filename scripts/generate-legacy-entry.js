const fs = require('fs')
const path = require('path')

const DIST_DIR = path.join(__dirname, '..', 'dist')
const MANIFEST_PATH = path.join(DIST_DIR, '.vite', 'manifest.json')

function readManifest() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    throw new Error('manifest.json not found. Run `vite build` before generating legacy entries.')
  }
  return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'))
}

function ensureDist() {
  if (!fs.existsSync(DIST_DIR)) {
    throw new Error('dist directory is missing. Run `vite build` first.')
  }
}

function writeStyle(cssFiles) {
  const stylePath = path.join(DIST_DIR, 'style.css')
  const imports = cssFiles
    .map((css) => `@import url('${css.startsWith('/') ? css : `/${css}`}');`)
    .join('\n')

  const content = `/* Legacy compatibility proxy */\n${imports}\n`
  fs.writeFileSync(stylePath, content, 'utf-8')
  console.log(`Written legacy style proxy: ${stylePath}`)
}

function writeScript(entryFile) {
  const scriptPath = path.join(DIST_DIR, 'script.js')
  const modulePath = entryFile.startsWith('/') ? entryFile : `/${entryFile}`
  const content = `// Legacy loader that bootstraps the modern module bundle\n(function () {\n  var script = document.createElement('script')\n  script.type = 'module'\n  script.src = '${modulePath}'\n  document.head.appendChild(script)\n})()\n`
  fs.writeFileSync(scriptPath, content, 'utf-8')
  console.log(`Written legacy script proxy: ${scriptPath}`)
}

function main() {
  ensureDist()
  const manifest = readManifest()
  const entry = manifest['index.html']

  if (!entry) {
    throw new Error('index.html entry missing from manifest')
  }

  const cssFiles = entry.css || []
  if (cssFiles.length === 0) {
    console.warn('No CSS files found in manifest for index.html')
  }

  writeStyle(cssFiles)
  writeScript(entry.file)
}

main()
