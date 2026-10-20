import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const cli = process.env.ORCA_CLI_COMMAND || 'orca'
const initialPage = process.env.SIMULATOR_PAGE_ID
let page = initialPage
function orca(...args) {
  const output = execFileSync(cli, [...args, ...(page ? ['--page', page] : []), '--json'], { encoding: 'utf8', timeout: 20000, maxBuffer: 20 * 1024 * 1024 })
  const receipt = JSON.parse(output)
  if (!receipt.ok) throw new Error(JSON.stringify(receipt.error))
  return receipt.result
}
function evaluate(expression) {
  const receipt = orca('eval', '--expression', `JSON.stringify(${expression})`)
  return JSON.parse(receipt.result)
}
let snapshot
const reports = []
function observe() { snapshot = orca('snapshot'); return snapshot }
function ref(name, role = 'button') {
  const match = Object.entries(snapshot.refs).find(([, value]) => value.role === role && value.name === name)
  assert.ok(match, `Missing ${role}: ${name}`)
  return `@${match[0]}`
}
function click(name) { orca('click', '--element', ref(name)); observe() }
function check(label, expression) { assert.equal(evaluate(expression), true, label); reports.push(label); console.log(`PASS ${label}`) }
function screenshot(name) {
  const receipt = orca('screenshot')
  writeFileSync(`.test-artifacts/${name}.png`, Buffer.from(receipt.data, 'base64'))
}
async function until(expression) {
  const end = Date.now() + 12000
  while (Date.now() < end) {
    if (evaluate(expression)) return
    await new Promise(resolve => setTimeout(resolve, 150))
  }
  throw new Error(`Timed out: ${expression}`)
}

