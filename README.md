# Modelab · Multi-LLM Simulator

기업 PoC 미팅에서 직접 조작할 수 있는 한국어 모델 비교 UI입니다. 모든 응답과 지표는 브라우저에서 생성한 Mock 데이터입니다. 실제 LLM API, API Key, 백엔드, 인증 및 저장소를 사용하지 않습니다.

## 실행

Node.js 22.12 이상을 권장합니다. 이 프로젝트는 Node.js 26.8.1에서 검증했습니다.

```sh
npm install
npm run dev
```

터미널에 출력된 로컬 주소를 엽니다. 기본 주소는 `http://127.0.0.1:5173/`입니다. 포트가 사용 중이면 Vite가 다음 포트를 선택합니다.

```sh
npm run build
npm run preview
npm test
```

`build`는 TypeScript 검사와 프로덕션 번들 생성을 수행합니다. `preview`는 `dist/`를 로컬에서 제공합니다. 실제 시연 중에는 인터넷 연결이 필요하지 않습니다. 최초 의존성 설치에는 네트워크가 필요합니다.

## 시연 순서

1. 기본 GPT / Claude 카드의 선택 메뉴에서 모델을 변경합니다. OpenAI·Anthropic·Google의 예시 모델 6개를 제공합니다.
2. `모델 추가`로 최대 4개까지 비교합니다. 3개 이상일 때 카드의 × 버튼으로 제거합니다. 동일 모델은 다른 카드에서 선택할 수 없습니다.
3. `제품 설명 작성`, `텍스트 요약`, `JSON 변환` 중 하나를 선택하거나 공통 Prompt를 작성합니다.
4. `비교 실행` 또는 입력창에서 `Ctrl + Enter` / `⌘ + Enter`를 누릅니다. 모델마다 1.5~4.5초 지연 후 독립적으로 완료됩니다.
5. 응답·시간·Input/Output Token·예상 비용·성공 상태를 확인하고 응답을 복사합니다. 긴 응답은 카드 내부에서 스크롤합니다.
6. Prompt를 변경하면 이전 결과 표시가 나타납니다. 실행 Prompt 확인 메뉴로 결과에 사용된 원문을 확인할 수 있습니다. 중지·재실행·초기화도 지원합니다.

상단 `데모 가이드`에서 앱 내 시연 설명을 볼 수 있습니다. PC에서는 나란히, 좁은 화면에서는 2열 또는 1열로 배치합니다.

## 기술 및 구조

React 19, TypeScript 6, Vite 8, Tailwind CSS 4, Lucide 아이콘을 사용합니다. 외부 이미지·폰트·CDN을 요청하지 않습니다.

```text
src/
  App.tsx                 # 모델 카드, 공통 입력, 상태 관리, 실행 제어, 가이드
  index.css               # Tailwind, 디자인, 반응형 레이아웃, 로딩 애니메이션
  main.tsx                # React 진입점
  lib/
    simulator.ts          # 모델 목록, 예시 Prompt, 독립적인 Mock 응답 서비스
    simulator.test.ts     # Vitest 테스트 25개
scripts/
  browser-smoke.mjs        # Orca 기반 선택적 브라우저 동작 검증
public/
  favicon.svg
```

## 브라우저 동작 검증

Orca가 실행된 개발 환경에서 앱을 먼저 시작한 뒤 실행합니다.

```sh
npm run test:ui
```

필요하면 `ORCA_CLI_COMMAND`, `SIMULATOR_URL`, `SIMULATOR_PAGE_ID` 환경변수로 CLI, 서버 주소 또는 기존 탭을 지정합니다. 이 검증 도구만 Orca를 사용하며, 앱 실행·빌드·Mock 테스트에는 Orca가 필요하지 않습니다. 검증 결과와 스크린샷은 Git에서 제외된 `.test-artifacts/`에 저장합니다.

## Mock 동작 및 제한

- 모델명은 선택 경험을 위한 예시이며, 실제 제공 여부나 최신 모델 목록을 나타내지 않습니다.
- 입력의 키워드에 따라 미리 작성한 한국어 샘플을 선택합니다. 자유 입력에 대한 실제 추론·요약·JSON 변환은 수행하지 않습니다. JSON 출력의 `sample`도 고정 예시임을 명시합니다.
- Input Token은 동일 입력에 대한 공통 문자 기반 추정치입니다. Output Token·지연·비용도 데모용으로 생성합니다. 실제 tokenizer, 측정치, 요금표를 사용하지 않습니다.
- 지연과 비용은 제공업체에 따른 가중치 없이 무작위로 생성합니다. 성능 순위는 제공하지 않습니다.
- 정상 Mock 실행은 성공하도록 구성했습니다. 오류 처리 UI는 있지만 임의의 실패를 강제로 발생시키는 시연 옵션은 제공하지 않습니다.
- 새로고침하면 상태가 초기화됩니다. 결과 복사는 브라우저의 Clipboard API 허용 여부에 따라 제한될 수 있으며 실패 시 안내를 표시합니다.

## 검증 결과

- TypeScript 검사 및 프로덕션 빌드 통과. 개발 서버와 프로덕션 미리보기 HTTP 200 확인.
- Vitest 단위 테스트 25개 통과: 입력 검증, 모델별 응답, JSON 유효성, 동일 Input Token, 지연, 지표 무작위 생성, 취소와 타이머 정리.
- Orca 브라우저 검증 32개 통과: 2~4개 제한, 중복 선택 방지, 독립 완료, 복사, JSON 응답, 중지·재실행, 5,000자 제한, 초기화, 가이드, 390/768/1440px 반응형 배치.
- 브라우저 비교 실행 중 외부 리소스 및 fetch 요청이 없음을 확인했습니다.

## 실제 API 연결 지점

`src/lib/simulator.ts`의 `simulateResponse(modelId, prompt, signal)`이 교체 지점입니다. UI는 `SimulationResult` 계약에 따라 결과를 표시합니다. 서버 어댑터를 추가해 이 함수를 서버 호출로 대체하고, `AbortSignal`을 전달해 중지 동작을 유지하세요. API Key는 프론트엔드에 넣지 않고 서버에서 관리해야 합니다.

실제 연결 시에는 모델 목록, 응답 텍스트, 서버에서 측정한 지연, 제공업체 usage의 Input/Output Token, 요금 계산, 성공·실패 매핑을 구현하고 화면의 Mock 안내도 실제 실행 모드에 맞게 변경하면 됩니다. 현재 UI는 스트리밍 대신 완료된 응답을 받는 방식입니다.

## 작업 분담

- Orca Codex Worker: `src/lib/simulator.ts`, `src/lib/simulator.test.ts` 구현 및 단위 검증.
- Codex 오케스트레이터: 프로젝트 구성, UI/UX, 실행·취소 상태 관리, 통합 검토, 프로덕션 빌드와 브라우저 검증.
