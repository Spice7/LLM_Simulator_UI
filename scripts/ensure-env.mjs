// Runs before dev/build/test/preview: checks the Node.js version and installs
// dependencies when node_modules is missing or out of date with the lockfile.
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const stampFile = join(root, 'node_modules', '.deps-hash')

// Keep in sync with "engines.node" in package.json (required by Vite 8).
const [major, minor] = process.versions.node.split('.').map(Number)
const nodeOk = (major === 20 && minor >= 19) || (major === 22 && minor >= 12) || major >= 23
if (!nodeOk) {
  console.error(`\n[ensure-env] Node.js ${process.versions.node}은(는) 지원하지 않습니다.`)
  console.error('[ensure-env] Node.js 20.19 이상 또는 22.12 이상을 설치한 뒤 다시 실행하세요: https://nodejs.org/\n')
  process.exit(1)
}

function depsHash() {
  const hash = createHash('sha256')
  for (const file of ['package.json', 'package-lock.json']) {
    const path = join(root, file)
    if (existsSync(path)) hash.update(readFileSync(path))
  }
  return hash.digest('hex')
}

// Native bindings (rolldown, lightningcss, tailwind oxide) are per OS/CPU, so a node_modules
// installed on Windows is unusable from WSL/Linux on the same folder, and vice versa.
const platform = `${process.platform}-${process.arch}`
const expected = depsHash()
const [installedPlatform, installedHash] = existsSync(stampFile)
  ? readFileSync(stampFile, 'utf8').trim().split(' ')
  : []
if (installedPlatform === platform && installedHash === expected) process.exit(0)

if (!existsSync(join(root, 'node_modules'))) {
  console.log('[ensure-env] node_modules가 없어 의존성을 설치합니다...')
} else if (installedHash && installedPlatform !== platform) {
  console.log(`[ensure-env] node_modules가 ${installedPlatform}용으로 설치되어 있어 ${platform}용으로 다시 설치합니다...`)
} else {
  console.log('[ensure-env] 의존성 설치 상태를 확인할 수 없거나 package.json/package-lock.json이 변경되어 다시 설치합니다...')
}

// npm_execpath points at npm's CLI when launched through `npm run`; fall back to a shell lookup.
const npmCli = process.env.npm_execpath
function npm(command) {
  const result = npmCli && npmCli.endsWith('.js')
    ? spawnSync(process.execPath, [npmCli, command], { cwd: root, stdio: 'inherit' })
    : spawnSync(`npm ${command}`, { cwd: root, stdio: 'inherit', shell: true })
  return result.status ?? 1
}

// Prefer `npm ci`: it installs exactly what the lockfile says and never rewrites it, so
// different npm versions (e.g. npm 10 in WSL vs npm 11 on Windows) don't leave lockfile diffs.
// It fails when package.json and package-lock.json are out of sync; only then fall back to install.
let status = existsSync(join(root, 'package-lock.json')) ? npm('ci') : 1
if (status !== 0) {
  console.log('\n[ensure-env] npm ci를 사용할 수 없어 npm install로 설치합니다...')
  status = npm('install')
}
if (status !== 0) {
  console.error('\n[ensure-env] 의존성 설치에 실패했습니다. 위 오류를 확인하세요.')
  process.exit(status)
}

// Hash again: the npm install fallback may have rewritten package-lock.json.
writeFileSync(stampFile, `${platform} ${depsHash()}\n`)
