import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { WRITING_STYLES } from './writingStyles';
import { WritingStyleType } from '@/types/blog';

describe('Writing Styles Configuration', () => {
  /**
   * Feature: writing-style-selector, Property 3: Style configuration completeness
   * Validates: Requirements 3.3
   * 
   * For any defined writing style in the configuration, it should have all required fields
   * (id, name, description, promptModifier)
   */
  it('should have complete configuration for all defined styles', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...Object.keys(WRITING_STYLES) as WritingStyleType[]),
        (styleId) => {
          const config = WRITING_STYLES[styleId];
          
          // Check that all required fields exist
          expect(config).toBeDefined();
          expect(config.id).toBe(styleId);
          expect(typeof config.name).toBe('string');
          expect(config.name.length).toBeGreaterThan(0);
          expect(typeof config.description).toBe('string');
          expect(config.description.length).toBeGreaterThan(0);
          expect(typeof config.promptModifier).toBe('string');
          // promptModifier can be empty string for DEFAULT style
        }
      ),
      { numRuns: 100 }
    );
  });
});
