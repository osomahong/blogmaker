'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { useBlogStore } from '@/lib/store/useBlogStore';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { ProgressBar } from './ProgressBar';
import { TypingIndicator } from './TypingIndicator';
import { SuggestionChips } from './SuggestionChips';
import { INITIAL_GREETING } from '@/lib/prompts/interviewer';
import { Message, InterviewPhase } from '@/types/blog';

interface ChatContainerProps {
    onInterviewComplete: () => void;
}

const PHASE_ORDER: InterviewPhase[] = ['TOPIC', 'TARGET', 'DETAIL', 'FORMAT'];

// Generate unique ID
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export function ChatContainer({ onInterviewComplete }: ChatContainerProps) {
    const {
        interview,
        context,
        addMessage,
        setPhase,
        setContext,
        completeInterview,
        addTokenUsage,
    } = useBlogStore();

    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const initializedRef = useRef(false);

    // Initialize with greeting message (only once)
    useEffect(() => {
        if (!initializedRef.current && interview.messages.length === 0) {
            initializedRef.current = true;
            const greetingMessage: Message = {
                id: generateId(),
                role: 'assistant',
                content: INITIAL_GREETING,
                createdAt: new Date(),
            };
            addMessage(greetingMessage);
        }
    }, []);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [interview.messages, isLoading]);

    const handleSendMessage = useCallback(async (content: string) => {
        // Add user message
        const userMessage: Message = {
            id: generateId(),
            role: 'user',
            content,
            createdAt: new Date(),
        };
        addMessage(userMessage);

        setIsLoading(true);

        try {
            const response = await fetch('/api/chat/interview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [...interview.messages, userMessage].map(m => ({
                        role: m.role,
                        content: m.content,
                    })),
                    currentPhase: interview.currentPhase,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('API Error:', response.status, errorData);
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }

            const data = await response.json();
            console.log('API Response:', data);
            console.log('Token usage from API:', data.tokenUsage);

            // Track token usage
            if (data.tokenUsage) {
                console.log('Adding token usage:', data.tokenUsage);
                addTokenUsage(data.tokenUsage.promptTokens, data.tokenUsage.responseTokens);
            } else {
                console.warn('No token usage data in API response');
            }

            // Check if message exists
            if (!data.message) {
                console.error('No message in response:', data);
                throw new Error('No message in response');
            }

            // Add assistant message
            const assistantMessage: Message = {
                id: generateId(),
                role: 'assistant',
                content: data.message,
                createdAt: new Date(),
            };
            addMessage(assistantMessage);

            // Update context with collected data
            if (data.collectedData) {
                const { topic, category, targetAudience, mainKeyword, lsiKeywords, keyExperiences, tone } = data.collectedData;

                const updates: Partial<typeof context> = {};
                if (topic) updates.topic = topic;
                if (category) updates.category = category;
                if (targetAudience) updates.targetAudience = targetAudience;
                if (mainKeyword) updates.keywords = { ...context.keywords, main: mainKeyword };
                if (lsiKeywords?.length) updates.keywords = { ...context.keywords, ...updates.keywords, lsi: lsiKeywords };
                if (keyExperiences?.length) updates.keyExperiences = [...context.keyExperiences, ...keyExperiences];
                if (tone) updates.tone = tone;

                if (Object.keys(updates).length > 0) {
                    setContext(updates);
                }
            }

            // Advance phase if needed
            if (data.shouldAdvancePhase) {
                const currentIndex = PHASE_ORDER.indexOf(interview.currentPhase);
                if (currentIndex < PHASE_ORDER.length - 1) {
                    setPhase(PHASE_ORDER[currentIndex + 1]);
                } else {
                    // Interview complete
                    completeInterview();
                }
            }

        } catch (error) {
            console.error('Error sending message:', error);
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: '죄송합니다, 오류가 발생했습니다. 다시 시도해주세요.',
                createdAt: new Date(),
            };
            addMessage(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [interview.messages, interview.currentPhase, context, addMessage, setPhase, setContext, completeInterview]);

    const handleSuggestionSelect = (suggestion: string) => {
        handleSendMessage(suggestion);
    };

    const handleCompleteClick = () => {
        completeInterview();
        onInterviewComplete();
    };

    return (
        <div className="flex flex-col h-full bg-background overflow-hidden">
            {/* Progress Bar - Fixed at top */}
            <ProgressBar
                currentPhase={interview.currentPhase}
                progress={interview.progress}
            />

            {/* Chat Messages - Scrollable area */}
            <div className="flex-1 overflow-y-auto px-4" ref={scrollRef}>
                <div className="max-w-2xl mx-auto py-4">
                    {interview.messages.map((message, index) => (
                        <ChatMessage key={`${message.id}-${index}`} message={message} />
                    ))}
                    {isLoading && <TypingIndicator />}
                </div>
            </div>

            {/* Bottom section - Fixed at bottom */}
            <div className="shrink-0">
                {!isLoading && !interview.isComplete && (
                    <SuggestionChips onSelect={handleSuggestionSelect} />
                )}

                {interview.isComplete ? (
                    <div className="p-4 border-t bg-muted/50">
                        <div className="max-w-2xl mx-auto text-center">
                            <p className="text-sm text-muted-foreground mb-3">
                                인터뷰가 완료되었습니다! 이제 블로그 글을 생성할 준비가 되었어요.
                            </p>
                            <Button onClick={handleCompleteClick} size="lg">
                                블로그 글 생성하기
                            </Button>
                        </div>
                    </div>
                ) : (
                    <ChatInput
                        onSend={handleSendMessage}
                        disabled={isLoading}
                        placeholder="답변을 입력하세요... (Shift+Enter로 줄바꿈)"
                    />
                )}
            </div>
        </div>
    );
}
