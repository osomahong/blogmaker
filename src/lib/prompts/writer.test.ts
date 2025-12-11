import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { getWriterSystemPrompt, getOutlinerSystemPrompt } from './writer';
import { WRITING_STYLES } from '@/lib/config/writingStyles';
import { BlogContext, SectionOutline, WritingStyleType } from '@/types/blog';

describe('Writer Prompts with Style Modifiers', () => {
  /**
   * Feature: writing-style-selector, Property 2: Prompt modifier application
   * Validates: Requirements 2.1, 5.1
   * 
   * For any selected writing style, the generated writer prompt should include
   * that style's prompt modifier text
   */
  it('should include style prompt modifier in getWriterSystemPrompt for any selected style', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...Object.keys(WRITING_STYLES) as WritingStyleType[]),
        fc.string({ minLength: 1, maxLength: 50 }), // topic
        fc.string({ minLength: 1, maxLength: 50 }), // targetAudience
        fc.string({ minLength: 1, maxLength: 20 }), // main keyword
        fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 5 }), // lsi keywords
        fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 5 }), // keyExperiences
        fc.constantFrom('WITTY', 'PROFESSIONAL', 'EMOTIONAL'),
        fc.string({ minLength: 1, maxLength: 30 }), // section heading
        fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 3 }), // subPoints
        fc.string({ maxLength: 100 }), // previousSummary
        (styleId, topic, targetAudience, mainKeyword, lsiKeywords, keyExperiences, tone, heading, subPoints, previousSummary) => {
          const context: BlogContext = {
            topic,
            category: 'REVIEW',
            targetAudience,
            keywords: {
              main: mainKeyword,
              lsi: lsiKeywords,
            },
            keyExperiences,
            tone: tone as BlogContext['tone'],
            writingStyle: styleId,
          };

          const currentSection: SectionOutline = {
            id: 1,
            heading,
            subPoints,
          };

          const prompt = getWriterSystemPrompt(context, currentSection, previousSummary);
          const styleConfig = WRITING_STYLES[styleId];

          // If the style has a prompt modifier, it should be included in the prompt
          if (styleConfig.promptModifier) {
            expect(prompt).toContain(styleConfig.promptModifier);
          }

          // The prompt should always be a non-empty string
          expect(typeof prompt).toBe('string');
          expect(prompt.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should include style prompt modifier in getOutlinerSystemPrompt for any selected style', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...Object.keys(WRITING_STYLES) as WritingStyleType[]),
        fc.string({ minLength: 1, maxLength: 50 }), // topic
        fc.string({ minLength: 1, maxLength: 50 }), // targetAudience
        fc.string({ minLength: 1, maxLength: 20 }), // main keyword
        fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 5 }), // lsi keywords
        fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 5 }), // keyExperiences
        fc.constantFrom('WITTY', 'PROFESSIONAL', 'EMOTIONAL'),
        (styleId, topic, targetAudience, mainKeyword, lsiKeywords, keyExperiences, tone) => {
          const context: BlogContext = {
            topic,
            category: 'REVIEW',
            targetAudience,
            keywords: {
              main: mainKeyword,
              lsi: lsiKeywords,
            },
            keyExperiences,
            tone: tone as BlogContext['tone'],
            writingStyle: styleId,
          };

          const prompt = getOutlinerSystemPrompt(context);
          const styleConfig = WRITING_STYLES[styleId];

          // If the style has a prompt modifier, it should be included in the prompt
          if (styleConfig.promptModifier) {
            expect(prompt).toContain(styleConfig.promptModifier);
          }

          // The prompt should always be a non-empty string
          expect(typeof prompt).toBe('string');
          expect(prompt.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});


