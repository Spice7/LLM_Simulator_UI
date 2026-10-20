/** Local demo catalog: names are examples, not a statement of live availability. */
export type Provider = 'openai' | 'anthropic' | 'google';

export interface Model {
  id: string;
  name: string;
  provider: Provider;
  providerName: string;
  description: string;
}

export const MODELS: Model[] = [
  { id: 'gpt-4.1', name: 'GPT-4.1', provider: 'openai', providerName: 'OpenAI', description: '예시 모델 · 핵심 정보를 항목별로 정리하는 샘플' },
  { id: 'gpt-4.1-mini', name: 'GPT-4.1 mini', provider: 'openai', providerName: 'OpenAI', description: '예시 모델 · 짧고 간결한 문장으로 전달하는 샘플' },
  { id: 'claude-sonnet-4', name: 'Claude Sonnet 4', provider: 'anthropic', providerName: 'Anthropic', description: '예시 모델 · 맥락과 활용 장면을 설명하는 샘플' },
  { id: 'claude-haiku-3.5', name: 'Claude Haiku 3.5', provider: 'anthropic', providerName: 'Anthropic', description: '예시 모델 · 실무 체크리스트로 정리하는 샘플' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'google', providerName: 'Google', description: '예시 모델 · 정보와 다음 행동을 연결하는 샘플' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'google', providerName: 'Google', description: '예시 모델 · 한눈에 읽을 수 있는 문구를 제시하는 샘플' },
];

export const EXAMPLE_PROMPTS: { id: string; label: string; prompt: string }[] = [
  {
    id: 'product',
    label: '제품 설명 작성',
    prompt: '팀 협업 도구 플로우의 제품 소개 문구를 작성해 주세요. 주요 기능은 업무 보드, 일정 공유, 주간 보고서이며 이용료는 1인당 월 12,000원입니다.',
  },
  {
    id: 'summary',
    label: '텍스트 요약',
    prompt: '다음 회의 내용을 요약해 주세요. 신규 고객 온보딩은 다음 달 1일 시작합니다. 영업팀은 이번 주 금요일까지 안내 메일 초안을 작성하고, 고객지원팀은 다음 주 수요일까지 FAQ를 정리합니다. 진행 상황은 다음 주 목요일 회의에서 확인합니다.',
  },
  {
    id: 'json',
    label: 'JSON 변환',
    prompt: '다음 주문 정보를 JSON으로 변환해 주세요. 주문번호 ORD-2026-001, 고객사 한빛상사, 상품 업무용 노트, 수량 20개, 개당 가격 3,000원, 배송 상태 준비 중.',
  },
];

export interface SimulationResult {
  modelId: string;
  prompt: string;
  text: string;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  success: boolean;
}

const PRODUCT_SAMPLES = [
  '플로우로 팀의 업무를 한곳에 모으세요.\n• 업무 보드로 담당 업무 확인\n• 일정 공유로 협업 일정 관리\n• 주간 보고서로 진행 상황 정리\n이용료: 1인당 월 12,000원',
  '업무 보드부터 일정 공유, 주간 보고서까지. 플로우와 함께 팀의 하루를 정리하세요. 1인당 월 12,000원으로 시작할 수 있습니다.',
  '이번 주 업무와 다음 회의 일정을 함께 확인해야 할 때, 플로우를 만나보세요. 업무 보드, 일정 공유, 주간 보고서를 한 도구에서 이용할 수 있습니다. 이용료는 1인당 월 12,000원입니다.',
  '플로우 도입 체크리스트\n✓ 업무는 보드에서 확인\n✓ 일정은 팀과 공유\n✓ 주간 진행 상황은 보고서로 정리\n1인당 월 12,000원',
  '팀의 정보를 모으고 다음 업무를 준비하세요. 플로우는 업무 보드, 일정 공유, 주간 보고서를 제공합니다. 1인당 월 12,000원으로 팀 협업을 시작해 보세요.',
  '우리 팀 업무의 한 페이지, 플로우.\n업무 보드 · 일정 공유 · 주간 보고서\n1인당 월 12,000원',
];

