# PRD: BlogMakerAgent (블로그 메이커 에이전트)

| 문서 버전 | v1.0 | 작성일 | 2024.05.XX |
| :--- | :--- | :--- | :--- |
| **작성자** | Senior Product Architect | **상태** | **개발 대기** |

## 1. 프로젝트 개요 (Overview)

### 1.1 제품 목적
사용자(리뷰어, 블로거)와의 **단계별 심층 인터뷰(Adaptive Interview)**를 통해 주제 파악, 경험 추출, SEO 설계를 수행하고, 이를 바탕으로 **최대 5,000자의 고품질 블로그 포스트를 섹션별로 나누어 작성(Recursive Writing)**하는 AI 에이전트 서비스.

---

## 2. 유저 페르소나 및 유저 플로우 (User Flow)

### 2.1 타겟 유저
*   **맛집/여행 리뷰어:** 사진은 많지만 글 쓰기가 귀찮은 유저. 구체적인 경험(맛, 가격, 분위기)을 대화로 풀면 글로 써주길 원함.
*   **테크/정보성 블로거:** 정확한 정보 전달과 전문적인 SEO 구조(목차, 키워드 배치)가 필요한 유저.

### 2.2 User Flow Diagram
```mermaid
graph TD
    A[Landing: 주제 입력] --> B[Phase 1: 주제/목적 구체화]
    B --> C{분기 처리}
    C -- 정보성 --> D[Phase 2: 타겟/검색의도 분석 (Fact 위주)]
    C -- 후기성 --> E[Phase 2: 타겟/검색의도 분석 (Experience 위주)]
    D --> F[Phase 3: 차별화 포인트 수집]
    E --> F
    F --> G[Phase 4: 톤앤매너/구조 확정]
    G --> H[인터뷰 종료 & 데이터 JSON화]
    H --> I[Outline(목차) 생성 및 승인]
    I --> J[Recursive Writing (섹션별 순차 생성)]
    J --> K[Editor View: 마크다운 렌더링 & 수정]
    K --> L[Export: 복사/배포]
```

---

## 3. 상세 기능 명세 (Functional Requirements)

### 3.1 유동적 인터뷰 엔진 (Adaptive Interview Engine)
*   **로직:** 답변 길이나 깊이가 부족하면 꼬리 질문(Follow-up)을 생성하고, 충분하면 다음 단계로 넘어간다.
*   **진행 단계 (Phases):**
    1.  **Topic Discovery:** 무엇을 왜 쓰는지.
    2.  **Targeting:** 누가 읽을 글인지, 어떤 키워드를 노리는지.
    3.  **Detail Mining:** (가장 중요) 사용자의 고유한 경험, 수치, 에피소드 추출.
    4.  **Formatting:** 존댓말로 작성.
*   **UI 기능:**
    *   `건너뛰기`: AI가 임의로 추천 내용을 채움.
    *   `답변 수정`: 이전 답변을 수정하면 이후 질문이 재조정됨.
    *   `Progress Bar`: 현재 단계 시각화 (예: 2/4단계).

### 3.2 구조화된 데이터 요약 (Structured Summarization)
인터뷰가 종료되면 채팅 로그를 그대로 LLM에 던지는 것이 아니라, **정규화된 JSON 포맷**으로 변환하여 저장한다.

*   **데이터 스키마 (Zustand Store 구조):**
```typescript
interface BlogContext {
  topic: string;
  category: 'REVIEW' | 'INFO' | 'COLUMN';
  targetAudience: string;
  mainKeywords: string[]; // SEO 메인 키워드
  lsiKeywords: string[]; // 연관 검색어 (LSI)
  tone: 'WITTY' | 'PROFESSIONAL' | 'EMOTIONAL';
  keyExperiences: string[]; // 사용자가 언급한 핵심 에피소드
  outline: {
    sectionId: number;
    title: string; // h2 태그
    subPoints: string[]; // h3 태그 혹은 핵심 내용
  }[];
}
```

### 3.3 재귀적 글쓰기 파이프라인 (Recursive Writing Pipeline)
5,000자 글을 한 번에 생성하지 않고, **Outline 확정 -> 섹션별 생성 루프**를 돈다.

1.  **Outline 생성:** 수집된 `BlogContext`를 기반으로 목차를 먼저 생성하여 사용자에게 컨펌받는다. (수정 가능)
2.  **Section Loop (반복):**
    *   **Input:** `Global Context` + `직전 섹션 요약` + `현재 섹션 지침`
    *   **Process:** 글 작성 -> 작성된 글 요약(Next Context용) -> 저장.
    *   **Output:** 마크다운 텍스트 스트리밍.

---

## 4. 시스템 아키텍처 (System Architecture)

### 4.1 Tech Stack
*   **Framework:** Next.js 14+ (App Router)
*   **State Management:** Zustand (Client-side global state for Interview Data & Generated Content)
*   **AI:** Vercel AI SDK (`useChat`, `useCompletion`), Google Gemini (1.5 Flash for Interview, 1.5 Pro for Writing)
*   **Styling:** Tailwind CSS, Shadcn/UI
*   **Markdown:** `react-markdown`, `remark-gfm`

