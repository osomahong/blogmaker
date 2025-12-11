'use client';

import { useCallback } from 'react';
import { useBlogStore } from '@/lib/store/useBlogStore';
import { cn } from '@/lib/utils';
import { Check, Loader2, AlertCircle, ShieldCheck } from 'lucide-react';

interface OutlinePanelProps {
    onTextSelection: (
        text: string,
        position: { x: number; y: number } | null,
        context: 'outline' | 'content' | 'subpoint',
        sectionId: number | null,
        subPointIndex?: number
    ) => void;
}

export function OutlinePanel({ onTextSelection }: OutlinePanelProps) {
    const { post } = useBlogStore();

    if (!post.outline.length) {
        return (
            <div className="p-4 text-center text-muted-foreground">
                <p>목차가 생성되면 여기에 표시됩니다.</p>
            </div>
        );
    }

    const getSectionStatus = (sectionId: number) => {
        const section = post.sections.find(s => s.sectionId === sectionId);
        return section?.status || 'pending';
    };

    const isSectionFactCheckModified = (sectionId: number) => {
        const section = post.sections.find(s => s.sectionId === sectionId);
        return section?.factCheckModified || false;
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed':
                return <Check className="h-4 w-4 text-green-500" />;
            case 'generating':
                return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
            case 'error':
                return <AlertCircle className="h-4 w-4 text-red-500" />;
            default:
                return <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />;
        }
    };

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
                
                // Check if selection is in a specific subPoint
                const subPointElement = parentElement?.closest('[data-subpoint-index]');
                if (subPointElement) {
                    const sectionElement = subPointElement.closest('[data-outline-id]');
                    if (sectionElement) {
                        const sectionId = parseInt(sectionElement.getAttribute('data-outline-id') || '0');
                        const subPointIndex = parseInt(subPointElement.getAttribute('data-subpoint-index') || '0');
                        onTextSelection(
                            text,
                            {
                                x: rect.left + rect.width / 2,
                                y: rect.top + window.scrollY,
                            },
                            'subpoint',
                            sectionId,
                            subPointIndex
                        );
                        return;
                    }
                }
                
                // Check if selection is in heading area
                const headingElement = parentElement?.closest('[data-heading]');
                if (headingElement) {
                    const sectionElement = headingElement.closest('[data-outline-id]');
                    if (sectionElement) {
                        const sectionId = parseInt(sectionElement.getAttribute('data-outline-id') || '0');
                        onTextSelection(
                            text,
                            {
                                x: rect.left + rect.width / 2,
                                y: rect.top + window.scrollY,
                            },
                            'outline',
                            sectionId
                        );
                    }
                }
            }
        } else {
            onTextSelection('', null, 'outline', null);
        }
    }, [onTextSelection]);

    return (
        <div className="p-4" onMouseUp={handleMouseUp}>
            <h3 className="font-semibold mb-4 text-lg">{post.title}</h3>
            <div className="space-y-3">
                {post.outline.map((section, index) => {
                    const status = getSectionStatus(section.id);
                    const isFactCheckModified = isSectionFactCheckModified(section.id);
                    return (
                        <div
                            key={section.id}
                            data-outline-id={section.id}
                            className={cn(
                                'p-3 rounded-lg border transition-colors',
                                status === 'generating' && 'border-blue-500 bg-blue-50 dark:bg-blue-950/20',
                                status === 'completed' && 'border-green-500/50 bg-green-50/50 dark:bg-green-950/20',
                                status === 'error' && 'border-red-500 bg-red-50 dark:bg-red-950/20',
                                status === 'pending' && 'border-border'
                            )}
                        >
                            <div className="flex items-center gap-2 mb-1" data-heading>
                                {getStatusIcon(status)}
                                <span className="text-sm font-medium flex-1">
                                    {index + 1}. {section.heading}
                                </span>
                                {isFactCheckModified && (
                                    <div className="flex items-center gap-1 text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full" title="팩트체크로 수정됨">
                                        <ShieldCheck className="h-3 w-3" />
                                        <span>수정됨</span>
                                    </div>
                                )}
                            </div>
                            <ul className="ml-6 text-xs text-muted-foreground space-y-1" data-subpoints>
                                {section.subPoints.map((point, i) => (
                                    <li key={i} data-subpoint-index={i}>• {point}</li>
                                ))}
                            </ul>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
