'use client';

export function TypingIndicator() {
    return (
        <div className="flex items-center gap-1 px-4 py-2">
            <div className="flex gap-1">
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce" />
            </div>
            <span className="text-sm text-muted-foreground ml-2">AI가 생각 중...</span>
        </div>
    );
}
