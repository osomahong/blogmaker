# Design Document

## Overview

인터뷰 완료 후 블로그 글 생성 전에 사용자가 원하는 글 작성 스타일을 선택할 수 있는 기능을 추가합니다. 초기 버전에서는 "네이버 파워블로그 스타일" 하나만 제공하며, 향후 확장을 위한 구조를 설계합니다.

## Architecture

### Flow
```
Interview Complete → Style Selection Screen → Outline Generation → Editor
```

### Key Components
1. **StyleSelector Component**: 스타일 선택 UI
2. **WritingStyle Type & Config**: 스타일 정의 및 설정
3. **Blog Store Extension**: 선택된 스타일 저장
4. **Writer Prompt Modifier**: 스타일별 프롬프트 적용

## Components and Interfaces

### 1. Type Definitions (src/types/blog.ts)

```typescript
// 글 작성 스타일 타입
export type WritingStyleType = 'DEFAULT' | 'NAVER_POWER_BLOG';

// 스타일 설정 인터페이스
export interface WritingStyleConfig {
  id: WritingStyleType;
  name: string;
  description: string;
  promptModifier: string; // 프롬프트에 추가될 스타일 지시사항
}

// BlogContext에 writingStyle 추가
export interface BlogContext {
  // ... existing fields
  writingStyle?: WritingStyleType;
}
```

### 2. Style Configuration (src/lib/config/writingStyles.ts)

```typescript
export const WRITING_STYLES: Record<WritingStyleType, WritingStyleConfig> = {
  DEFAULT: {
    id: 'DEFAULT',
    name: '기본 스타일',
    description: '현재 설정된 톤으로 작성',
    promptModifier: '',
  },
  NAVER_POWER_BLOG: {
    id: 'NAVER_POWER_BLOG',
    name: '네이버 파워블로그 스타일',
    description: '친근하고 생생한 일상 블로그 스타일',
    promptModifier: `
[네이버 파워블로그 스타일 적용]
- 초반: 일상 고민으로 시작 → 제품/주제 발견 → 사용/경험 후기 순서
- 문장: 짧고 끊어치기. 2-3줄 한 문단
- 어투: "~더라고요", "~네요", "~한 것 같아요" 혼용. 친구한테 말하듯
- 표현: "여러분도 그러시죠?", "진짜 대박", "완전 강추", "내돈내산", "꿀템", "가성비", "혜자"
- 구어체: "아 진짜", "와...", "이거 뭐야", "대체 왜"
- 구성: 고민 → "그러다 발견한게" → 첫인상 → 써보니 → 솔직 단점 1개 → 그래도 만족 → 재구매각
- 금지: 광고 티, 딱딱한 말투, 3줄 넘는 문단
`,
  },
};
```

### 3. StyleSelector Component (src/components/chat/StyleSelector.tsx)

간결한 카드 기반 UI:
- 스타일 카드 (이름, 설명)
- 선택 버튼
- 건너뛰기 옵션

### 4. Store Update (src/lib/store/useBlogStore.ts)

```typescript
// BlogContext에 writingStyle 필드 추가
const initialBlogContext: BlogContext = {
  // ... existing fields
  writingStyle: 'DEFAULT',
};
```

### 5. Prompt Modifier (src/lib/prompts/writer.ts)

```typescript
export const getWriterSystemPrompt = (
  context: BlogContext,
  currentSection: SectionOutline,
  previousSummary: string
): string => {
  const basePrompt = `...기존 프롬프트...`;
  
  // 스타일 적용
  const styleConfig = WRITING_STYLES[context.writingStyle || 'DEFAULT'];
  const stylePrompt = styleConfig.promptModifier;
  
  return `${basePrompt}\n\n${stylePrompt}`;
};
```

## Data Models

