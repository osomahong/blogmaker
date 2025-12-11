'use client';

import { useCallback, useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useBlogStore } from '@/lib/store/useBlogStore';
import { OutlinePanel } from './OutlinePanel';
import { ContentEditor } from './ContentEditor';
import { ExportButtons } from './ExportButtons';
import { TextSelectionToolbar } from './TextSelectionToolbar';
import { Loader2, RefreshCw, ArrowLeft, AlignLeft, AlignCenter, AlignRight, WrapText, Undo, Redo, ShieldCheck, Menu, X, Sparkles } from 'lucide-react';
import { SectionOutline } from '@/types/blog';
import { GenerationStatus } from './GenerationStatus';
import { FactCheckDialog } from './FactCheckDialog';
import { ImproveDialog } from './ImproveDialog';

interface EditorContainerProps {
    onBack: () => void;
}

interface FactCheckIssue {
    claim: string;
    issue: string;
    suggestion: string;
    sources: string[];
    severity: 'high' | 'medium' | 'low';
}

type SelectionContext = 'outline' | 'content' | 'subpoint';

export function EditorContainer({ onBack }: EditorContainerProps) {
    const {
        context,
        post,
        setOutline,
        updateSectionStatus,
        appendSectionContent,
        setSectionContent,
        setGenerating,
        updateOutlineHeading,
        updateOutlineSubPoint,
        deleteOutlineSubPoint,
        deleteOutlineSection,
        markSectionAsFactCheckModified,
        addTokenUsage,
    } = useBlogStore();

    const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [alignment, setAlignment] = useState<'left' | 'center' | 'right'>('left');
    const [isApplyingVlogBreaks, setIsApplyingVlogBreaks] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    
    // Fact-check state
    const [showFactCheck, setShowFactCheck] = useState(false);
    const [isFactChecking, setIsFactChecking] = useState(false);
    const [factCheckIssues, setFactCheckIssues] = useState<FactCheckIssue[]>([]);
    const [factCheckSummary, setFactCheckSummary] = useState('');
    const [applySuggestionFeedback, setApplySuggestionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    
    // Improve state
    const [showImprove, setShowImprove] = useState(false);
    const [isImproving, setIsImproving] = useState(false);
    const [improvedSections, setImprovedSections] = useState<Array<{ heading: string; content: string; changes: string }> | null>(null);
    
    // Unified text selection state
    const [selectedText, setSelectedText] = useState('');
    const [selectionPosition, setSelectionPosition] = useState<{ x: number; y: number } | null>(null);
    const [selectionContext, setSelectionContext] = useState<SelectionContext | null>(null);
    const [selectedSectionId, setSelectedSectionId] = useState<number | null>(null);
    const [selectedSubPointIndex, setSelectedSubPointIndex] = useState<number | undefined>(undefined);
    const selectedTextRef = useRef<string>('');
    const selectedSectionIdRef = useRef<number | null>(null);
    const selectionContextRef = useRef<SelectionContext | null>(null);
    const selectedSubPointIndexRef = useRef<number | undefined>(undefined);
    
    // Undo/Redo history
    const [history, setHistory] = useState<Array<typeof post.sections>>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    // Unified selection handler
    const handleTextSelection = useCallback((
        text: string,
        position: { x: number; y: number } | null,
        context: SelectionContext | null,
        sectionId: number | null,
        subPointIndex?: number
    ) => {
        setSelectedText(text);
        setSelectionPosition(position);
        setSelectionContext(context);
        setSelectedSectionId(sectionId);
        setSelectedSubPointIndex(subPointIndex);
        selectedTextRef.current = text;
        selectedSectionIdRef.current = sectionId;
        selectionContextRef.current = context;
        selectedSubPointIndexRef.current = subPointIndex;
    }, []);

    // Track if we should auto-generate content after outline
    const [shouldAutoGenerate, setShouldAutoGenerate] = useState(false);
    
    // Generate outline
    const generateOutline = useCallback(async (autoGenerate = false) => {
        setIsGeneratingOutline(true);
        setError(null);
        setShouldAutoGenerate(autoGenerate);

        try {
            const response = await fetch('/api/generate/outline', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ context }),
            });

            if (!response.ok) throw new Error('Failed to generate outline');

            const data = await response.json();
            
            // Track token usage
            if (data.tokenUsage) {
                addTokenUsage(data.tokenUsage.promptTokens, data.tokenUsage.responseTokens);
            }
            
            setOutline(data.title, data.outline);

        } catch (err) {
            console.error('Error generating outline:', err);
            setError('목차 생성에 실패했습니다. 다시 시도해주세요.');
            setShouldAutoGenerate(false);
        } finally {
            setIsGeneratingOutline(false);
        }
    }, [context, setOutline]);

    // Generate single section with timeout and retry
    const generateSection = useCallback(async (
        section: SectionOutline,
        previousSummary: string,
        retryCount = 0
    ): Promise<string> => {
        const MAX_RETRIES = 2;
        const TIMEOUT_MS = 60000; // 60 seconds timeout
        
        updateSectionStatus(section.id, 'generating');
        setSectionContent(section.id, '');

        try {
            // Create abort controller for timeout
            const abortController = new AbortController();
            const timeoutId = setTimeout(() => abortController.abort(), TIMEOUT_MS);

            const response = await fetch('/api/generate/section', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    context,
                    currentSection: section,
                    previousSectionSummary: previousSummary,
                }),
                signal: abortController.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: Failed to generate section`);
            }

            const reader = response.body?.getReader();
            if (!reader) throw new Error('No response body');

            const decoder = new TextDecoder();
            let fullContent = '';
            let lastChunkTime = Date.now();
            const CHUNK_TIMEOUT = 30000; // 30 seconds between chunks

            while (true) {
                // Check if too much time passed since last chunk
                if (Date.now() - lastChunkTime > CHUNK_TIMEOUT) {
                    reader.cancel();
                    throw new Error('Stream timeout: no data received');
                }

                const { done, value } = await reader.read();
                if (done) break;

                lastChunkTime = Date.now();
                const chunk = decoder.decode(value, { stream: true });
                
                // Check for token usage message
                if (chunk.includes('__TOKEN_USAGE__:')) {
                    const tokenUsageMatch = chunk.match(/__TOKEN_USAGE__:(.+)/);
                    if (tokenUsageMatch) {
                        try {
                            const tokenUsage = JSON.parse(tokenUsageMatch[1]);
                            addTokenUsage(tokenUsage.promptTokens, tokenUsage.responseTokens);
                        } catch (e) {
                            console.error('Failed to parse token usage:', e);
                        }
                    }
                    // Remove token usage message from content
                    const cleanChunk = chunk.replace(/__TOKEN_USAGE__:.+/, '');
                    if (cleanChunk) {
                        fullContent += cleanChunk;
                        appendSectionContent(section.id, cleanChunk);
                    }
                } else {
                    fullContent += chunk;
                    appendSectionContent(section.id, chunk);
                }
            }

            // Check if we got meaningful content
            if (fullContent.trim().length < 50) {
                throw new Error('Generated content too short');
            }

            updateSectionStatus(section.id, 'completed');
            console.log(`✅ Section ${section.id} completed: ${fullContent.length} chars`);

            // Return last paragraph as summary for next section
            const paragraphs = fullContent.split('\n\n').filter(p => p.trim());
            return paragraphs.slice(-2).join(' ');

        } catch (err) {
            console.error(`❌ Error generating section ${section.id} (attempt ${retryCount + 1}):`, err);
            
            // Retry logic
            if (retryCount < MAX_RETRIES) {
                console.log(`🔄 Retrying section ${section.id}... (${retryCount + 1}/${MAX_RETRIES})`);
                await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // Exponential backoff
                return generateSection(section, previousSummary, retryCount + 1);
            }
            
            updateSectionStatus(section.id, 'error');
            throw err;
        }
    }, [context, updateSectionStatus, setSectionContent, appendSectionContent, addTokenUsage]);

    // Generate all sections recursively
    const generateAllSections = useCallback(async () => {
        if (!post.outline.length) return;

        setGenerating(true);
        setError(null);

        let previousSummary = `${context.topic}에 대한 블로그 글의 시작`;

        try {
            for (const section of post.outline) {
                previousSummary = await generateSection(section, previousSummary);
            }
        } catch {
            setError('일부 섹션 생성에 실패했습니다. 실패한 섹션을 다시 시도해주세요.');
        } finally {
            setGenerating(false);
        }
    }, [post.outline, context.topic, generateSection, setGenerating]);
    
    // Auto-generate content after outline is created
    useEffect(() => {
        if (shouldAutoGenerate && post.outline.length > 0 && !post.isGenerating && !isGeneratingOutline) {
            setShouldAutoGenerate(false);
            generateAllSections();
        }
    }, [shouldAutoGenerate, post.outline.length, post.isGenerating, isGeneratingOutline, generateAllSections]);

    const hasOutline = post.outline.length > 0;
    const hasError = post.sections.some(s => s.status === 'error');
    const hasContent = post.sections.some(s => s.content);
    const canFormat = hasContent && !post.isGenerating;

    // Save current state to history
    const saveToHistory = useCallback(() => {
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(JSON.parse(JSON.stringify(post.sections)));
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    }, [history, historyIndex, post.sections]);

    // Undo action
    const handleUndo = useCallback(() => {
        if (historyIndex > 0) {
            const previousState = history[historyIndex - 1];
            previousState.forEach(section => {
                setSectionContent(section.sectionId, section.content);
            });
            setHistoryIndex(historyIndex - 1);
        }
    }, [historyIndex, history, setSectionContent]);

    // Redo action
    const handleRedo = useCallback(() => {
        if (historyIndex < history.length - 1) {
            const nextState = history[historyIndex + 1];
            nextState.forEach(section => {
                setSectionContent(section.sectionId, section.content);
            });
            setHistoryIndex(historyIndex + 1);
        }
    }, [historyIndex, history, setSectionContent]);

    const canUndo = historyIndex > 0;
    const canRedo = historyIndex < history.length - 1;

    // Apply vlog-style line breaks
    const applyVlogLineBreaks = useCallback(() => {
        if (!canFormat) return;
        
        setIsApplyingVlogBreaks(true);
        
        try {
            saveToHistory();
            
            post.sections.forEach(section => {
                if (!section.content) return;
                
                const transformed = section.content
                    .split('\n')
                    .map(line => {
                        if (!line.trim() || line.startsWith('#')) return line;
                        
                        return line
                            .replace(/([,，])\s*/g, '$1\n')
                            .replace(/([.。!?！？])\s+/g, '$1\n\n')
                            .replace(/\s+(그리고|하지만|그러나|또한|그래서)\s+/g, '\n$1 ');
                    })
                    .join('\n');
                
                if (transformed !== section.content) {
                    setSectionContent(section.sectionId, transformed);
                }
            });
        } catch (error) {
            console.error('Error applying vlog line breaks:', error);
        } finally {
            setIsApplyingVlogBreaks(false);
        }
    }, [canFormat, post.sections, setSectionContent, saveToHistory]);

    // Reset line breaks
    const resetLineBreaks = useCallback(() => {
        if (!canUndo) return;
        handleUndo();
    }, [canUndo, handleUndo]);

    // Fact-check
    const handleFactCheck = useCallback(async (sectionId?: number, strict = false) => {
        if (!hasContent) return;

        setIsFactChecking(true);
        setShowFactCheck(true);

        try {
            let content: string;
            let title: string;

            if (sectionId !== undefined) {
                // Check specific section
                const section = post.sections.find(s => s.sectionId === sectionId);
                const outline = post.outline.find(o => o.id === sectionId);
                
                if (!section || !outline) return;

                title = `${post.title} - ${outline.heading}`;
                content = `## ${outline.heading}\n\n${section.content}`;
            } else {
                // Check all content
                content = post.sections
                    .filter(s => s.content)
                    .map((section) => {
                        const outline = post.outline.find(o => o.id === section.sectionId);
                        const heading = outline?.heading || '';
                        return `## ${heading}\n\n${section.content}`;
                    })
                    .join('\n\n');
                title = post.title;
            }

            const response = await fetch('/api/factcheck', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title,
                    content,
                    strict,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                console.error('Fact-check API error:', errorData);
                throw new Error(errorData.error || 'Failed to fact-check');
            }

            const data = await response.json();
            setFactCheckIssues(data.issues || []);
            setFactCheckSummary(data.summary || (strict ? '강한 검증 완료' : ''));
        } catch (error) {
            console.error('Fact-check error:', error);
            setFactCheckSummary('팩트체크 중 오류가 발생했습니다.');
        } finally {
            setIsFactChecking(false);
        }
    }, [hasContent, post.sections, post.outline, post.title]);

    const handleRecheckAll = useCallback(() => {
        handleFactCheck();
    }, [handleFactCheck]);

    const handleStrictCheck = useCallback(() => {
        handleFactCheck(undefined, true);
    }, [handleFactCheck]);

    const handleCheckSection = useCallback((sectionId: number) => {
        handleFactCheck(sectionId);
    }, [handleFactCheck]);

    // Improve content
    const handleImprove = useCallback(async (instruction?: string) => {
        if (!hasContent) return;

        setIsImproving(true);
        setImprovedSections(null);

        try {
            const sections = post.sections
                .filter(s => s.content)
                .map((section) => {
                    const outline = post.outline.find(o => o.id === section.sectionId);
                    return {
                        heading: outline?.heading || '',
                        content: section.content,
                    };
                });

            const response = await fetch('/api/edit/improve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: post.title,
                    sections,
                    instruction,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                console.error('Improve API error:', errorData);
                throw new Error(errorData.error || 'Failed to improve content');
            }

            const data = await response.json();
            
            // Track token usage
            if (data.tokenUsage) {
                addTokenUsage(data.tokenUsage.promptTokens, data.tokenUsage.responseTokens);
            }
            
            setImprovedSections(data.sections || []);
        } catch (error) {
            console.error('Improve error:', error);
            setImprovedSections(null);
        } finally {
            setIsImproving(false);
        }
    }, [hasContent, post.sections, post.outline, post.title, addTokenUsage]);

    const handleApplyImprovement = useCallback((sections: Array<{ heading: string; content: string; changes: string }>) => {
        saveToHistory();
        
        sections.forEach((improvedSection) => {
            const outline = post.outline.find(o => o.heading === improvedSection.heading);
            if (outline) {
                setSectionContent(outline.id, improvedSection.content);
            }
        });
    }, [post.outline, setSectionContent, saveToHistory]);

    // Helper function for fuzzy text matching
    const findTextInContent = useCallback((content: string, searchText: string): { found: boolean; match?: string } => {
        const normalize = (text: string) => text.replace(/\s+/g, ' ').trim();
        
        // Strategy 1: Direct exact match
        if (content.includes(searchText)) {
            return { found: true, match: searchText };
        }
        
        // Strategy 2: Normalized whitespace match
        const normalizedSearch = normalize(searchText);
        const normalizedContent = normalize(content);
        
        if (normalizedContent.includes(normalizedSearch)) {
            // Find the actual text in original content using regex
            const words = searchText.split(/\s+/).filter(w => w.length > 0);
            const pattern = words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s+');
            const regex = new RegExp(pattern, 's');
            const match = content.match(regex);
            
            if (match) {
                return { found: true, match: match[0] };
            }
        }
        
        // Strategy 3: Partial match with first and last significant words
        const words = searchText.split(/\s+/).filter(w => w.length > 3);
        if (words.length >= 2) {
            const firstWord = words[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const lastWord = words[words.length - 1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const pattern = `${firstWord}[\\s\\S]*?${lastWord}`;
            const regex = new RegExp(pattern);
            const match = content.match(regex);
            
            if (match) {
                return { found: true, match: match[0] };
            }
        }
        
        return { found: false };
    }, []);

const handleApplySuggestion = useCallback(async (claim: string, suggestion: string) => {
        // Clear previous feedback
        setApplySuggestionFeedback(null);
        
        // Extract actual quoted text from claim if it contains metadata
        // API might return: "제목: ... 내용 중: '실제 인용문' 및 '다른 인용문'"
        let searchTexts: string[] = [claim];
        
        // Try to extract quoted text (both single and double quotes)
        const quoteMatches = claim.match(/['']([^'']+)['']/g) || claim.match(/[""]([^""]+)[""]/g) || [];
        if (quoteMatches.length > 0) {
            // Extract text from quotes
            const quotedTexts = quoteMatches.map(q => q.slice(1, -1).trim()).filter(t => t.length > 10);
            if (quotedTexts.length > 0) {
                searchTexts = quotedTexts;
            }
        }
        
        // Find which section contains the claim using fuzzy matching
        let foundSection = null;
        let matchResult = null;
        
        // Try each search text
        for (const searchText of searchTexts) {
            for (const section of post.sections) {
                const result = findTextInContent(section.content, searchText);
                if (result.found) {
                    foundSection = section;
                    matchResult = result;
                    break;
                }
            }
            if (foundSection) break;
        }

        if (!foundSection || !matchResult?.match) {
            console.error('Claim not found in any section:', claim);
            setApplySuggestionFeedback({
                type: 'error',
                message: '해당 내용을 찾을 수 없습니다. 콘텐츠가 이미 수정되었을 수 있습니다.'
            });
            return;
        }

        saveToHistory();

        try {
            // Use the refine API to apply the suggestion
            const response = await fetch('/api/edit/refine', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    originalText: matchResult.match,
                    fullContext: foundSection.content,
                    instruction: `다음 수정 제안을 반영하세요: ${suggestion}`,
                }),
            });

            if (!response.ok) throw new Error('Failed to apply suggestion');

            const data = await response.json();
            const refinedText = data.refinedText;

            // Replace the matched text with refined text
            const newContent = foundSection.content.replace(matchResult.match, refinedText);
            
            setSectionContent(foundSection.sectionId, newContent);
            markSectionAsFactCheckModified(foundSection.sectionId);
            
            // Show success feedback
            setApplySuggestionFeedback({
                type: 'success',
                message: '수정 제안이 성공적으로 반영되었습니다.'
            });
            
            // Clear feedback after 3 seconds
            setTimeout(() => setApplySuggestionFeedback(null), 3000);
        } catch (error) {
            console.error('Error applying suggestion:', error);
            setApplySuggestionFeedback({
                type: 'error',
                message: '수정 제안 반영 중 오류가 발생했습니다.'
            });
            throw error;
        }
    }, [post.sections, findTextInContent, setSectionContent, markSectionAsFactCheckModified, saveToHistory, handleFactCheck]);

    // Unified refine handler
    const handleRefine = useCallback(async (instruction: string) => {
        const currentContext = selectionContextRef.current;
        const currentSelectedText = selectedTextRef.current;
        const currentSectionId = selectedSectionIdRef.current;
        const currentSubPointIndex = selectedSubPointIndexRef.current;
        
        if (!currentSelectedText || currentSectionId === null || !currentContext) return;

        if (currentContext === 'subpoint' && currentSubPointIndex !== undefined) {
            // Handle subpoint refine
            const section = post.outline.find(s => s.id === currentSectionId);
            if (!section || !section.subPoints[currentSubPointIndex]) return;

            try {
                const response = await fetch('/api/edit/refine', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        originalText: currentSelectedText,
                        fullContext: section.subPoints[currentSubPointIndex],
                        instruction,
                    }),
                });

                if (!response.ok) throw new Error('Failed to refine text');

                const data = await response.json();
                const refinedText = data.refinedText;

                const currentSubPoint = section.subPoints[currentSubPointIndex];
                let newSubPoint = currentSubPoint;
                
                if (currentSubPoint.includes(currentSelectedText)) {
                    newSubPoint = currentSubPoint.replace(currentSelectedText, refinedText);
                } else {
                    newSubPoint = refinedText;
                }

                updateOutlineSubPoint(currentSectionId, currentSubPointIndex, newSubPoint);
            } catch (error) {
                console.error('Error refining subpoint text:', error);
                throw error;
            }
        } else if (currentContext === 'outline') {
            // Handle outline refine
            const section = post.outline.find(s => s.id === currentSectionId);
            if (!section) return;

            try {
                const response = await fetch('/api/edit/refine', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        originalText: currentSelectedText,
                        fullContext: section.heading,
                        instruction,
                    }),
                });

                if (!response.ok) throw new Error('Failed to refine text');

                const data = await response.json();
                const refinedText = data.refinedText;

                const cleanSelectedText = currentSelectedText.replace(/^\d+\.\s*/, '');
                let newHeading = section.heading;
                
                if (section.heading.includes(currentSelectedText)) {
                    newHeading = section.heading.replace(currentSelectedText, refinedText);
                } else if (section.heading.includes(cleanSelectedText)) {
                    newHeading = section.heading.replace(cleanSelectedText, refinedText);
                } else {
                    newHeading = refinedText;
                }

                updateOutlineHeading(currentSectionId, newHeading);
            } catch (error) {
                console.error('Error refining outline text:', error);
                throw error;
            }
        } else {
            // Handle content refine
            const section = post.sections.find(s => s.sectionId === currentSectionId);
            if (!section) return;

            saveToHistory();

            try {
                const response = await fetch('/api/edit/refine', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        originalText: currentSelectedText,
                        fullContext: section.content,
                        instruction,
                    }),
                });

                if (!response.ok) throw new Error('Failed to refine text');

                const data = await response.json();
                const refinedText = data.refinedText;

                const normalize = (text: string) => text.replace(/\s+/g, ' ').trim();
                let newContent = section.content;
                let replaced = false;

                console.log('🔍 Refine - Selected text:', currentSelectedText.substring(0, 100));
                console.log('🔍 Refine - Refined text:', refinedText.substring(0, 100));

                if (section.content.includes(currentSelectedText)) {
                    newContent = section.content.replace(currentSelectedText, refinedText);
                    replaced = true;
                    console.log('✅ Direct match succeeded');
                } else {
                    const normalizedSelected = normalize(currentSelectedText);
                    const normalizedContent = normalize(section.content);
                    
                    if (normalizedContent.includes(normalizedSelected)) {
                        const words = currentSelectedText.split(/\s+/).filter(w => w.length > 0);
                        const pattern = words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s+');
                        const regex = new RegExp(pattern, 's');
                        const match = section.content.match(regex);
                        
                        if (match) {
                            newContent = section.content.replace(match[0], refinedText);
                            replaced = true;
                            console.log('✅ Normalized match succeeded');
                        }
                    }
                }

                if (!replaced) {
                    console.log('⚠️ Trying partial match strategy...');
                    const words = currentSelectedText.split(/\s+/).filter(w => w.length > 3);
                    if (words.length >= 2) {
                        const firstWord = words[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        const lastWord = words[words.length - 1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        const pattern = `${firstWord}[\\s\\S]*?${lastWord}`;
                        const regex = new RegExp(pattern);
                        const match = section.content.match(regex);
                        
                        if (match) {
                            newContent = section.content.replace(match[0], refinedText);
                            replaced = true;
                            console.log('✅ Partial match succeeded');
                        }
                    }
                }

                if (!replaced) {
                    console.error('❌ Failed to replace text - text not found in content');
                } else {
                    console.log('✅ Text replacement successful');
                }

                setSectionContent(currentSectionId, newContent);
            } catch (error) {
                console.error('Error refining text:', error);
                throw error;
            }
        }
    }, [post.outline, post.sections, updateOutlineHeading, updateOutlineSubPoint, setSectionContent, saveToHistory]);

    // Unified direct edit handler
    const handleDirectEdit = useCallback((newText: string) => {
        const currentContext = selectionContextRef.current;
        const currentSelectedText = selectedTextRef.current;
        const currentSectionId = selectedSectionIdRef.current;
        const currentSubPointIndex = selectedSubPointIndexRef.current;
        
        if (!currentSelectedText || currentSectionId === null || !currentContext) return;

        if (currentContext === 'subpoint' && currentSubPointIndex !== undefined) {
            const section = post.outline.find(s => s.id === currentSectionId);
            if (!section || !section.subPoints[currentSubPointIndex]) return;

            const currentSubPoint = section.subPoints[currentSubPointIndex];
            let newSubPoint = currentSubPoint;
            
            if (currentSubPoint.includes(currentSelectedText)) {
                newSubPoint = currentSubPoint.replace(currentSelectedText, newText);
            } else {
                newSubPoint = newText;
            }

            updateOutlineSubPoint(currentSectionId, currentSubPointIndex, newSubPoint);
        } else if (currentContext === 'outline') {
            const section = post.outline.find(s => s.id === currentSectionId);
            if (!section) return;

            const cleanSelectedText = currentSelectedText.replace(/^\d+\.\s*/, '');
            let newHeading = section.heading;
            
            if (section.heading.includes(currentSelectedText)) {
                newHeading = section.heading.replace(currentSelectedText, newText);
            } else if (section.heading.includes(cleanSelectedText)) {
                newHeading = section.heading.replace(cleanSelectedText, newText);
            } else {
                newHeading = newText;
            }

            updateOutlineHeading(currentSectionId, newHeading);
        } else {
            const section = post.sections.find(s => s.sectionId === currentSectionId);
            if (!section) return;

            saveToHistory();

            const normalize = (text: string) => text.replace(/\s+/g, ' ').trim();
            let newContent = section.content;
            let replaced = false;

            if (section.content.includes(currentSelectedText)) {
                newContent = section.content.replace(currentSelectedText, newText);
                replaced = true;
            } else {
                const normalizedSelected = normalize(currentSelectedText);
                const normalizedContent = normalize(section.content);
                
                if (normalizedContent.includes(normalizedSelected)) {
                    const words = currentSelectedText.split(/\s+/).filter(w => w.length > 0);
                    const pattern = words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s+');
                    const regex = new RegExp(pattern, 's');
                    const match = section.content.match(regex);
                    
                    if (match) {
                        newContent = section.content.replace(match[0], newText);
                        replaced = true;
                    }
                }
            }

            if (!replaced) {
                const words = currentSelectedText.split(/\s+/).filter(w => w.length > 3);
                if (words.length >= 2) {
                    const firstWord = words[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const lastWord = words[words.length - 1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const pattern = `${firstWord}[\\s\\S]*?${lastWord}`;
                    const regex = new RegExp(pattern);
                    const match = section.content.match(regex);
                    
                    if (match) {
                        newContent = section.content.replace(match[0], newText);
                        replaced = true;
                    }
                }
            }

            setSectionContent(currentSectionId, newContent);
        }
    }, [post.outline, post.sections, updateOutlineHeading, updateOutlineSubPoint, setSectionContent, saveToHistory]);

    // Unified delete handler
    const handleDelete = useCallback(() => {
        const currentContext = selectionContextRef.current;
        const currentSectionId = selectedSectionIdRef.current;
        const currentSubPointIndex = selectedSubPointIndexRef.current;
        
        if (currentSectionId === null || !currentContext) return;

        if (currentContext === 'subpoint' && currentSubPointIndex !== undefined) {
            deleteOutlineSubPoint(currentSectionId, currentSubPointIndex);
        } else if (currentContext === 'outline') {
            deleteOutlineSection(currentSectionId);
        } else {
            const currentSelectedText = selectedTextRef.current;
            if (!currentSelectedText) return;

            const section = post.sections.find(s => s.sectionId === currentSectionId);
            if (!section) return;

            saveToHistory();

            const normalize = (text: string) => text.replace(/\s+/g, ' ').trim();
            let newContent = section.content;
            let replaced = false;

            if (section.content.includes(currentSelectedText)) {
                newContent = section.content.replace(currentSelectedText, '');
                replaced = true;
            } else {
                const normalizedSelected = normalize(currentSelectedText);
                const normalizedContent = normalize(section.content);
                
                if (normalizedContent.includes(normalizedSelected)) {
                    const words = currentSelectedText.split(/\s+/).filter(w => w.length > 0);
                    const pattern = words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s+');
                    const regex = new RegExp(pattern, 's');
                    const match = section.content.match(regex);
                    
                    if (match) {
                        newContent = section.content.replace(match[0], '');
                        replaced = true;
                    }
                }
            }

            if (!replaced) {
                const words = currentSelectedText.split(/\s+/).filter(w => w.length > 3);
                if (words.length >= 2) {
                    const firstWord = words[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const lastWord = words[words.length - 1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const pattern = `${firstWord}[\\s\\S]*?${lastWord}`;
                    const regex = new RegExp(pattern);
                    const match = section.content.match(regex);
                    
                    if (match) {
                        newContent = section.content.replace(match[0], '');
                        replaced = true;
                    }
                }
            }

            setSectionContent(currentSectionId, newContent);
        }
    }, [post.sections, deleteOutlineSection, deleteOutlineSubPoint, setSectionContent, saveToHistory]);

    const handleCloseToolbar = useCallback(() => {
        setSelectedText('');
        setSelectionPosition(null);
        setSelectionContext(null);
        setSelectedSectionId(null);
        setSelectedSubPointIndex(undefined);
        selectedTextRef.current = '';
        selectedSectionIdRef.current = null;
        selectionContextRef.current = null;
        selectedSubPointIndexRef.current = undefined;
        window.getSelection()?.removeAllRanges();
    }, []);

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-background">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={onBack}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        인터뷰로 돌아가기
                    </Button>

                    {/* Undo/Redo Toolbar */}
                    <div className="flex items-center gap-1 border-l pl-4">
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={handleUndo}
                            disabled={!canUndo}
                            title="실행 취소"
                        >
                            <Undo className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={handleRedo}
                            disabled={!canRedo}
                            title="다시 실행"
                        >
                            <Redo className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Formatting Toolbar */}
                    <div className="flex items-center gap-1 border-l pl-4">
                        <Button
                            variant={alignment === 'left' ? 'default' : 'ghost'}
                            size="icon-sm"
                            onClick={() => setAlignment('left')}
                            disabled={!canFormat}
                            title="왼쪽 정렬"
                        >
                            <AlignLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={alignment === 'center' ? 'default' : 'ghost'}
                            size="icon-sm"
                            onClick={() => setAlignment('center')}
                            disabled={!canFormat}
                            title="가운데 정렬"
                        >
                            <AlignCenter className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={alignment === 'right' ? 'default' : 'ghost'}
                            size="icon-sm"
                            onClick={() => setAlignment('right')}
                            disabled={!canFormat}
                            title="오른쪽 정렬"
                        >
                            <AlignRight className="h-4 w-4" />
                        </Button>
                        <div className="w-px h-6 bg-border mx-1" />
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={applyVlogLineBreaks}
                            disabled={!canFormat || isApplyingVlogBreaks}
                            title="브이로그 스타일 줄바꿈"
                        >
                            {isApplyingVlogBreaks ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <WrapText className="h-4 w-4 mr-2" />
                            )}
                            줄바꿈 반영
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={resetLineBreaks}
                            disabled={!canUndo}
                            title="줄바꿈 초기화 (이전 상태로)"
                        >
                            <Undo className="h-4 w-4 mr-2" />
                            줄바꿈 초기화
                        </Button>
                    </div>
                </div>

                {/* Only show buttons in header if content exists or has error */}
                {(hasContent || hasError) && (
                    <div className="flex gap-2">
                        {hasError && (
                            <Button variant="outline" onClick={generateAllSections}>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                실패한 섹션 재시도
                            </Button>
                        )}
                        {hasContent && (
                            <>
                                <Button 
                                    variant="outline" 
                                    onClick={() => setShowImprove(true)}
                                    disabled={isImproving}
                                >
                                    {isImproving ? (
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                        <Sparkles className="h-4 w-4 mr-2" />
                                    )}
                                    AI 개선
                                </Button>
                                <Button 
                                    variant="outline" 
                                    onClick={() => {
                                        if (factCheckIssues.length > 0 || factCheckSummary) {
                                            // Show existing results
                                            setShowFactCheck(true);
                                        } else {
                                            // Run new fact-check
                                            handleFactCheck();
                                        }
                                    }}
                                    disabled={isFactChecking}
                                >
                                    {isFactChecking ? (
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                        <ShieldCheck className="h-4 w-4 mr-2" />
                                    )}
                                    팩트체크
                                    {(factCheckIssues.length > 0 || factCheckSummary) && !isFactChecking && (
                                        <span className="ml-1 text-xs">({factCheckIssues.length})</span>
                                    )}
                                </Button>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Error message */}
            {error && (
                <div className="px-4 py-2 bg-destructive/10 text-destructive text-sm">
                    {error}
                </div>
            )}

            {/* Main content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Show centered buttons when no content */}
                {!hasContent && !hasOutline && (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center space-y-4">
                            <div className="text-muted-foreground mb-6">
                                <p className="text-lg mb-2">📝</p>
                                <p>인터뷰 내용을 바탕으로 블로그 글을 작성해보세요.</p>
                            </div>
                            <Button
                                onClick={() => generateOutline(true)}
                                disabled={isGeneratingOutline || post.isGenerating}
                                size="lg"
                            >
                                {(isGeneratingOutline || post.isGenerating) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                글 작성 시작
                            </Button>
                        </div>
                    </div>
                )}

                {hasOutline && !hasContent && (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center space-y-4">
                            <div className="text-muted-foreground mb-6">
                                <p className="text-lg mb-2">✍️</p>
                                <p>목차가 준비되었습니다. 이제 글을 작성해보세요.</p>
                            </div>
                            <Button
                                onClick={generateAllSections}
                                disabled={post.isGenerating}
                                size="lg"
                            >
                                글 작성 시작
                            </Button>
                        </div>
                    </div>
                )}

                {/* Show sidebar and content editor when content exists */}
                {(hasContent || hasOutline) && (
                    <div className="flex-1 flex overflow-hidden">
                        {/* Toggle Bar */}
                        <div 
                            className="w-12 bg-muted/30 border-r flex items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            title={isSidebarOpen ? "목차 숨기기" : "목차 보기"}
                        >
                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                {isSidebarOpen ? (
                                    <X className="h-5 w-5" />
                                ) : (
                                    <Menu className="h-5 w-5" />
                                )}
                                <span className="text-xs writing-mode-vertical-rl rotate-180">목차</span>
                            </div>
                        </div>
                        
                        {/* Collapsible Sidebar */}
                        <div 
                            className={`
                                bg-background border-r transition-all duration-300 ease-in-out overflow-hidden
                                ${isSidebarOpen ? 'w-80' : 'w-0'}
                            `}
                        >
                            <Card className="h-full w-80 border-0 rounded-none overflow-auto">
                                <OutlinePanel onTextSelection={handleTextSelection} />
                            </Card>
                        </div>
                        
                        {/* Content Editor */}
                        <div className="flex-1 flex flex-col overflow-hidden">
                            <div className="flex-1 overflow-hidden">
                                <ContentEditor 
                                    alignment={alignment} 
                                    onSaveToHistory={saveToHistory}
                                    onTextSelection={handleTextSelection}
                                />
                            </div>
                            <ExportButtons />
                        </div>
                    </div>
                )}
            </div>

            {/* AI Disclaimer */}
            <div className="px-4 py-2 bg-muted/50 text-xs text-muted-foreground text-center border-t">
                ⚠️ AI가 생성한 글입니다. 정보의 정확성을 확인하세요.
            </div>

            {/* Generation Status */}
            <GenerationStatus isGeneratingOutline={isGeneratingOutline} />

            {/* Unified Text Selection Toolbar */}
            <TextSelectionToolbar
                selectedText={selectedText}
                position={selectionPosition}
                onRefine={handleRefine}
                onDirectEdit={handleDirectEdit}
                onDelete={handleDelete}
                onClose={handleCloseToolbar}
            />

            {/* Improve Dialog */}
            <ImproveDialog
                open={showImprove}
                onOpenChange={setShowImprove}
                onApply={handleApplyImprovement}
                isLoading={isImproving}
                onImprove={handleImprove}
                improvedSections={improvedSections}
            />

            {/* Fact-Check Dialog */}
            <FactCheckDialog
                open={showFactCheck}
                onOpenChange={setShowFactCheck}
                issues={factCheckIssues}
                summary={factCheckSummary}
                isLoading={isFactChecking}
                onRecheck={handleRecheckAll}
                onStrictCheck={handleStrictCheck}
                onCheckSection={handleCheckSection}
                onApplySuggestion={handleApplySuggestion}
                sections={post.outline.map(o => ({ id: o.id, heading: o.heading }))}
                feedback={applySuggestionFeedback}
            />
        </div>
    );
}
