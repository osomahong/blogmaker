# Design Document

## Overview

This design addresses a critical bug where AI text refinement operations consume tokens but fail to apply changes to the content. The root cause is that the `handleRefine` function uses state values (`selectedText`, `selectedSectionId`) that can become stale during asynchronous operations, while `handleDirectEdit` and `handleDelete` correctly use refs to preserve values.

## Architecture

The fix involves modifying the `ContentEditor` component to ensure all text editing operations (refine, direct edit, delete) use the same ref-based approach for preserving selected text and section ID references throughout asynchronous operations.

## Components and Interfaces

### ContentEditor Component

**Modified State Management:**
- Existing refs: `selectedTextRef`, `selectedSectionIdRef` (already in use by direct edit and delete)
- These refs will now also be used by the refine operation

**Modified Functions:**
- `handleRefine`: Update to use refs instead of state values for text replacement

## Data Models

No changes to data models are required. The existing structure is sufficient:

```typescript
interface Section {
  sectionId: number;
  content: string;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Refine operation preserves selected text reference

*For any* selected text and section ID at the time of initiating a refine operation, the text replacement should use the exact same text that was selected, regardless of state changes during the async operation.

**Validates: Requirements 1.1, 1.2**

### Property 2: Text replacement consistency across operations

*For any* text editing operation (refine, direct edit, delete), the text matching and replacement logic should follow the same strategy sequence and produce consistent results.

**Validates: Requirements 2.1, 2.2, 2.3**

## Error Handling

- If text matching fails after all strategies, log a warning and leave content unchanged
- If the section is not found, abort the operation silently
- If the API call fails, the error is already handled by the try-catch in `handleRefine`

## Testing Strategy

### Unit Testing

We will write unit tests to verify:
- Text replacement with direct matches
- Text replacement with normalized line breaks
- Text replacement with regex-based whitespace normalization
- Behavior when text is not found in content

### Property-Based Testing

We will use property-based testing to verify:
- **Property 1**: For any selected text and async delay, the refine operation uses the originally selected text
- **Property 2**: For any text with various whitespace patterns, all three operations (refine, direct edit, delete) produce the same matching behavior

**Testing Library:** We will use `@fast-check/vitest` for property-based testing in this TypeScript/React project.

**Configuration:** Each property-based test will run a minimum of 100 iterations to ensure thorough coverage of the input space.

**Tagging:** Each property-based test will include a comment in this format: `// Feature: text-selection-refine-fix, Property {number}: {property_text}`
