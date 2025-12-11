# TRD: BlogMakerAgent (Technical Requirements Document)

| 문서 버전 | v1.0 | 작성일 | 2024.05.XX |
| :--- | :--- | :--- | :--- |
| **대상 독자** | Frontend/Backend Developers | **기술 스택** | Next.js 14, Zustand, Vercel AI SDK |

## 1. 시스템 아키텍처 (System Architecture)

### 1.1 High-Level Architecture
서비스는 **Serverless Architecture**를 지향하며, Vercel Edge Functions를 활용해 Streaming Response를 처리합니다.

*   **Client (Frontend):** Next.js App Router. UI 렌더링 및 상태 관리(Zustand).
*   **Server (Backend):** Next.js API Routes (Edge Runtime). LLM 요청 중계 및 프롬프트 주입.
*   **AI Engine:** Google Gemini API (1.5 Flash for Interview, 1.5 Pro for Writing).
*   **State Persistence:** Browser `localStorage` (MVP 기준).

### 1.2 Directory Structure (Recommendation)
```bash
src/
├── app/
│   ├── api/
│   │   ├── chat/               # 인터뷰 챗봇 엔드포인트
│   │   ├── generate/           # 블로그 생성 관련 엔드포인트
│   │   │   ├── outline/
│   │   │   └── section/
│   └── page.tsx                # 메인 UI
├── components/
│   ├── chat/                   # 채팅 관련 컴포넌트
│   ├── editor/                 # 마크다운 에디터/뷰어
├── lib/
│   ├── store/                  # Zustand Store
│   ├── prompts/                # 시스템 프롬프트 관리 (template string)
│   └── utils/                  # 파서, 포맷터
└── types/                      # TypeScript 정의
```

---

## 2. 데이터 모델 및 상태 관리 (Data Model & State)

### 2.1 TypeScript Interfaces (`/src/types/blog.ts`)
개발 시 타입 안정성을 보장하기 위해 아래 인터페이스를 준수합니다.

```typescript
// 1. 인터뷰 상태 관리
export interface InterviewState {
  messages: Message[]; // Vercel AI SDK Message Type
  currentPhase: 'TOPIC' | 'TARGET' | 'DETAIL' | 'FORMAT';
  progress: number; // 0 ~ 100
  isComplete: boolean;
}

// 2. 블로그 컨텍스트 (인터뷰 결과물)
export interface BlogContext {
  topic: string;
  targetAudience: string;
  tone: 'WITTY' | 'PROFESSIONAL' | 'EMOTIONAL';
  keywords: {
    main: string;
    lsi: string[]; // 연관 키워드
  };
  keyExperiences: string[]; // 사용자 경험 데이터
}

// 3. 블로그 구조 및 콘텐츠
export interface BlogPost {
  title: string;
  outline: SectionOutline[];
  sections: SectionContent[];
  isGenerating: boolean;
}

export interface SectionOutline {
  id: number;
  heading: string; // h2
  subPoints: string[]; // h3, bullet points
}

export interface SectionContent {
  sectionId: number;
  content: string; // Markdown text
  status: 'pending' | 'generating' | 'completed' | 'error';
}
```

### 2.2 Global State Store (Zustand)
`useBlogStore`를 생성하여 전체 애플리케이션의 상태를 관리합니다. `persist` 미들웨어를 사용하여 새로고침 시에도 데이터를 유지합니다.

```typescript
// src/lib/store/useBlogStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { BlogContext, BlogPost, InterviewState } from '@/types/blog';

interface StoreState {
  interview: InterviewState;
  context: BlogContext;
  post: BlogPost;
  
  // Actions
  setContext: (data: Partial<BlogContext>) => void;
  updateSectionStatus: (id: number, status: SectionContent['status']) => void;
  appendSectionContent: (id: number, chunk: string) => void; // 스트리밍용
  reset: () => void;
}

export const useBlogStore = create<StoreState>()(
  persist(
    (set) => ({
      // ... initial states and actions
    }),
    { name: 'blog-maker-storage' }
  )
);
```

---

## 3. API 명세 (API Specifications)

### 3.1 인터뷰 진행 API
*   **Endpoint:** `POST /api/chat/interview`
*   **Runtime:** Edge
*   **Description:** 사용자의 답변을 분석하고 다음 질문을 생성하거나, 인터뷰가 완료되었는지 판단.
*   **Request Body:**
    ```json
    {
      "messages": [{"role": "user", "content": "..."}],
      "currentPhase": "TOPIC"
    }
    ```
*   **Logic:**
    1.  시스템 프롬프트에 현재 `Phase` 주입.
    2.  LLM이 `Tool Call` 또는 `Structured Output`을 통해 다음 단계로 넘어갈지(`nextPhase`), 추가 질문을 할지(`question`) 결정.

