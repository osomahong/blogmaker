# Requirements Document

## Introduction

This document specifies the requirements for fixing a bug in the text selection and AI refinement feature. Currently, when users select text and request AI refinement, the API call succeeds and consumes tokens, but the refined text is not applied to the content. This occurs because the selected text reference becomes stale during the asynchronous refinement operation.

## Glossary

- **ContentEditor**: The React component that displays blog post content and handles text selection
- **TextSelectionToolbar**: The floating toolbar that appears when text is selected
- **Refine Operation**: The asynchronous AI operation that modifies selected text based on user instructions
- **Selected Text Reference**: The text that was selected by the user at the time of initiating a refine operation
- **Section Content**: The markdown content of a specific blog post section

## Requirements

### Requirement 1

**User Story:** As a user, I want my AI text refinements to be applied to the content, so that I can see the changes I requested.

#### Acceptance Criteria

1. WHEN a user selects text and requests AI refinement THEN the system SHALL preserve the exact selected text reference throughout the asynchronous operation
2. WHEN the AI refinement completes THEN the system SHALL replace the originally selected text with the refined text in the section content
3. WHEN the text replacement occurs THEN the system SHALL update the displayed content to show the refined text
4. WHEN the selected text contains line breaks or special characters THEN the system SHALL correctly match and replace the text in the section content
5. WHEN multiple refinement strategies are attempted THEN the system SHALL use the same matching logic as the direct edit and delete operations

### Requirement 2

**User Story:** As a developer, I want consistent text replacement logic across all editing operations, so that the system behaves predictably.

#### Acceptance Criteria

1. WHEN any text editing operation occurs (refine, direct edit, or delete) THEN the system SHALL use refs to preserve the selected text reference
2. WHEN text matching is performed THEN the system SHALL attempt multiple matching strategies in order: direct match, normalized line breaks, and regex-based whitespace normalization
3. WHEN a matching strategy succeeds THEN the system SHALL apply the replacement and skip remaining strategies
4. WHEN all matching strategies fail THEN the system SHALL log an error and leave the content unchanged
