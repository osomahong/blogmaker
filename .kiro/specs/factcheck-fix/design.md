# Design Document: Factcheck Fix

## Overview

팩트체크 기능의 세 가지 버그를 수정합니다:
1. 수정 제안 버튼이 동작하지 않는 문제
2. 팩트체크로 수정된 섹션을 식별할 수 없는 문제
3. 팝업 박스 디자인 오버플로우 문제

## Architecture

기존 컴포넌트 구조를 유지하면서 버그를 수정합니다:
- `FactCheckDialog.tsx`: 다이얼로그 UI 및 스타일 수정
- `EditorContainer.tsx`: handleApplySuggestion 로직 개선
- `useBlogStore.ts`: 섹션 수정 상태 추적 추가
- `OutlinePanel.tsx` / `ContentEditor.tsx`: 수정 표시 UI 추가

## Components and Interfaces

### 1. Store 변경 (useBlogStore.ts)

```typescript
interface SectionContent {
    sectionId: number;
    content: string;
    status: 'pending' | 'generating' | 'completed' | 'error';
    factCheckModified?: boolean;  // 새로 추가
}

// 새로운 액션 추가
markSectionAsFactCheckModified: (id: number) => void;
```

### 2. EditorContainer 변경

```typescript
// handleApplySuggestion 개선
// - 더 강력한 퍼지 매칭
// - 성공/실패 피드백
// - 섹션 수정 상태 업데이트
```

### 3. FactCheckDialog 스타일 수정

```typescript
// 오버플로우 방지를 위한 CSS 클래스 추가
// - max-width 제한
// - word-break 설정
// - overflow-wrap 설정
```

## Data Models

기존 SectionContent 인터페이스에 `factCheckModified` 필드 추가:

```typescript
interface SectionContent {
    sectionId: number;
    content: string;
    status: 'pending' | 'generating' | 'completed' | 'error';
    factCheckModified?: boolean;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Property 1: Suggestion application updates content
*For any* section containing a claim, when handleApplySuggestion is called with that claim and a suggestion, the section content should be updated to include the refined text.
**Validates: Requirements 1.1**

Property 2: Fuzzy matching finds text with whitespace variations
*For any* claim text and content where the claim exists with different whitespace, the fuzzy matching algorithm should successfully locate and replace the text.
**Validates: Requirements 1.2**

Property 3: Section marked as modified after suggestion applied
*For any* section that has a suggestion applied, the factCheckModified flag should be set to true.
**Validates: Requirements 2.1**

## Error Handling

1. **Claim not found**: 사용자에게 토스트 메시지로 알림
2. **API 실패**: 에러 메시지 표시 및 버튼 상태 복원
3. **빈 응답**: 기본 에러 메시지 표시

## Testing Strategy

### Unit Tests
- handleApplySuggestion 함수의 텍스트 매칭 로직 테스트
- 스토어의 markSectionAsFactCheckModified 액션 테스트

### Property-Based Tests
- fast-check 라이브러리 사용
- 다양한 whitespace 변형에 대한 퍼지 매칭 테스트
- 각 property-based test는 최소 100회 반복 실행
- 테스트에 correctness property 참조 주석 포함: '**Feature: factcheck-fix, Property {number}: {property_text}**'