const SUMMARY_SAMPLES = [
  '핵심 일정\n• 온보딩 시작: 다음 달 1일\n• 영업팀: 이번 주 금요일까지 안내 메일 초안\n• 고객지원팀: 다음 주 수요일까지 FAQ\n• 진행 확인: 다음 주 목요일 회의',
  '온보딩은 다음 달 1일 시작합니다. 영업팀은 금요일까지 메일 초안을, 고객지원팀은 다음 주 수요일까지 FAQ를 준비합니다. 다음 주 목요일에 진행 상황을 확인합니다.',
  '신규 고객 온보딩 준비를 위해 두 팀이 자료를 마련합니다. 영업팀의 안내 메일 초안 마감은 이번 주 금요일, 고객지원팀의 FAQ 마감은 다음 주 수요일입니다. 다음 주 목요일 점검 후 다음 달 1일 온보딩을 시작합니다.',
  '실행 항목\n□ 영업팀: 안내 메일 초안 / 이번 주 금요일\n□ 고객지원팀: FAQ 정리 / 다음 주 수요일\n□ 공동 점검: 다음 주 목요일\n□ 온보딩 시작: 다음 달 1일',
  '목표: 다음 달 1일 신규 고객 온보딩 시작\n준비: 영업팀 메일 초안(이번 주 금요일), 고객지원팀 FAQ(다음 주 수요일)\n다음 행동: 다음 주 목요일 회의에서 준비 상황 확인',
  '메일 초안 → FAQ 정리 → 진행 점검 → 온보딩 시작\n담당과 마감: 영업팀·이번 주 금요일 / 고객지원팀·다음 주 수요일\n점검: 다음 주 목요일 / 시작: 다음 달 1일',
];

const CUSTOM_SAMPLES = [
  '요청을 검토할 때 목적, 대상, 전달할 핵심 정보를 먼저 정리해 보세요.',
  '핵심 메시지 한 문장과 이를 뒷받침하는 예시를 준비해 보세요.',
  '독자가 어떤 상황에서 이 내용을 읽는지 생각한 뒤 필요한 배경을 덧붙여 보세요.',
  '체크리스트: 목적 확인 → 필요한 정보 수집 → 초안 작성 → 검토.',
  '현재 정보와 추가로 확인할 정보를 나누고, 다음 행동을 한 가지 정해 보세요.',
  '짧은 제목, 핵심 내용, 다음 단계 순서로 초안을 구성해 보세요.',
];

function excerpt(prompt: string): string {
  const characters = Array.from(prompt.trim());
  return characters.slice(0, 160).join('') + (characters.length > 160 ? '…' : '');
}

function responseText(model: Model, prompt: string): string {
  const index = MODELS.findIndex((entry) => entry.id === model.id);
  const inputExcerpt = excerpt(prompt);
  // These branches select static examples; they do not parse or infer user data.
  if (/json/i.test(prompt)) {
    return JSON.stringify({
      demo: true,
      model: model.name,
      notice: '로컬 데모 샘플입니다. 아래 주문은 고정 예시이며 입력을 실제로 변환한 결과가 아닙니다.',
      inputExcerpt,
      sample: {
        orderId: 'ORD-2026-001',
        customer: '한빛상사',
        product: '업무용 노트',
        quantity: 20,
        unitPriceKrw: 3000,
        totalPriceKrw: 60000,
        shippingStatus: '준비 중',
      },
      note: CUSTOM_SAMPLES[index],
    }, null, 2);
  }

  const sample = /요약|summary|summarize/i.test(prompt)
    ? SUMMARY_SAMPLES[index]
    : /제품|상품|소개|product/i.test(prompt)
      ? PRODUCT_SAMPLES[index]
      : CUSTOM_SAMPLES[index];

  return [
    sample,
    '',
    `로컬 데모 샘플 · ${model.name}`,
    '미리 작성된 예시 응답이며 실제 AI 추론 결과가 아닙니다.',
    `입력 발췌: ${JSON.stringify(inputExcerpt)}`,
  ].join('\n');
}

/** Shared character-based estimate, not a provider tokenizer. */
function estimateTokens(value: string): number {
  return Math.max(1, Math.ceil(Array.from(value).length / 2));
}

/** No network: all timings, costs, and outputs are illustrative local samples. */
export async function simulateResponse(
  modelId: string,
  prompt: string,
  signal?: AbortSignal,
): Promise<SimulationResult> {
  const model = MODELS.find((entry) => entry.id === modelId);
  if (!model) throw new Error(`지원하지 않는 예시 모델입니다: ${modelId}`);
  if (typeof prompt !== 'string' || !prompt.trim()) {
    throw new Error('프롬프트를 입력해 주세요.');
  }
  if (signal?.aborted) throw new DOMException('시뮬레이션이 취소되었습니다.', 'AbortError');

  const latencyMs = 1500 + Math.floor(Math.random() * 3001);
  const text = responseText(model, prompt);
  // Independent random draws, without provider weights or real pricing tables.
  const outputTokens = Math.max(1, Math.round(estimateTokens(text) * (0.85 + Math.random() * 0.3)));
  const costUsd = Number((0.0001 + Math.random() * 0.0099).toFixed(6));

  return new Promise<SimulationResult>((resolve, reject) => {
    const cleanup = () => signal?.removeEventListener('abort', onAbort);
    const onAbort = () => {
      clearTimeout(timer);
      cleanup();
      reject(new DOMException('시뮬레이션이 취소되었습니다.', 'AbortError'));
    };
    const timer = setTimeout(() => {
      cleanup();
      resolve({ modelId, prompt, text, latencyMs, inputTokens: estimateTokens(prompt), outputTokens, costUsd, success: true });
    }, latencyMs);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}