mkdirSync('.test-artifacts', { recursive: true })
if (!page) page = orca('tab', 'create', '--url', process.env.SIMULATOR_URL || 'http://127.0.0.1:5173/').browserPageId
else orca('reload')
orca('exec', '--command', 'set viewport 1440 900')
observe()
check('Initial two models and disabled empty execution', `document.querySelectorAll('.model-card').length === 2 && document.querySelector('.run-button').disabled && document.querySelectorAll('.remove-model').length === 0`)
screenshot('desktop-idle')
orca('fill', '--element', ref('공통 Prompt 입력', 'textbox'), '--value', '   ')
observe()
check('Whitespace input cannot execute', `document.querySelector('.run-button').disabled`)
click('모델 추가')
check('Third model added', `document.querySelectorAll('.model-card').length === 3`)
click('모델 추가')
check('Four model limit', `document.querySelectorAll('.model-card').length === 4 && document.querySelector('.add-model-button').disabled`)
check('Duplicate choices disabled in every selector', `[...document.querySelectorAll('select')].every(s=>[...s.options].every(o=>o.value===s.value || ![...document.querySelectorAll('select')].some(other=>other!==s && other.value===o.value) || o.disabled))`)
orca('select', '--element', ref('모델 4 선택', 'combobox'), '--value', 'gemini-2.5-pro')
observe()
check('Google model selection', `document.querySelectorAll('select')[3].value === 'gemini-2.5-pro'`)
click('제품 설명 작성')
// Predictable staggered delays prove independent card completion without tying speed to a provider.
evaluate(`(()=>{let i=0;const values=[0,0.2,0.1,0.95,0.2,0.4,0.4,0.2,0.8,0.7,0.2,0.6];window.__originalRandom=Math.random;Math.random=()=>values[i++%values.length];window.__networkCalls=[];window.fetch=(...args)=>{window.__networkCalls.push(args);throw new Error('Unexpected network call')};return true})()`)
click('비교 실행 Ctrl ↵')
check('All cards loading and inputs locked', `document.querySelectorAll('.is-loading').length === 4 && document.querySelector('textarea').disabled && [...document.querySelectorAll('select')].every(s=>s.disabled)`)
screenshot('desktop-loading-four')
await until(`document.querySelectorAll('.status-pill.success').length > 0 && document.querySelectorAll('.is-loading').length > 0`)
check('Responses finish independently', `document.querySelectorAll('.status-pill.success').length > 0 && document.querySelectorAll('.is-loading').length > 0`)
await until(`document.querySelectorAll('.status-pill.success').length === 4`)
observe()
check('All responses and metrics complete', `document.querySelectorAll('.response-body pre').length === 4 && [...document.querySelectorAll('.metric strong')].every(e=>e.textContent !== '—')`)
check('Responses differ and Input Token counts match', `new Set([...document.querySelectorAll('.response-body pre')].map(e=>e.textContent)).size === 4 && new Set([...document.querySelectorAll('.metrics')].map(e=>e.children[2].querySelector('strong').textContent)).size === 1`)
check('No external request during comparison', `window.__networkCalls.length === 0 && performance.getEntriesByType('resource').every(e=>new URL(e.name).origin===location.origin)`)
screenshot('desktop-results-four')
click('GPT-4.1 응답 복사')
check('Response copied successfully', `document.querySelector('.toast')?.textContent.includes('복사했습니다') === true`)
click('JSON 변환')
check('Changed prompt labels old results', `document.querySelector('.run-context').classList.contains('stale')`)
click('비교 실행 Ctrl ↵')
await until(`document.querySelectorAll('.status-pill.success').length === 4`)
check('JSON outputs are valid on all selected models', `[...document.querySelectorAll('.response-body pre')].every(e=>JSON.parse(e.textContent).demo === true)`)
observe()
click('Gemini 2.5 Pro 모델 제거')
check('Model removal preserves other responses', `document.querySelectorAll('.model-card').length === 3 && document.querySelectorAll('.response-body pre').length === 3`)
click('GPT-4.1 mini 모델 제거')
check('Two model minimum', `document.querySelectorAll('.model-card').length === 2 && document.querySelectorAll('.remove-model').length === 0`)
click('텍스트 요약')
click('비교 실행 Ctrl ↵')
click('실행 중지')
await until(`!document.querySelector('.stop-button')`)
observe()
check('Stop clears loading and unlocks controls', `document.querySelectorAll('.is-loading').length === 0 && !document.querySelector('textarea').disabled && document.querySelector('.comparison-progress').textContent.includes('중지')`)
click('비교 실행 Ctrl ↵')
await until(`document.querySelectorAll('.status-pill.success').length === 2`)
observe()
check('Re-execution after stop succeeds', `document.querySelectorAll('.response-body pre').length === 2`)
orca('fill', '--element', ref('공통 Prompt 입력', 'textbox'), '--value', '매우 긴 업무 요청 '.repeat(500))
observe()
check('Long prompt is bounded to 5000 characters', `document.querySelector('textarea').value.length <= 5000 && document.querySelector('textarea').maxLength === 5000`)
click('비교 실행 Ctrl ↵')
await until(`document.querySelectorAll('.status-pill.success').length === 2`)
check('Long input never expands result columns', `[...document.querySelectorAll('.response-body')].every(e=>e.scrollWidth<=e.clientWidth+1)`)
observe()
click('데모 가이드')
check('Guide opens as modal', `document.querySelector('dialog').open`)
click('가이드 닫기')
check('Guide closes', `!document.querySelector('dialog').open`)
click('Prompt 및 결과 초기화')
check('Reset clears prompt and results', `document.querySelector('textarea').value === '' && document.querySelectorAll('.response-body pre').length === 0 && document.querySelector('.run-button').disabled`)
for (const [width, height, columns] of [[390, 844, 1], [768, 1024, 2], [1440, 900, 2]]) {
  orca('exec', '--command', `set viewport ${width} ${height}`)
  observe()
  check(`Responsive ${width}px: no horizontal page overflow`, `document.documentElement.scrollWidth <= innerWidth + 1`)
  check(`Responsive ${width}px: ${columns} result columns`, `getComputedStyle(document.querySelector('.model-grid')).gridTemplateColumns.split(' ').length === ${columns}`)
  screenshot(`responsive-${width}`)
}
click('모델 추가')
check('Desktop three models use three columns', `getComputedStyle(document.querySelector('.model-grid')).gridTemplateColumns.split(' ').length === 3`)
click('모델 추가')
check('Desktop four models use four columns', `getComputedStyle(document.querySelector('.model-grid')).gridTemplateColumns.split(' ').length === 4`)
orca('exec', '--command', 'set viewport 390 844')
observe()
check('Mobile four models stack without overflow', `document.querySelectorAll('.model-card').length === 4 && getComputedStyle(document.querySelector('.model-grid')).gridTemplateColumns.split(' ').length === 1 && document.documentElement.scrollWidth <= innerWidth + 1`)
screenshot('mobile-four')
orca('exec', '--command', 'set viewport 1440 900')
orca('reload')
observe()
console.log('UI checks complete. Page:', page)
writeFileSync('.test-artifacts/browser-report.json', JSON.stringify({ page, passed: reports.length, checks: reports }, null, 2))
