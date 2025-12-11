'use client';

import { useCallback, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useBlogStore } from '@/lib/store/useBlogStore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ShieldCheck } from 'lucide-react';

interface ContentEditorProps {
    alignment?: 'left' | 'center' | 'right';
    onSaveToHistory?: () => void;
    onTextSelection: (
        text: string,
        position: { x: number; y: number } | null,
        context: 'outline' | 'content' | 'subpoint',
        sectionId: number | null,
        subPointIndex?: number
    ) => void;
}

export function ContentEditor({ alignment = 'left', onTextSelection }: ContentEditorProps) {
    const { post } = useBlogStore();
    const contentRef = useRef<HTMLDivElement>(null);

    // Handle text selection
    const handleMouseUp = useCallback(() => {
        const selection = window.getSelection();
        const text = selection?.toString().trim();

        if (text && text.length > 0) {
            const range = selection?.getRangeAt(0);
            const rect = range?.getBoundingClientRect();

            if (rect) {
                // Find which section this text belongs to
                const startNode = range?.startContainer;
                const parentElement = startNode?.nodeType === Node.TEXT_NODE 
                    ? startNode.parentElement 
                    : startNode as HTMLElement;
                const sectionElement = parentElement?.closest('[data-section-id]');
                
                if (sectionElement) {
                    const sectionId = parseInt(sectionElement.getAttribute('data-section-id') || '0');
                    onTextSelection(
                        text,
                        {
                            x: rect.left + rect.width / 2,
                            y: rect.top + window.scrollY,
                        },
                        'content',
                        sectionId
                    );
                }
            }
        } else {
            onTextSelection('', null, 'content', null);
        }
    }, [onTextSelection]);

    // Combine all sections into full content
    const fullContent = post.sections
        .filter(s => s.content)
        .map((section, index) => {
            const outline = post.outline.find(o => o.id === section.sectionId);
            const heading = outline?.heading || `섹션 ${index + 1}`;
            return `## ${heading}\n\n${section.content}`;
        })
        .join('\n\n---\n\n');

    const alignmentClass = {
        left: 'text-left',
        center: 'text-center',
        right: 'text-right',
    }[alignment];

    if (!fullContent) {
        return (
            <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                    <p className="text-lg mb-2">📝</p>
                    <p>글이 생성되면 여기에 표시됩니다.</p>
                </div>
            </div>
        );
    }

    return (
        <ScrollArea className="h-full">
            <div 
                ref={contentRef}
                className={`p-6 max-w-none ${alignmentClass}`}
                onMouseUp={handleMouseUp}
            >
                {post.title && (
                    <h1 className="text-3xl font-bold mb-6 pb-4 border-b">
                        {post.title}
                    </h1>
                )}
                
                {/* Render sections individually with data attributes */}
                {post.sections.filter(s => s.content).map((section) => {
                    const outline = post.outline.find(o => o.id === section.sectionId);
                    const heading = outline?.heading || `섹션`;
                    const isFactCheckModified = section.factCheckModified || false;
                    
                    return (
                        <article 
                            key={section.sectionId}
                            data-section-id={section.sectionId}
                            className="prose prose-neutral dark:prose-invert max-w-none mb-8"
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <h2 className="!mb-0">{heading}</h2>
                                {isFactCheckModified && (
                                    <div className="flex items-center gap-1 text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full not-prose" title="팩트체크로 수정됨">
                                        <ShieldCheck className="h-3 w-3" />
                                        <span>팩트체크 수정됨</span>
                                    </div>
                                )}
                            </div>
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {section.content}
                            </ReactMarkdown>
                        </article>
                    );
                })}
            </div>
        </ScrollArea>
    );
}
