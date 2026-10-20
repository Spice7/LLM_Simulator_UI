import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EXAMPLE_PROMPTS, MODELS, simulateResponse } from './simulator';

describe('local business demo simulator', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('exports six distinct example models and the three Korean prompt scenarios', () => {
    expect(MODELS.map((model) => model.name)).toEqual([
      'GPT-4.1', 'GPT-4.1 mini', 'Claude Sonnet 4', 'Claude Haiku 3.5', 'Gemini 2.5 Pro', 'Gemini 2.5 Flash',
    ]);
    expect(new Set(MODELS.map((model) => model.id)).size).toBe(6);
    expect(new Set(MODELS.map((model) => model.provider))).toEqual(new Set(['openai', 'anthropic', 'google']));
    expect(MODELS.every((model) => model.providerName && model.description.includes('예시'))).toBe(true);
    expect(EXAMPLE_PROMPTS.map((example) => example.id)).toEqual(['product', 'summary', 'json']);
    expect(EXAMPLE_PROMPTS.every((example) => /[가-힣]/.test(example.label + example.prompt))).toBe(true);
  });

  it('rejects unknown model IDs without scheduling work', async () => {
    await expect(simulateResponse('unknown', '안녕하세요')).rejects.toThrow('지원하지 않는');
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(['', ' ', '\t\n\r', '\u3000'])('rejects empty or whitespace input %j', async (prompt) => {
    await expect(simulateResponse(MODELS[0].id, prompt)).rejects.toThrow('프롬프트');
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([
    ['product', '플로우', '12,000원'],
    ['summary', '온보딩', '다음 주 수요일'],
  ])('returns a readable Korean %s sample', async (scenario, expectedA, expectedB) => {
    const example = EXAMPLE_PROMPTS.find((entry) => entry.id === scenario)!;
    const pending = simulateResponse(MODELS[0].id, example.prompt);
    await vi.runAllTimersAsync();
    const result = await pending;
    expect(result.text).toContain(expectedA);
    expect(result.text).toContain(expectedB);
    expect(result.text).toContain('로컬 데모 샘플');
    expect(result.text).toContain('실제 AI 추론 결과가 아닙니다');
    expect(result.text).not.toContain('```');
    expect(result).toMatchObject({ modelId: MODELS[0].id, prompt: example.prompt, success: true });
  });

  it('returns valid JSON for the JSON example on every model', async () => {
    const prompt = EXAMPLE_PROMPTS.find((entry) => entry.id === 'json')!.prompt;
    const pending = Promise.all(MODELS.map((model) => simulateResponse(model.id, prompt)));
    await vi.runAllTimersAsync();
    const results = await pending;
    results.forEach((result, index) => {
      const parsed = JSON.parse(result.text);
      expect(parsed).toMatchObject({
        demo: true,
        model: MODELS[index].name,
        sample: { customer: '한빛상사', quantity: 20, unitPriceKrw: 3000, totalPriceKrw: 60000 },
      });
      expect(parsed.notice).toContain('고정 예시');
      expect(result.text).not.toContain('```');
    });
    expect(new Set(results.map((result) => result.text)).size).toBe(6);
  });

  it.each(['product', 'summary', 'json', 'custom'])('gives distinct content for every model in %s', async (scenario) => {
    const prompt = EXAMPLE_PROMPTS.find((entry) => entry.id === scenario)?.prompt ?? '새로운 사업 계획을 도와주세요';
    const pending = Promise.all(MODELS.map((model) => simulateResponse(model.id, prompt)));
    await vi.runAllTimersAsync();
    const results = await pending;
    const contents = results.map((result) => {
      if (scenario === 'json') return JSON.parse(result.text).note;
      return result.text.split('\n\n')[0];
    });
    // Compare the canned body, not merely a model name in the header.
    expect(new Set(contents).size).toBe(6);
  });

  it('preserves the original prompt and uses a shared input estimate across all providers', async () => {
    const prompt = '  같은 한국어 요청입니다 😀\n\t';
    const pending = Promise.all(MODELS.map((model) => simulateResponse(model.id, prompt)));
    await vi.runAllTimersAsync();
    const results = await pending;
    expect(new Set(results.map((result) => result.inputTokens)).size).toBe(1);
    for (const result of results) {
      expect(result.prompt).toBe(prompt);
      expect(result.inputTokens).toBe(Math.ceil(Array.from(prompt).length / 2));
      expect(result.outputTokens).toBeGreaterThan(0);
    }
  });

  it('quotes a bounded custom input and explicitly identifies it as a sample', async () => {
    const prompt = '  고객이 말했습니다: "안녕"\n' + '가'.repeat(500) + '비공개끝표시';
    const pending = simulateResponse(MODELS[0].id, prompt);
    await vi.runAllTimersAsync();
    const result = await pending;
    const quotedInput = result.text.split('\n').find(line => line.startsWith('입력 발췌: '))!.replace('입력 발췌: ', '');
    const decodedInput = JSON.parse(quotedInput);
    expect(Array.from(decodedInput).length).toBe(161);
    expect(decodedInput).toBe(Array.from(prompt.trim()).slice(0, 160).join('') + '…');
    expect(result.text).not.toContain('비공개끝표시');
    expect(result.text).toContain('예시 응답');
    expect(result.text).toContain('실제 AI 추론 결과가 아닙니다');
    expect(result.prompt).toBe(prompt);
  });

  it('labels custom scenario matches as fixed samples without pretending to convert input', async () => {
    const prompt = '다른 고객사와 수량을 JSON으로 변환해 주세요: 수량 999 ' + '나'.repeat(200);
    const pending = simulateResponse(MODELS[2].id, prompt);
    await vi.runAllTimersAsync();
    const result = await pending;
    const parsed = JSON.parse(result.text);
    expect(parsed.demo).toBe(true);
    expect(parsed.notice).toContain('실제로 변환한 결과가 아닙니다');
    expect(parsed.sample.quantity).toBe(20);
    expect(Array.from(parsed.inputExcerpt).length).toBe(161);
    expect(result.prompt).toBe(prompt);
  });

  it.each([
    [0, 1500],
    [0.5, 3000],
    [0.999999, 4500],
  ])('waits the full randomized delay for random=%s', async (random, expectedDelay) => {
    vi.mocked(Math.random).mockReturnValue(random);
    let settled = false;
    const pending = simulateResponse(MODELS[0].id, '안녕하세요').then((result) => {
      settled = true;
      return result;
    });
    await vi.advanceTimersByTimeAsync(expectedDelay - 1);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    const result = await pending;
    expect(settled).toBe(true);
    expect(result.latencyMs).toBe(expectedDelay);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('uses provider-independent latency and cost distributions', async () => {
    const pending = Promise.all(MODELS.map((model) => simulateResponse(model.id, '비교용 요청')));
    await vi.runAllTimersAsync();
    const results = await pending;
    expect(new Set(results.map((result) => result.latencyMs))).toEqual(new Set([3000]));
    expect(new Set(results.map((result) => result.costUsd))).toEqual(new Set([0.00505]));
  });

  it('draws each mock metric separately and randomizes repeated requests', async () => {
    vi.mocked(Math.random)
      .mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0.9)
      .mockReturnValueOnce(0.9).mockReturnValueOnce(0.9).mockReturnValueOnce(0);
    const first = simulateResponse(MODELS[0].id, '비교용 요청');
    const second = simulateResponse(MODELS[0].id, '비교용 요청');
    await vi.runAllTimersAsync();
    const [a, b] = await Promise.all([first, second]);
    expect(a.latencyMs).toBeLessThan(b.latencyMs);
    expect(a.costUsd).toBeGreaterThan(b.costUsd);
    expect(a.outputTokens).toBeLessThan(b.outputTokens);
    expect(a.inputTokens).toBe(b.inputTokens);
  });

  it('rejects pre-aborted signals without a timer or listener', async () => {
    const controller = new AbortController();
    controller.abort();
    const addListener = vi.spyOn(controller.signal, 'addEventListener');
    await expect(simulateResponse(MODELS[0].id, '취소할 요청', controller.signal))
      .rejects.toMatchObject({ name: 'AbortError' });
    expect(vi.getTimerCount()).toBe(0);
    expect(addListener).not.toHaveBeenCalled();
  });

  it('clears the timer and abort listener when cancelled in flight', async () => {
    const controller = new AbortController();
    const addListener = vi.spyOn(controller.signal, 'addEventListener');
    const removeListener = vi.spyOn(controller.signal, 'removeEventListener');
    const pending = simulateResponse(MODELS[0].id, '취소할 요청', controller.signal);
    const rejection = expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    await vi.advanceTimersByTimeAsync(1000);
    controller.abort();
    await rejection;
    expect(vi.getTimerCount()).toBe(0);
    expect(addListener).toHaveBeenCalledWith('abort', expect.any(Function), { once: true });
    expect(removeListener).toHaveBeenCalledWith('abort', addListener.mock.calls[0][1]);
    await vi.runAllTimersAsync();
    expect(removeListener).toHaveBeenCalledTimes(1);
  });

  it('removes the abort listener after successful completion', async () => {
    const controller = new AbortController();
    const removeListener = vi.spyOn(controller.signal, 'removeEventListener');
    const pending = simulateResponse(MODELS[0].id, '완료할 요청', controller.signal);
    await vi.runAllTimersAsync();
    const result = await pending;
    expect(result.success).toBe(true);
    expect(removeListener).toHaveBeenCalledTimes(1);
    controller.abort();
    expect(removeListener).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('aborts every request sharing a signal while allowing an independent request to complete', async () => {
    const controller = new AbortController();
    const shared = MODELS.map((model) => simulateResponse(model.id, '취소할 요청', controller.signal));
    const sharedResults = Promise.allSettled(shared);
    const independent = simulateResponse(MODELS[0].id, '유지할 요청');
    controller.abort();
    expect(vi.getTimerCount()).toBe(1);
    await vi.runAllTimersAsync();
    for (const result of await sharedResults) {
      expect(result.status).toBe('rejected');
      if (result.status === 'rejected') expect(result.reason.name).toBe('AbortError');
    }
    expect((await independent).success).toBe(true);
  });
});
