'use client';

import { Button } from '@/components/ui/button';
import { useBlogStore } from '@/lib/store/useBlogStore';
import { Copy, FileText, Code, Check } from 'lucide-react';
import { useState } from 'react';

export function ExportButtons() {
    const { post } = useBlogStore();
    const [copied, setCopied] = useState<string | null>(null);

    const stripMarkdown = (text: string): string => {
        return text
            // Remove headers (# ## ### etc)
            .replace(/^#{1,6}\s+/gm, '')
            // Remove bold (**text** or __text__)
            .replace(/(\*\*|__)(.*?)\1/g, '$2')
            // Remove italic (*text* or _text_)
            .replace(/(\*|_)(.*?)\1/g, '$2')
            // Remove strikethrough (~~text~~)
            .replace(/~~(.*?)~~/g, '$1')
            // Remove inline code (`code`)
            .replace(/`([^`]+)`/g, '$1')
            // Remove code blocks (```code```)
            .replace(/```[\s\S]*?```/g, '')
            // Remove links [text](url)
            .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
            // Remove images ![alt](url)
            .replace(/!\[([^\]]*)\]\([^\)]+\)/g, '$1')
            // Remove horizontal rules (---, ***, ___)
            .replace(/^(\*{3,}|-{3,}|_{3,})$/gm, '')
            // Remove blockquotes (> text)
            .replace(/^>\s+/gm, '')
            // Remove list markers (-, *, +, 1.)
            .replace(/^[\s]*[-*+]\s+/gm, '')
            .replace(/^[\s]*\d+\.\s+/gm, '')
            // Remove extra blank lines (more than 2 consecutive newlines)
            .replace(/\n{3,}/g, '\n\n')
            // Trim whitespace
            .trim();
    };

    const getFullContent = (format: 'markdown' | 'html' | 'text') => {
        const sections = post.sections
            .filter(s => s.content)
            .map((section) => {
                const outline = post.outline.find(o => o.id === section.sectionId);
                const heading = outline?.heading || '';

                if (format === 'markdown') {
                    return `## ${heading}\n\n${section.content}`;
                } else if (format === 'html') {
                    return `<h2>${heading}</h2>\n${section.content.replace(/\n/g, '<br/>')}`;
                } else {
                    // Plain text: strip all markdown
                    const plainHeading = stripMarkdown(heading);
                    const plainContent = stripMarkdown(section.content);
                    return `${plainHeading}\n\n${plainContent}`;
                }
            });

        const title = post.title || '블로그 글';

        if (format === 'markdown') {
            return `# ${title}\n\n${sections.join('\n\n---\n\n')}`;
        } else if (format === 'html') {
            return `<h1>${title}</h1>\n\n${sections.join('\n\n<hr/>\n\n')}`;
        } else {
            // Plain text: no separators, just double line breaks
            const plainTitle = stripMarkdown(title);
            return `${plainTitle}\n\n${sections.join('\n\n')}`;
        }
    };

    const handleCopy = async (format: 'markdown' | 'html' | 'text') => {
        const content = getFullContent(format);
        await navigator.clipboard.writeText(content);
        setCopied(format);
        setTimeout(() => setCopied(null), 2000);
    };

    const hasContent = post.sections.some(s => s.content);

    if (!hasContent) return null;

    return (
        <div className="flex gap-2 p-4 border-t bg-muted/30">
            <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopy('markdown')}
                className="flex items-center gap-2"
            >
                {copied === 'markdown' ? <Check className="h-4 w-4" /> : <Code className="h-4 w-4" />}
                마크다운 복사
            </Button>
            <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopy('html')}
                className="flex items-center gap-2"
            >
                {copied === 'html' ? <Check className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                HTML 복사
            </Button>
            <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopy('text')}
                className="flex items-center gap-2"
            >
                {copied === 'text' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                텍스트만 복사
            </Button>
        </div>
    );
}