### 4.2 Data Flow
1.  **User Input** -> `useChat` (Client) -> `/api/interview` (Server)
2.  **LLM Processing** -> Stream Response (Question) -> User Answer
3.  **Phase Completion** -> Client State(`BlogContext`) 업데이트
4.  **Writing Request** -> `/api/generate-section` (Server) -> Recursive Loop -> `Editor` Component Update

### 4.3 Storage Strategy
*   **MVP:** `localStorage` + `Zustand persist` 사용. 브라우저 종료 후 재방문 시 작업 복구 가능하도록 `sessionId` 기반 저장.
*   **Scale-up:** Supabase (PostgreSQL) 도입하여 유저별 `Drafts` 테이블 관리.

---

## 5. 프롬프트 엔지니어링 전략 (Prompt Engineering) - **핵심**

### 5.1 Interviewer Agent (System Prompt)
```text
Role: You are a professional editor interviewing a writer to gather materials for a blog post.
Goal: Ask 1 question at a time to fill the missing fields in the [JSON Schema].
Logic:
- If the user's answer is too short, ask a specific follow-up question (e.g., "Could you describe the taste in more detail?").
- If the user provides rich information, acknowledge it briefly and move to the next topic.
- Detect the user's intent: If they want to write a 'Review', focus on sensory details. If 'Information', focus on accuracy and facts.
- Output Format: Always end your turn with a specific question.
Current State: [Phase 2: Targeting]
```

### 5.2 Outliner Agent (Structure Generator)
```text
Task: Generate a blog post outline based on the provided user context.
Context: {JSON_DATA_FROM_STEP_3.2}
Requirements:
- Create 5-8 sections (H2).
- Include catchy titles optimized for keywords: {mainKeywords}.
- For each section, list 2-3 bullet points (H3/Details) to cover.
Output Format: JSON Array of objects { title, points[] }.
```

### 5.3 Recursive Writer Agent (The "Chained" Prompt)
이 프롬프트는 각 섹션을 생성할 때마다 호출됩니다.

```text
Role: You are an SEO expert blog writer.
Context:
- Topic: {topic}
- Tone: {tone}
- Keywords to include: {lsiKeywords} (Integrate naturally)

Current Task: Write Section {currentSectionIndex}: "{currentSectionTitle}"
Instructions:
1. Write 500-800 characters for this section.
2. Use Markdown formatting (bold, bullet points).
3. **Context Carrying:** The previous section ended with: "{previousSectionSummary}". Ensure a smooth transition using connecting phrases (e.g., "In addition to...", "Speaking of...").
4. **Media Placeholder:** Insert [Image: Description of visual] where appropriate.
5. **Constraint:** Do NOT repeat information from previous sections.

Input Points to Cover:
{subPoints}
```

---

## 6. UI/UX 요구사항 (Wireframe Logic)

### 6.1 Chat Interface (Interview Mode)
*   **Layout:** 중앙 정렬된 채팅창 (ChatGPT 스타일).
*   **Component:**
    *   `TypingIndicator`: AI 생각 중 표시.
    *   `EditButton`: 사용자의 과거 말풍선 호버 시 수정 아이콘 노출.
    *   `SuggestionChips`: 답변하기 어려운 경우를 대비한 추천 답변 (예: "잘 모르겠어요", "알아서 추천해줘").

### 6.2 Editor Interface (Writing Mode)
*   **Layout:** Split View (좌측: 생성 진행 상황 및 아웃라인 / 우측: 실시간 작성되는 에디터).
*   **Function:**
    *   **Live Streaming:** 글이 작성되는 과정을 실시간 타이핑 효과로 노출.
    *   **Regenerate Section:** 특정 섹션이 마음에 안 들 경우 해당 섹션만 '다시 쓰기' 버튼 제공.
    *   **Copy & Export:** 'HTML 복사', '마크다운 복사', '텍스트만 복사' 옵션 제공.

---

## 7. 예외 처리 및 에러 핸들링 (Error Handling)

### 7.1 토큰 제한 및 비용 관리
*   **상황:** 대화가 너무 길어짐 (20턴 이상).
*   **해결:** 20턴 도달 시 강제로 인터뷰를 종료하고, 현재까지 수집된 정보만으로 작성을 제안하는 모달 띄움.
*   **Input 최적화:** Writer Agent 호출 시 전체 채팅 로그를 보내지 않고, `BlogContext` JSON만 전송하여 토큰 비용 70% 절감.

### 7.2 API Timeout (글 작성 중단)
*   **상황:** 5,000자 생성 중 Vercel Serverless Function Timeout(10초~60초) 발생.
*   **해결 (Recursive 구조의 이점):** 전체 글을 한 번에 요청하지 않음. 섹션 단위로 API를 별도 호출하므로 Timeout 리스크가 적음. 만약 특정 섹션에서 실패하면 해당 섹션만 `Retry` 버튼 활성화.

### 7.3 환각(Hallucination) 및 팩트 체크
*   **상황:** AI가 없는 맛집 메뉴나 틀린 기술 스펙을 작성.
*   **해결:**
    *   프롬프트에 `Strict Mode` 적용: "사용자가 제공한 정보(KeyExperiences) 외의 구체적 사실은 날조하지 말고 '확인 필요'로 표시할 것."
    *   UI 하단에 Disclaimer 배너: "AI가 생성한 글입니다. 정보의 정확성을 확인하세요."