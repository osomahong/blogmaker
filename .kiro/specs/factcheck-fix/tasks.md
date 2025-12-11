# Implementation Plan

- [ ] 1. Store에 factCheckModified 상태 추가
  - [x] 1.1 SectionContent 타입에 factCheckModified 필드 추가
    - `src/types/blog.ts` 수정
    - _Requirements: 2.1_
  - [x] 1.2 markSectionAsFactCheckModified 액션 추가
    - `src/lib/store/useBlogStore.ts` 수정
    - _Requirements: 2.1_

- [ ] 2. handleApplySuggestion 로직 개선
  - [x] 2.1 퍼지 매칭 알고리즘 강화
    - 정규화된 텍스트 비교 개선
    - 부분 매칭 지원 추가
    - _Requirements: 1.1, 1.2_
  - [x] 2.2 성공/실패 피드백 추가
    - 성공 시 섹션 수정 상태 업데이트
    - 실패 시 에러 메시지 표시
    - _Requirements: 1.3, 1.4_
  - [x] 2.3 Write property test for fuzzy matching
    - **Property 2: Fuzzy matching finds text with whitespace variations**
    - **Validates: Requirements 1.2**

- [ ] 3. 수정된 섹션 시각적 표시 추가
  - [x] 3.1 OutlinePanel에 팩트체크 수정 표시 추가
    - 수정된 섹션에 아이콘/배지 표시
    - _Requirements: 2.2_
  - [x] 3.2 ContentEditor에 팩트체크 수정 표시 추가
    - 수정된 섹션 헤더에 표시 추가
    - _Requirements: 2.3_

- [ ] 4. FactCheckDialog 스타일 수정
  - [x] 4.1 오버플로우 방지 CSS 적용
    - DialogContent max-width 조정
    - 텍스트 영역에 word-break, overflow-wrap 적용
    - _Requirements: 3.1, 3.3_
  - [x] 4.2 스크롤 영역 개선
    - ScrollArea 높이 조정
    - 내부 컨텐츠 패딩 정리
    - _Requirements: 3.2, 3.4_

- [x] 5. Checkpoint - 모든 기능 테스트
  - Ensure all tests pass, ask the user if questions arise.
