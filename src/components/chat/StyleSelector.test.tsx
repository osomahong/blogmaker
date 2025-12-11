import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import * as fc from 'fast-check';
import { StyleSelector } from './StyleSelector';
import { WRITING_STYLES } from '@/lib/config/writingStyles';
import { WritingStyleType } from '@/types/blog';

describe('StyleSelector Component', () => {
  /**
   * Feature: writing-style-selector, Property 4: Style card rendering
   * Validates: Requirements 4.1
   * 
   * For any writing style in the configuration, the StyleSelector component should render
   * a card with that style's name and description
   */
  it('should render a card with name and description for any style in configuration', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...Object.keys(WRITING_STYLES) as WritingStyleType[]),
        (styleId) => {
          const mockOnStyleSelect = vi.fn();
          const style = WRITING_STYLES[styleId];
          
          const { unmount } = render(<StyleSelector onStyleSelect={mockOnStyleSelect} />);
          
          // Check that the style name is rendered
          const nameElement = screen.getByText(style.name);
          expect(nameElement).toBeInTheDocument();
          
          // Check that the style description is rendered
          const descriptionElement = screen.getByText(style.description);
          expect(descriptionElement).toBeInTheDocument();
          
          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });
});
