'use client';

import { Button } from '@/components/ui/button';

interface SuggestionChipsProps {
    onSelect: (suggestion: string) => void;
}

const suggestions = [
    '잘 모르겠어요',
    '알아서 추천해줘',
    '건너뛰기',
];

export function SuggestionChips({ onSelect }: SuggestionChipsProps) {
    return (
        <div className="px-4 py-2">
            <div className="max-w-2xl mx-auto flex flex-wrap gap-2">
                {suggestions.map((suggestion) => (
                    <Button
                        key={suggestion}
                        variant="outline"
                        size="sm"
                        className="text-xs hover:bg-primary hover:text-primary-foreground transition-colors"
                        onClick={() => onSelect(suggestion)}
                    >
                        {suggestion}
                    </Button>
                ))}
            </div>
        </div>
    );
}
