import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowRight, ArrowUp, Check, CheckCheck, ChevronDown, CircleHelp, Clock3, Code2, Copy, FileText, FlaskConical, Layers3, LoaderCircle, MessageSquareText, Package, Play, Plus, RotateCcw, ShieldCheck, Sparkles, Square, X, Zap } from 'lucide-react'
import { EXAMPLE_PROMPTS, MODELS, simulateResponse, type Model, type SimulationResult } from './lib/simulator'

type Slot = { id: number; modelId: string; status: 'idle' | 'loading' | 'success' | 'error'; result?: SimulationResult; error?: string }
const createSlots = (): Slot[] => [MODELS[0], MODELS.find(m => m.provider === 'anthropic')!].map((model, index) => ({ id: index + 1, modelId: model.id, status: 'idle' }))
const number = (value: number) => value.toLocaleString('en-US')

function BrandMark({ small = false }: { small?: boolean }) {
  return <span className={`brand-mark ${small ? 'small' : ''}`} aria-hidden="true"><Layers3 size={small ? 19 : 22} strokeWidth={2.3} /></span>
}

function ProviderMark({ model, muted = false }: { model: Model; muted?: boolean }) {
  return <span className={`provider-mark ${model.provider} ${muted ? 'muted' : ''}`} aria-hidden="true">
    {model.provider === 'openai' ? <Sparkles size={21} /> : model.provider === 'anthropic' ? <span className="claude-symbol">✳</span> : <span className="gemini-symbol">✦</span>}
  </span>
}

function ModelCard({ slot, slots, running, onModelChange, onRemove, onCopy }: {
  slot: Slot; slots: Slot[]; running: boolean; onModelChange: (id: number, modelId: string) => void; onRemove: (id: number) => void; onCopy: (text: string) => void
}) {
  const model = MODELS.find(m => m.id === slot.modelId)!
  const result = slot.result
  const loading = slot.status === 'loading'
  return <article className={`model-card ${loading ? 'is-loading' : ''}`} aria-label={`${model.name} 비교 영역`} aria-busy={loading}>
    <div className="model-card-header">
      <ProviderMark model={model} />
      <div className="model-identity">
        <div className="select-wrap">
          <select aria-label={`모델 ${slots.findIndex(s => s.id === slot.id) + 1} 선택`} value={slot.modelId} disabled={running} onChange={e => onModelChange(slot.id, e.target.value)}>
            {['openai', 'anthropic', 'google'].map(provider => <optgroup key={provider} label={MODELS.find(m => m.provider === provider)!.providerName}>
              {MODELS.filter(m => m.provider === provider).map(m => <option key={m.id} value={m.id} disabled={slots.some(s => s.id !== slot.id && s.modelId === m.id)}>{m.name}</option>)}
            </optgroup>)}
          </select>
          <ChevronDown size={14} aria-hidden="true" />
        </div>
        <span className="provider-name">{model.providerName}</span>
      </div>
      {slots.length > 2 && <button className="icon-button remove-model" aria-label={`${model.name} 모델 제거`} title="모델 제거" disabled={running} onClick={() => onRemove(slot.id)}><X size={16} /></button>}
    </div>
    <div className="response-heading">
      <span>응답 결과</span>
      <span className={`status-pill ${slot.status}`}>
        {loading ? <><LoaderCircle size={11} className="spin" /> 생성 중</> : slot.status === 'success' ? <><Check size={11} /> 성공</> : slot.status === 'error' ? '실행 실패' : <><span className="status-dot" /> 대기 중</>}
      </span>
      {result && <button className="icon-button copy-button" onClick={() => onCopy(result.text)} aria-label={`${model.name} 응답 복사`} title="응답 복사"><Copy size={14} /></button>}
    </div>
    <div className={`response-body ${result ? 'has-result' : ''}`} tabIndex={result ? 0 : undefined} aria-label={`${model.name} 응답 내용`}>
      {loading ? <div className="loading-content"><div className="thinking-orbit"><ProviderMark model={model} /><span /></div><strong>응답을 생성하고 있습니다</strong><p>동일한 Prompt로 시뮬레이션 중입니다.</p><div className="skeleton-lines"><i /><i /><i /></div></div>
        : result ? <pre className={result.text.trim().startsWith('{') || result.text.trim().startsWith('[') ? 'json-result' : ''}>{result.text}</pre>
        : slot.status === 'error' ? <div className="empty-content"><CircleHelp size={28} /><strong>응답을 불러오지 못했습니다</strong><p>{slot.error}<br />비교 실행을 눌러 다시 시도해주세요.</p></div>
        : <div className="empty-content"><div className="empty-illustration"><MessageSquareText size={28} strokeWidth={1.5} /><span><Sparkles size={12} /></span></div><strong>첫 번째 응답을 기다리고 있어요</strong><p>Prompt를 입력하고 비교를 실행하면<br />이곳에 모델의 응답이 표시됩니다.</p><span className="empty-caption">READY WHEN YOU ARE</span></div>}
    </div>
    <div className="metrics" aria-label={`${model.name} 시뮬레이션 지표`}>
      <div className="metric"><span><Clock3 size={13} /> 응답 시간</span><strong>{result ? <>{(result.latencyMs / 1000).toFixed(2)}<small>s</small></> : <em>—</em>}</strong></div>
      <div className="metric"><span><Zap size={13} /> 예상 비용 <span className="metric-demo">MOCK</span></span><strong>{result ? <>${result.costUsd.toFixed(6)}</> : <em>—</em>}</strong></div>
      <div className="metric"><span><ArrowUp size={13} /> Input tokens</span><strong>{result ? <>{number(result.inputTokens)}<small>tokens</small></> : <em>—</em>}</strong></div>
      <div className="metric"><span><ArrowDown size={13} /> Output tokens</span><strong>{result ? <>{number(result.outputTokens)}<small>tokens</small></> : <em>—</em>}</strong></div>
    </div>
    <div className="card-footnote"><FlaskConical size={12} /> {result ? '모든 응답과 지표는 시뮬레이션 결과입니다' : '실행 후 시뮬레이션 지표가 표시됩니다'}</div>
  </article>
}

