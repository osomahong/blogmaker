# Implementation Plan

- [x] 1. 타입 정의 및 스타일 설정 추가
  - src/types/blog.ts에 WritingStyleType, WritingStyleConfig 타입 추가
  - src/lib/config/writingStyles.ts 생성하여 WRITING_STYLES 설정 정의
  - BlogContext에 writingStyle 필드 추가
  - _Requirements: 1.3, 3.3, 3.4_

- [x] 1.1 Write property test for style configuration completeness
  - **Property 3: Style configuration completeness**
  - **Validates: Requirements 3.3**

- [x] 2. Store 업데이트
  - useBlogStore의 initialBlogContext에 writingStyle: 'DEFAULT' 추가
  - 기존 setContext 액션으로 writingStyle 업데이트 가능 (수정 불필요)
  - _Requirements: 1.3_

- [x] 2.1 Write property test for style selection persistence
  - **Property 1: Style selection persistence**
  - **Validates: Requirements 1.3**

- [x] 3. StyleSelector 컴포넌트 구현
  - src/components/chat/StyleSelector.tsx 생성
  - 스타일 카드 UI (이름, 설명, 선택 버튼)
  - 선택된 스타일 하이라이트
  - 건너뛰기 버튼 (DEFAULT 사용)
  - onStyleSelect 콜백으로 선택 전달
  - _Requirements: 1.2, 4.1, 4.3, 4.5_

- [x] 3.1 Write property test for style card rendering
  - **Property 4: Style card rendering**
  - **Validates: Requirements 4.1**

- [x] 4. 인터뷰 완료 후 스타일 선택 플로우 추가
  - page.tsx에 'style-selection' ViewMode 추가
  - ChatContainer의 인터뷰 완료 시 스타일 선택 화면으로 전환
  - StyleSelector에서 스타일 선택 후 에디터로 이동
  - _Requirements: 1.1, 1.5_

- [x] 5. Writer 프롬프트에 스타일 적용
  - src/lib/prompts/writer.ts의 getWriterSystemPrompt 수정
  - context.writingStyle에 따라 WRITING_STYLES에서 promptModifier 가져오기
  - 기본 프롬프트에 스타일 modifier 추가
  - getOutlinerSystemPrompt에도 동일하게 적용
  - _Requirements: 2.1, 3.4, 5.1_

- [x] 5.1 Write property test for prompt modifier application
  - **Property 2: Prompt modifier application**
  - **Validates: Requirements 2.1, 5.1**

- [x] 6. 기본 동작 보장 및 에러 처리
  - writingStyle이 undefined일 때 DEFAULT 사용
  - 잘못된 스타일 ID는 DEFAULT로 fallback
  - 콘솔 로그로 적용된 스타일 출력
  - _Requirements: 2.5, 3.5, 5.5_

- [x] 6.1 Write unit tests for error handling
  - Test undefined writingStyle defaults to DEFAULT
  - Test invalid style ID falls back to DEFAULT
  - Test style logging in console
  - _Requirements: 2.5, 3.5, 5.5_

- [x] 7. Checkpoint - 모든 테스트 통과 확인
  - Ensure all tests pass, ask the user if questions arise.
