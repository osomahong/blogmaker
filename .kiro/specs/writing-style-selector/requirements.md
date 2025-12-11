# Requirements Document

## Introduction

이 기능은 사용자가 인터뷰를 완료한 후 블로그 글 생성 전에 원하는 글 작성 스타일을 선택할 수 있도록 합니다. 초기 버전에서는 "네이버 파워블로그 스타일" 하나만 제공하며, 향후 다양한 스타일을 추가할 수 있는 확장 가능한 구조로 설계됩니다.

## Glossary

- **Writing Style**: 블로그 글의 어투, 문장 구조, 표현 방식 등을 정의하는 작성 스타일
- **Style Selector**: 인터뷰 완료 후 글 생성 전에 표시되는 스타일 선택 UI
- **Naver Power Blog Style**: 네이버 파워블로그의 특징적인 친근하고 생생한 글쓰기 스타일
- **Writer System Prompt**: AI가 글을 생성할 때 사용하는 시스템 프롬프트
- **Blog Store**: 블로그 생성 과정의 상태를 관리하는 Zustand 스토어
- **Interview Phase**: 인터뷰 진행 단계 (TOPIC, TARGET, DETAIL, FORMAT)

## Requirements

### Requirement 1

**User Story:** 사용자로서, 인터뷰 완료 후 글 작성 스타일을 선택하고 싶습니다. 그래야 내가 원하는 톤과 스타일로 블로그 글이 생성됩니다.

#### Acceptance Criteria

1. WHEN the interview is complete THEN the system SHALL display a style selection interface before proceeding to the editor
2. WHEN the style selection interface is displayed THEN the system SHALL show at least one style option ("네이버 파워블로그 스타일")
3. WHEN a user selects a writing style THEN the system SHALL store the selected style in the Blog Store
4. WHEN a user proceeds without selecting a style THEN the system SHALL use the default style (current behavior)
5. WHEN the style selection is complete THEN the system SHALL transition to the outline generation phase

### Requirement 2

**User Story:** 사용자로서, 네이버 파워블로그 스타일을 선택하면 그 스타일의 특징을 반영한 글이 생성되기를 원합니다. 그래야 실제 파워블로그처럼 친근하고 생생한 글을 얻을 수 있습니다.

#### Acceptance Criteria

1. WHEN a user selects "네이버 파워블로그 스타일" THEN the system SHALL apply the Naver Power Blog style prompt to all content generation
2. WHEN generating outlines with Naver Power Blog style THEN the system SHALL create section structures that follow the style's narrative flow (고민 → 발견 → 사용 → 평가)
3. WHEN generating section content with Naver Power Blog style THEN the system SHALL use short sentences, conversational tone, and colloquial expressions
4. WHEN generating content THEN the system SHALL include style-specific characteristics (친구같은 어투, 짧은 문단, 구어체 표현)
5. WHEN no style is selected THEN the system SHALL use the existing default writing behavior

### Requirement 3

**User Story:** 개발자로서, 향후 다양한 글 스타일을 쉽게 추가할 수 있는 확장 가능한 구조를 원합니다. 그래야 새로운 스타일을 빠르게 추가하고 관리할 수 있습니다.

#### Acceptance Criteria

1. WHEN defining writing styles THEN the system SHALL use a centralized style configuration structure
2. WHEN adding a new style THEN the system SHALL require only adding a new style definition without modifying core logic
3. WHEN a style is defined THEN the system SHALL include style metadata (name, description, prompt modifiers)
4. WHEN generating content THEN the system SHALL dynamically apply the selected style's prompt modifiers
5. WHEN no custom style is selected THEN the system SHALL fall back to default prompts without errors

### Requirement 4

**User Story:** 사용자로서, 스타일 선택 UI가 직관적이고 사용하기 쉽기를 원합니다. 그래야 빠르게 원하는 스타일을 선택하고 글 생성을 시작할 수 있습니다.

#### Acceptance Criteria

1. WHEN the style selector is displayed THEN the system SHALL show each style as a clickable card with name and description
2. WHEN a user hovers over a style card THEN the system SHALL provide visual feedback
3. WHEN a user clicks a style card THEN the system SHALL highlight the selected style
4. WHEN a user confirms the selection THEN the system SHALL proceed to outline generation
5. WHEN the style selector is displayed THEN the system SHALL provide a skip option to use default style

### Requirement 5

**User Story:** 사용자로서, 선택한 스타일이 실제로 글 생성에 반영되는지 확인하고 싶습니다. 그래야 스타일 선택이 제대로 작동하는지 알 수 있습니다.

#### Acceptance Criteria

1. WHEN content is being generated THEN the system SHALL use the selected style's prompt configuration
2. WHEN outline is generated THEN the system SHALL reflect the style's structural preferences
3. WHEN sections are generated THEN the system SHALL maintain consistent style throughout all sections
4. WHEN a user views generated content THEN the system SHALL display content that matches the selected style characteristics
5. WHEN debugging THEN the system SHALL log which style is being applied to content generation