### State Flow
```
1. Interview Complete
2. Show StyleSelector
3. User selects style → setContext({ writingStyle: 'NAVER_POWER_BLOG' })
4. Proceed to outline generation with style applied
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Acceptance Criteria Testing Prework

1.1 WHEN the interview is complete THEN the system SHALL display a style selection interface before proceeding to the editor
Thoughts: This is about UI flow - when interview completes, we need to show the style selector before the editor. We can test this by checking the component rendering state.
Testable: yes - example

1.2 WHEN the style selection interface is displayed THEN the system SHALL show at least one style option ("네이버 파워블로그 스타일")
Thoughts: This is checking that the UI displays the required style option. We can test by rendering the component and checking for the style card.
Testable: yes - example

1.3 WHEN a user selects a writing style THEN the system SHALL store the selected style in the Blog Store
Thoughts: This is about state management - for any selected style, it should be stored in the store. We can test this across different style selections.
Testable: yes - property

1.4 WHEN a user proceeds without selecting a style THEN the system SHALL use the default style (current behavior)
Thoughts: This is testing the default case - when no selection is made, default should be used.
Testable: yes - example

1.5 WHEN the style selection is complete THEN the system SHALL transition to the outline generation phase
Thoughts: This is about UI flow transition. We can test that after selection, the correct phase is triggered.
Testable: yes - example

2.1 WHEN a user selects "네이버 파워블로그 스타일" THEN the system SHALL apply the Naver Power Blog style prompt to all content generation
Thoughts: For any content generation request with this style selected, the prompt should include the style modifier. This is a universal property.
Testable: yes - property

2.2 WHEN generating outlines with Naver Power Blog style THEN the system SHALL create section structures that follow the style's narrative flow
Thoughts: This is about the AI output quality, which is hard to test deterministically.
Testable: no

2.3 WHEN generating section content with Naver Power Blog style THEN the system SHALL use short sentences, conversational tone, and colloquial expressions
Thoughts: This is about AI output quality and style, which is subjective and hard to test programmatically.
Testable: no

2.4 WHEN generating content THEN the system SHALL include style-specific characteristics
Thoughts: This is about AI output quality, not a testable property.
Testable: no

2.5 WHEN no style is selected THEN the system SHALL use the existing default writing behavior
Thoughts: This is testing that when writingStyle is undefined or DEFAULT, the system works as before.
Testable: yes - example

3.1 WHEN defining writing styles THEN the system SHALL use a centralized style configuration structure
Thoughts: This is about code organization, not a functional requirement.
Testable: no

3.2 WHEN adding a new style THEN the system SHALL require only adding a new style definition without modifying core logic
Thoughts: This is about code architecture and extensibility, not a testable property.
Testable: no

3.3 WHEN a style is defined THEN the system SHALL include style metadata (name, description, prompt modifiers)
Thoughts: For any style in the configuration, it should have required fields. We can test this across all defined styles.
Testable: yes - property

3.4 WHEN generating content THEN the system SHALL dynamically apply the selected style's prompt modifiers
Thoughts: For any selected style, the prompt should include that style's modifier. This is universal.
Testable: yes - property

3.5 WHEN no custom style is selected THEN the system SHALL fall back to default prompts without errors
Thoughts: This is testing error handling for the default case.
Testable: yes - example

4.1 WHEN the style selector is displayed THEN the system SHALL show each style as a clickable card with name and description
Thoughts: This is about UI rendering. We can test that each style config results in a rendered card.
Testable: yes - property

4.2 WHEN a user hovers over a style card THEN the system SHALL provide visual feedback
Thoughts: This is about CSS hover states, which is hard to test programmatically.
Testable: no

4.3 WHEN a user clicks a style card THEN the system SHALL highlight the selected style
Thoughts: This is about UI state - clicking should update selected state.
Testable: yes - example

4.4 WHEN a user confirms the selection THEN the system SHALL proceed to outline generation
Thoughts: This is about the flow after confirmation.
Testable: yes - example

4.5 WHEN the style selector is displayed THEN the system SHALL provide a skip option to use default style
Thoughts: This is checking that the skip button exists and works.
Testable: yes - example

5.1 WHEN content is being generated THEN the system SHALL use the selected style's prompt configuration
Thoughts: For any content generation with a selected style, the prompt should match that style's config.
Testable: yes - property

5.2 WHEN outline is generated THEN the system SHALL reflect the style's structural preferences
Thoughts: This is about AI output quality, hard to test.
Testable: no

5.3 WHEN sections are generated THEN the system SHALL maintain consistent style throughout all sections
Thoughts: This is about AI consistency, hard to test programmatically.
Testable: no

5.4 WHEN a user views generated content THEN the system SHALL display content that matches the selected style characteristics
Thoughts: This is about AI output quality and user perception.
Testable: no

5.5 WHEN debugging THEN the system SHALL log which style is being applied to content generation
Thoughts: This is about logging behavior. We can test that logs include style information.
Testable: yes - example

### Property Reflection

After reviewing all testable properties:
- Properties 1.3 and 3.4 both test that selected styles are applied - these can be combined
- Properties 2.1 and 5.1 both test that prompts include style modifiers - these are redundant
- Property 4.1 tests that all styles render as cards - this is comprehensive

Consolidated properties:
- Style selection storage (1.3)
- Prompt modifier application (2.1 + 5.1 combined)
- Style configuration completeness (3.3)
- Style card rendering (4.1)

### Correctness Properties

Property 1: Style selection persistence
*For any* valid writing style selection, storing it in the Blog Store should result in the context containing that style
**Validates: Requirements 1.3**

Property 2: Prompt modifier application
*For any* selected writing style, the generated writer prompt should include that style's prompt modifier text
**Validates: Requirements 2.1, 5.1**

Property 3: Style configuration completeness
*For any* defined writing style in the configuration, it should have all required fields (id, name, description, promptModifier)
**Validates: Requirements 3.3**

Property 4: Style card rendering
*For any* writing style in the configuration, the StyleSelector component should render a card with that style's name and description
**Validates: Requirements 4.1**

## Error Handling

- 스타일 미선택 시 DEFAULT 사용
- 잘못된 스타일 ID는 DEFAULT로 fallback
- 프롬프트 생성 실패 시 기본 프롬프트 사용

## Testing Strategy

### Unit Tests
- StyleSelector 컴포넌트 렌더링
- 스타일 선택 시 store 업데이트
- 프롬프트에 스타일 modifier 포함 확인

### Property-Based Tests
- Property 1-4를 fast-check 라이브러리로 구현
- 최소 100회 반복 테스트
- 각 테스트는 design document의 property 번호를 주석으로 명시
