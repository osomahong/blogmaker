import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { useBlogStore } from './useBlogStore';
import { WritingStyleType } from '@/types/blog';

describe('Blog Store - Writing Style', () => {
  beforeEach(() => {
    // Reset store before each test
    useBlogStore.getState().reset();
  });

  /**
   * Feature: writing-style-selector, Property 1: Style selection persistence
   * Validates: Requirements 1.3
   * 
   * For any valid writing style selection, storing it in the Blog Store should result
   * in the context containing that style
   */
  it('should persist selected writing style in the store', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<WritingStyleType>('DEFAULT', 'NAVER_POWER_BLOG'),
        (selectedStyle) => {
          // Get the store instance
          const store = useBlogStore.getState();
          
          // Set the writing style
          store.setContext({ writingStyle: selectedStyle });
          
          // Verify the style is persisted in the context
          const updatedContext = useBlogStore.getState().context;
          expect(updatedContext.writingStyle).toBe(selectedStyle);
        }
      ),
      { numRuns: 100 }
    );
  });
});