describe('Error Handling for Writing Styles', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  /**
   * Test undefined writingStyle defaults to DEFAULT
   * Requirements: 2.5, 3.5, 5.5
   */
  it('should default to DEFAULT style when writingStyle is undefined in getWriterSystemPrompt', () => {
    const context: BlogContext = {
      topic: 'Test Topic',
      category: 'REVIEW',
      targetAudience: 'Test Audience',
      keywords: {
        main: 'test',
        lsi: ['keyword1', 'keyword2'],
      },
      keyExperiences: ['experience1'],
      tone: 'PROFESSIONAL',
      // writingStyle is undefined
    };

    const currentSection: SectionOutline = {
      id: 1,
      heading: 'Test Section',
      subPoints: ['Point 1', 'Point 2'],
    };

    const prompt = getWriterSystemPrompt(context, currentSection, '');

    // Should use DEFAULT style (no modifier)
    expect(prompt).not.toContain(WRITING_STYLES.NAVER_POWER_BLOG.promptModifier);
    expect(prompt.length).toBeGreaterThan(0);
    
    // Should log DEFAULT style
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('[Writer] Applying writing style: DEFAULT')
    );
  });

  it('should default to DEFAULT style when writingStyle is undefined in getOutlinerSystemPrompt', () => {
    const context: BlogContext = {
      topic: 'Test Topic',
      category: 'REVIEW',
      targetAudience: 'Test Audience',
      keywords: {
        main: 'test',
        lsi: ['keyword1', 'keyword2'],
      },
      keyExperiences: ['experience1'],
      tone: 'PROFESSIONAL',
      // writingStyle is undefined
    };

    const prompt = getOutlinerSystemPrompt(context);

    // Should use DEFAULT style (no modifier)
    expect(prompt).not.toContain(WRITING_STYLES.NAVER_POWER_BLOG.promptModifier);
    expect(prompt.length).toBeGreaterThan(0);
    
    // Should log DEFAULT style
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('[Outliner] Applying writing style: DEFAULT')
    );
  });

  /**
   * Test invalid style ID falls back to DEFAULT
   * Requirements: 2.5, 3.5, 5.5
   */
  it('should fallback to DEFAULT style when invalid style ID is provided in getWriterSystemPrompt', () => {
    const context: BlogContext = {
      topic: 'Test Topic',
      category: 'REVIEW',
      targetAudience: 'Test Audience',
      keywords: {
        main: 'test',
        lsi: ['keyword1', 'keyword2'],
      },
      keyExperiences: ['experience1'],
      tone: 'PROFESSIONAL',
      writingStyle: 'INVALID_STYLE' as WritingStyleType,
    };

    const currentSection: SectionOutline = {
      id: 1,
      heading: 'Test Section',
      subPoints: ['Point 1', 'Point 2'],
    };

    const prompt = getWriterSystemPrompt(context, currentSection, '');

    // Should fallback to DEFAULT style (no modifier)
    expect(prompt).not.toContain(WRITING_STYLES.NAVER_POWER_BLOG.promptModifier);
    expect(prompt.length).toBeGreaterThan(0);
    
    // Should log DEFAULT style
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('[Writer] Applying writing style: DEFAULT')
    );
  });

  it('should fallback to DEFAULT style when invalid style ID is provided in getOutlinerSystemPrompt', () => {
    const context: BlogContext = {
      topic: 'Test Topic',
      category: 'REVIEW',
      targetAudience: 'Test Audience',
      keywords: {
        main: 'test',
        lsi: ['keyword1', 'keyword2'],
      },
      keyExperiences: ['experience1'],
      tone: 'PROFESSIONAL',
      writingStyle: 'INVALID_STYLE' as WritingStyleType,
    };

    const prompt = getOutlinerSystemPrompt(context);

    // Should fallback to DEFAULT style (no modifier)
    expect(prompt).not.toContain(WRITING_STYLES.NAVER_POWER_BLOG.promptModifier);
    expect(prompt.length).toBeGreaterThan(0);
    
    // Should log DEFAULT style
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('[Outliner] Applying writing style: DEFAULT')
    );
  });

  /**
   * Test style logging in console
   * Requirements: 2.5, 3.5, 5.5
   */
  it('should log the applied style to console in getWriterSystemPrompt', () => {
    const context: BlogContext = {
      topic: 'Test Topic',
      category: 'REVIEW',
      targetAudience: 'Test Audience',
      keywords: {
        main: 'test',
        lsi: ['keyword1', 'keyword2'],
      },
      keyExperiences: ['experience1'],
      tone: 'PROFESSIONAL',
      writingStyle: 'NAVER_POWER_BLOG',
    };

    const currentSection: SectionOutline = {
      id: 1,
      heading: 'Test Section',
      subPoints: ['Point 1', 'Point 2'],
    };

    getWriterSystemPrompt(context, currentSection, '');

    expect(consoleLogSpy).toHaveBeenCalledWith(
      '[Writer] Applying writing style: NAVER_POWER_BLOG (네이버 파워블로그 스타일)'
    );
  });

  it('should log the applied style to console in getOutlinerSystemPrompt', () => {
    const context: BlogContext = {
      topic: 'Test Topic',
      category: 'REVIEW',
      targetAudience: 'Test Audience',
      keywords: {
        main: 'test',
        lsi: ['keyword1', 'keyword2'],
      },
      keyExperiences: ['experience1'],
      tone: 'PROFESSIONAL',
      writingStyle: 'NAVER_POWER_BLOG',
    };

    getOutlinerSystemPrompt(context);

    expect(consoleLogSpy).toHaveBeenCalledWith(
      '[Outliner] Applying writing style: NAVER_POWER_BLOG (네이버 파워블로그 스타일)'
    );
  });

  it('should log DEFAULT style when writingStyle is explicitly set to DEFAULT', () => {
    const context: BlogContext = {
      topic: 'Test Topic',
      category: 'REVIEW',
      targetAudience: 'Test Audience',
      keywords: {
        main: 'test',
        lsi: ['keyword1', 'keyword2'],
      },
      keyExperiences: ['experience1'],
      tone: 'PROFESSIONAL',
      writingStyle: 'DEFAULT',
    };

    const currentSection: SectionOutline = {
      id: 1,
      heading: 'Test Section',
      subPoints: ['Point 1', 'Point 2'],
    };

    getWriterSystemPrompt(context, currentSection, '');

    expect(consoleLogSpy).toHaveBeenCalledWith(
      '[Writer] Applying writing style: DEFAULT (기본 스타일)'
    );
  });
});
