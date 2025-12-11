# Requirements Document

## Introduction

팩트체크 기능의 버그 수정을 위한 요구사항 문서입니다. 현재 팩트체크 다이얼로그에서 수정 제안 버튼이 동작하지 않고, 수정된 섹션을 식별할 수 없으며, 팝업 박스의 디자인 문제가 있습니다.

## Glossary

- **FactCheckDialog**: 팩트체크 결과를 표시하고 수정 제안을 반영할 수 있는 다이얼로그 컴포넌트
- **수정 제안 반영**: 팩트체크에서 발견된 문제점에 대한 AI 제안을 실제 콘텐츠에 적용하는 기능
- **섹션(Section)**: 블로그 글의 개별 단락/챕터
- **claim**: 팩트체크에서 검증이 필요한 원문 내용

## Requirements

### Requirement 1

**User Story:** As a user, I want the "수정 제안 반영하기" button to work correctly, so that I can apply fact-check suggestions to my content.

#### Acceptance Criteria

1. WHEN a user clicks the "수정 제안 반영하기" button THEN the system SHALL apply the suggestion to the corresponding section content
2. WHEN the claim text cannot be found exactly in the content THEN the system SHALL use fuzzy matching to locate and replace the text
3. WHEN the suggestion is successfully applied THEN the system SHALL provide visual feedback to the user
4. IF the suggestion cannot be applied THEN the system SHALL display an error message to the user

### Requirement 2

**User Story:** As a user, I want to see which sections have been modified by fact-check suggestions, so that I can track changes made to my content.

#### Acceptance Criteria

1. WHEN a fact-check suggestion is applied to a section THEN the system SHALL mark that section as modified by fact-check
2. WHEN viewing the outline panel THEN the system SHALL display a visual indicator on sections modified by fact-check
3. WHEN viewing the content editor THEN the system SHALL display a visual indicator on sections modified by fact-check

### Requirement 3

**User Story:** As a user, I want the fact-check dialog content to be properly contained within the popup box, so that I can read all information without layout issues.

#### Acceptance Criteria

1. WHEN displaying fact-check issues THEN the system SHALL contain all content within the dialog boundaries
2. WHEN the content is long THEN the system SHALL provide proper scrolling within the dialog
3. WHEN displaying claim text, issue description, or suggestion THEN the system SHALL wrap text properly without overflow
4. WHEN the dialog is displayed THEN the system SHALL maintain consistent spacing and padding