### 3.2 아웃라인 생성 API
*   **Endpoint:** `POST /api/generate/outline`
*   **Description:** 수집된 `BlogContext`를 기반으로 목차 생성.
*   **Response (JSON):**
    ```json
    {
      "title": "블로그 제목",
      "outline": [
        { "id": 1, "heading": "서론: ...", "subPoints": ["..."] },
        { "id": 2, "heading": "본론1: ...", "subPoints": ["..."] }
      ]
    }
    ```

### 3.3 섹션 생성 API (Recursive Core)
*   **Endpoint:** `POST /api/generate/section`
*   **Runtime:** Edge (Streaming 필수)
*   **Description:** 특정 섹션의 본문을 작성.
*   **Request Body:**
    ```json
    {
      "context": { ...BlogContext },
      "currentSection": { "heading": "...", "subPoints": [...] },
      "previousSectionSummary": "직전 섹션 요약 텍스트..." 
    }
    ```
*   **Output:** `Text Stream` (Markdown)

---

## 4. 핵심 로직 구현 상세 (Core Logic Implementation)

### 4.1 Recursive Writing Algorithm (Client-Side Orchestration)
서버 타임아웃 방지를 위해 클라이언트가 루프를 제어합니다.

```typescript
// 클라이언트 측 로직 예시 (Pseudo-code)

async function generateFullPost(outline: SectionOutline[]) {
  let prevSummary = "Introduction of the topic";
  
  for (const section of outline) {
    // 1. 상태 업데이트: 생성 중 표시
    updateSectionStatus(section.id, 'generating');
    
    // 2. API 호출
    const response = await fetch('/api/generate/section', {
      body: JSON.stringify({
        currentSection: section,
        previousSectionSummary: prevSummary,
        context: get().context
      })
    });

    // 3. 스트리밍 처리 (Reader)
    const reader = response.body.getReader();
    let fullContent = "";
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = new TextDecoder().decode(value);
      fullContent += chunk;
      appendSectionContent(section.id, chunk); // Zustand Store 업데이트
    }

    // 4. 다음 루프를 위한 요약 생성 (Optional: 로컬 LLM 호출 or 간단한 처리)
    // 비용 절감을 위해 전체 텍스트의 마지막 3문장만 다음 컨텍스트로 넘기는 방식 권장
    prevSummary = extractLastParagraph(fullContent); 
    
    updateSectionStatus(section.id, 'completed');
  }
}
```

### 4.2 Prompt Engineering Strategy (Code Level)

**프롬프트 관리 파일 (`src/lib/prompts/writer.ts`)**

```typescript
export const GENERATE_SECTION_SYSTEM = `
You are an expert SEO blog writer.
Tone: {tone}
Target Audience: {targetAudience}

[Constraint]
- Use Markdown format.
- Write naturally, connecting from the previous context.
- Include LSI keywords: {keywords} where appropriate.
- If specific data is missing, suggest a placeholder like [Image: description].
`;

export const GENERATE_SECTION_USER = `
Previous Context Summary: "{previousSummary}"

Current Section Task:
- Heading: {heading}
- Key Points to Cover: {subPoints}

Write the content for this section now.
`;
```

---

## 5. 예외 처리 및 최적화 (Error Handling & Optimization)

### 5.1 재시도 로직 (Retry Logic)
*   **문제:** 섹션 생성 중 네트워크 오류 발생.
*   **해결:** `React Query` 또는 `fetch` 래퍼 함수에 Retry 로직(최대 3회) 적용.
*   **UI:** 특정 섹션 생성 실패 시 해당 섹션 박스에 '다시 시도' 버튼 노출.

### 5.2 토큰 최적화
*   인터뷰 단계의 모든 로그를 저장하되, 생성 단계(`generate/section`)로 넘길 때는 **`BlogContext` JSON 객체만 전송**합니다.
*   Raw Chat History는 전송하지 않아 토큰 비용을 최소화합니다.

### 5.3 Streaming Timeout 대응
*   Vercel Hobby Plan(10초 제한) 등 환경 제약을 고려하여, 각 섹션 생성 요청은 독립적인 HTTP 요청으로 분리되었습니다. (Recursive Logic의 이점)
*   따라서 5,000자 전체 생성이 아닌, 섹션당 500~800자 생성 요청이므로 타임아웃 리스크가 현저히 낮습니다.

---

## 6. 개발 로드맵 (Development Roadmap)

1.  **Phase 1: Setup & Store** (M1)
    *   Next.js 프로젝트 세팅.
    *   Zustand Store 및 Types 정의.
2.  **Phase 2: Interview Module** (M2)
    *   Chat UI 구현.
    *   `/api/chat/interview` 구현 및 프롬프트 테스트.
    *   JSON 추출 로직 검증.
3.  **Phase 3: Generation Engine** (M3)
    *   `/api/generate/outline` 구현.
    *   `/api/generate/section` 구현 (Streaming).
    *   클라이언트 측 Recursive Loop 로직 구현.
4.  **Phase 4: Polish** (M4)
    *   마크다운 스타일링.
    *   복사 기능, 에러 핸들링 UI.