export default function App() {
  const [slots, setSlots] = useState<Slot[]>(createSlots)
  const [prompt, setPrompt] = useState('')
  const [running, setRunning] = useState(false)
  const [lastPrompt, setLastPrompt] = useState('')
  const [runNumber, setRunNumber] = useState(0)
  const [cancelled, setCancelled] = useState(false)
  const [toast, setToast] = useState('')
  const [guideOpen, setGuideOpen] = useState(false)
  const controller = useRef<AbortController | null>(null)
  const generation = useRef(0)
  const nextId = useRef(3)
  const promptRef = useRef<HTMLTextAreaElement>(null)
  const guideRef = useRef<HTMLDialogElement>(null)
  const completed = slots.filter(s => s.status === 'success').length
  const hasResults = slots.some(s => s.result)
  const stale = hasResults && lastPrompt !== prompt

  useEffect(() => () => { generation.current++; controller.current?.abort() }, [])
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 3000); return () => clearTimeout(timer) }, [toast])
  useEffect(() => { if (guideOpen) guideRef.current?.showModal(); else guideRef.current?.close() }, [guideOpen])

  async function execute() {
    if (!prompt.trim() || controller.current || running) return
    const input = prompt
    const run = ++generation.current
    const abortController = new AbortController()
    controller.current = abortController
    setRunning(true)
    setCancelled(false)
    setLastPrompt(input)
    setRunNumber(value => value + 1)
    setSlots(current => current.map(s => ({ id: s.id, modelId: s.modelId, status: 'loading' })))
    await Promise.allSettled(slots.map(async slot => {
      try {
        const result = await simulateResponse(slot.modelId, input, abortController.signal)
        if (run !== generation.current) return
        setSlots(current => current.map(s => s.id === slot.id ? { ...s, status: result.success ? 'success' : 'error', result } : s))
      } catch (error) {
        if (run !== generation.current) return
        setSlots(current => current.map(s => s.id === slot.id ? { ...s, status: abortController.signal.aborted ? 'idle' : 'error', error: error instanceof Error ? error.message : '시뮬레이션 오류' } : s))
      }
    }))
    if (run === generation.current) { setRunning(false); controller.current = null }
  }

  function stop() { setCancelled(true); controller.current?.abort() }
  function addModel() {
    if (running || slots.length >= 4) return
    const model = MODELS.find(m => !slots.some(s => s.modelId === m.id))!
    setSlots(current => [...current, { id: nextId.current++, modelId: model.id, status: 'idle' }])
  }
  function changeModel(id: number, modelId: string) {
    if (running || slots.some(s => s.id !== id && s.modelId === modelId)) return
    setSlots(current => current.map(s => s.id === id ? { id, modelId, status: 'idle' } : s))
  }
  function reset() {
    if (running) return
    setPrompt(''); setLastPrompt(''); setCancelled(false)
    setSlots(current => current.map(s => ({ id: s.id, modelId: s.modelId, status: 'idle' })))
    promptRef.current?.focus()
  }
  async function copy(text: string) {
    try { await navigator.clipboard.writeText(text); setToast('응답을 클립보드에 복사했습니다.') }
    catch { setToast('복사할 수 없습니다. 응답 텍스트를 직접 선택해 복사해주세요.') }
  }

  return <div className="app-shell">
    <aside className="side-rail" aria-label="워크스페이스">
      <a href="#main" className="rail-brand" aria-label="Modelab 홈"><BrandMark small /></a>
      <div className="rail-divider" />
      <a href="#comparison" className="rail-item active" aria-label="모델 비교" title="모델 비교"><Layers3 size={21} /></a>
      <div className="rail-bottom"><button className="rail-item" onClick={() => setGuideOpen(true)} aria-label="사용 가이드" title="사용 가이드"><CircleHelp size={21} /></button><span className="workspace-avatar" title="PoC 워크스페이스">M</span></div>
    </aside>

    <div className="workspace">
      <header className="topbar">
        <a href="#main" className="wordmark">modelab<span /></a>
        <span className="topbar-divider" />
        <div className="breadcrumbs"><span>Workspace</span><span className="breadcrumb-slash">/</span><strong>Multi-LLM Simulator</strong></div>
        <div className="topbar-actions"><span className="demo-badge"><span /> PoC Demo</span><button className="guide-button" onClick={() => setGuideOpen(true)}><CircleHelp size={15} /><span>데모 가이드</span></button></div>
      </header>

      <main id="main" className="main-content">
        <section className="page-intro">
          <div><div className="eyebrow"><span /> MULTI-MODEL PLAYGROUND</div><h1>하나의 질문, 다양한 가능성<span>.</span></h1><p>여러 AI 모델의 응답을 한곳에서 비교하고, 우리 업무에 맞는 가능성을 탐색하세요.</p></div>
          <div className="flow-indicator" aria-label="모델 선택, Prompt 입력, 결과 비교"><span><i>1</i> 모델 선택</span><ArrowRight size={13} /><span><i>2</i> Prompt 입력</span><ArrowRight size={13} /><span><i>3</i> 결과 비교</span></div>
        </section>

        <div className="simulation-notice"><span className="notice-icon"><FlaskConical size={17} /></span><p><strong>지금은 시뮬레이션 모드입니다.</strong> 응답과 모든 성능 지표는 데모용 Mock 데이터이며, 실제 모델 성능이나 API 요금을 의미하지 않습니다.</p><span className="local-badge">API 호출 없음</span></div>

        <section className="prompt-panel" aria-labelledby="prompt-title">
          <div className="section-header prompt-section-header"><div className="section-title"><span className="step-number">01</span><h2 id="prompt-title">공통 Prompt</h2><span className="section-description">하나의 입력, 동일한 조건</span></div><span className="shared-label"><CheckCheck size={14} /> 전체 모델에 동일하게 전달</span></div>
          <div className="prompt-editor"><label className="sr-only" htmlFor="common-prompt">공통 Prompt 입력</label><textarea ref={promptRef} id="common-prompt" placeholder={'어떤 작업을 비교해볼까요?\n모든 모델에 전달할 질문이나 업무 요청을 입력하세요.'} value={prompt} maxLength={5000} disabled={running} onChange={e => setPrompt(e.target.value.slice(0, 5000))} onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); void execute() } }} /><div className="editor-footer"><span><span className="editor-status-dot" /> {running ? `${slots.length}개 모델에 동일한 Prompt를 전달했습니다` : '질문, 요약, 데이터 변환까지 자유롭게 입력하세요'}</span><span>{number(prompt.length)} <span className="muted-text">/ 5,000</span></span></div></div>
          <div className="prompt-actions"><div className="examples"><span className="examples-label"><Sparkles size={13} /> 빠르게 시작</span>{EXAMPLE_PROMPTS.map((example, i) => { const Icon = [Package, FileText, Code2][i]; return <button key={example.id} className={`example-button ${prompt === example.prompt ? 'selected' : ''}`} disabled={running} onClick={() => { setPrompt(example.prompt); promptRef.current?.focus() }}><Icon size={13} />{example.label}</button> })}</div><div className="execute-actions"><button className="icon-button reset-button" disabled={running || (!prompt && !hasResults)} onClick={reset} aria-label="Prompt 및 결과 초기화" title="Prompt 및 결과 초기화"><RotateCcw size={16} /></button>{running ? <button className="stop-button" onClick={stop}><Square size={12} fill="currentColor" /> 실행 중지</button> : <button className="run-button" disabled={!prompt.trim()} onClick={() => void execute()}><Play size={14} fill="currentColor" /> 비교 실행 <kbd>Ctrl ↵</kbd></button>}</div></div>
        </section>

        <section id="comparison" className="comparison-section" aria-labelledby="comparison-title">
          <div className="section-header comparison-section-header"><div className="section-title"><span className="step-number">02</span><h2 id="comparison-title">모델 비교</h2><span className="count-badge">{slots.length}<span>/ 4</span></span></div><div className="comparison-actions"><span className="comparison-progress" role="status">{running ? <><LoaderCircle size={13} className="spin" /> {completed} / {slots.length} 응답 완료</> : cancelled ? '실행이 중지되었습니다' : hasResults ? <><Check size={14} /> {completed}개 응답 완료</> : '최소 2개 · 최대 4개 모델'}</span><button className="add-model-button" disabled={running || slots.length >= 4} onClick={addModel}><Plus size={15} /> 모델 추가</button></div></div>
          {(hasResults || running) && <div className={`run-context ${stale ? 'stale' : ''}`}><span className="run-label">RUN {String(runNumber).padStart(2, '0')}</span><span>{stale ? 'Prompt가 변경되었습니다. 현재 카드는 이전 입력의 결과입니다.' : '동일한 Prompt로 생성한 시뮬레이션 결과입니다.'}</span><details><summary>실행 Prompt 확인 <ChevronDown size={12} /></summary><p>{lastPrompt}</p></details></div>}
          <div className={`model-grid columns-${slots.length}`}>{slots.map(slot => <ModelCard key={slot.id} slot={slot} slots={slots} running={running} onModelChange={changeModel} onRemove={id => { if (!running && slots.length > 2) setSlots(current => current.filter(s => s.id !== id)) }} onCopy={text => void copy(text)} />)}</div>
          <div className="comparison-footnote"><ShieldCheck size={14} /><p>같은 입력을 나란히 비교합니다. 지표는 매 실행마다 달라지며, 모델의 우열이나 순위를 평가하지 않습니다.</p><span>{slots.length} MODELS · ONE PROMPT</span></div>
        </section>
        <footer className="page-footer"><span><BrandMark small /> modelab <span className="footer-slash">/</span><span>Build better with the right model.</span></span><span><span className="footer-status-dot" /> Local simulation <span className="footer-slash">·</span> PoC Prototype v1.0</span></footer>
      </main>
    </div>

    {toast && <div className="toast" role="status"><Check size={16} />{toast}</div>}
    <dialog ref={guideRef} className="guide-dialog" aria-label="데모 사용 가이드" onCancel={() => setGuideOpen(false)} onClick={e => { if (e.target === e.currentTarget) setGuideOpen(false) }}>
      <div className="guide-dialog-header"><span className="guide-heading-icon"><FlaskConical size={23} /></span><button className="icon-button" onClick={() => setGuideOpen(false)} aria-label="가이드 닫기"><X size={19} /></button></div><span className="eyebrow">A QUICK WALKTHROUGH</span><h2>비교는 간단하게,<br />가능성은 다양하게.</h2><p className="guide-intro">약 1분이면 핵심 흐름을 경험할 수 있습니다.</p><ol><li><span>1</span><div><strong>비교할 모델을 선택하세요</strong><p>카드 상단에서 모델을 바꾸고 최대 4개까지 추가하세요. 같은 모델은 중복 선택할 수 없습니다.</p></div></li><li><span>2</span><div><strong>공통 Prompt를 입력하세요</strong><p>업무 요청을 직접 작성하거나, 상품 설명·요약·JSON 변환 예시를 선택하세요.</p></div></li><li><span>3</span><div><strong>실행하고 나란히 비교하세요</strong><p>모델별 응답과 시간, Token, 예상 비용을 확인하세요. 응답 상단의 복사 버튼도 사용할 수 있습니다.</p></div></li></ol><div className="guide-disclaimer">이 데모는 로컬에서 준비된 예시를 생성합니다. 실제 AI 추론, 네트워크 요청, 과금은 발생하지 않습니다. 모델명은 선택 UI를 위한 예시입니다.</div><button className="run-button guide-start" onClick={() => { setGuideOpen(false); promptRef.current?.focus() }}>시작하기 <ArrowRight size={16} /></button>
    </dialog>
  </div>
}
