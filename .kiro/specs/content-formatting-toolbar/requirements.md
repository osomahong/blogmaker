# Requirements Document

## Introduction

This feature adds content formatting controls to the blog editor interface. The formatting toolbar will be positioned in the header area next to the "인터뷰로 돌아가기" (Back to Interview) button, providing users with quick access to text alignment and line break formatting options. The feature aims to enhance the content editing experience by allowing users to apply common formatting styles, particularly the casual line-break style popular in Korean vlog content.

## Glossary

- **Editor Container**: The main container component that displays the blog editor interface with header, outline panel, and content editor
- **Content Editor**: The component that displays and allows editing of the generated blog post content
- **Formatting Toolbar**: A set of buttons in the header area that control text formatting options
- **Text Alignment**: The horizontal positioning of text content (left, center, or right)
- **Vlog-style Line Breaks**: A formatting pattern common in Korean vlogs where sentences are broken into shorter, more casual lines for easier reading
- **Blog Store**: The Zustand state management store that maintains the blog post content and metadata

## Requirements

### Requirement 1

**User Story:** As a blog editor user, I want to access formatting controls in the header area, so that I can quickly apply formatting to my content without cluttering the editing space.

#### Acceptance Criteria

1. WHEN the editor container renders THEN the system SHALL display formatting buttons in the header area to the right of the "인터뷰로 돌아가기" button
2. WHEN no content exists THEN the system SHALL disable the formatting buttons
3. WHEN content is being generated THEN the system SHALL disable the formatting buttons
4. WHEN content exists and is not being generated THEN the system SHALL enable the formatting buttons

### Requirement 2

**User Story:** As a blog editor user, I want to align my content to the left, center, or right, so that I can control the visual presentation of my blog post.

#### Acceptance Criteria

1. WHEN a user clicks the left align button THEN the system SHALL apply left alignment to all content sections
2. WHEN a user clicks the center align button THEN the system SHALL apply center alignment to all content sections
3. WHEN a user clicks the right align button THEN the system SHALL apply right alignment to all content sections
4. WHEN an alignment is applied THEN the system SHALL persist the alignment setting in the blog store
5. WHEN the editor re-renders THEN the system SHALL maintain the previously selected alignment

### Requirement 3

**User Story:** As a blog editor user, I want to apply vlog-style line breaks to my content, so that I can create a more casual and readable format popular in Korean vlog content.

#### Acceptance Criteria

1. WHEN a user clicks the vlog line break button THEN the system SHALL transform the content by breaking long sentences into shorter lines
2. WHEN applying vlog line breaks THEN the system SHALL preserve the semantic meaning of the original content
3. WHEN applying vlog line breaks THEN the system SHALL break sentences at natural pause points such as commas, conjunctions, and clause boundaries
4. WHEN vlog line breaks are applied THEN the system SHALL update all section content in the blog store
5. WHEN the transformation completes THEN the system SHALL display the reformatted content immediately

### Requirement 4

**User Story:** As a blog editor user, I want visual feedback on which formatting options are active, so that I can understand the current state of my content formatting.

#### Acceptance Criteria

1. WHEN an alignment option is selected THEN the system SHALL highlight the corresponding alignment button
2. WHEN no alignment is explicitly set THEN the system SHALL highlight the left align button as the default
3. WHEN the vlog line break transformation is in progress THEN the system SHALL display a loading indicator on the button
4. WHEN the vlog line break transformation completes THEN the system SHALL remove the loading indicator
