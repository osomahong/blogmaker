import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
    StoreState,
    InterviewState,
    BlogContext,
    BlogPost,
    Message,
    InterviewPhase,
    SectionOutline,
    SectionContent,
    TokenUsage,
} from '@/types/blog';

// 초기 상태
const initialInterviewState: InterviewState = {
    messages: [],
    currentPhase: 'TOPIC',
    progress: 0,
    isComplete: false,
};

const initialBlogContext: BlogContext = {
    topic: '',
    category: 'INFO',
    targetAudience: '',
    keywords: {
        main: '',
        lsi: [],
    },
    keyExperiences: [],
    tone: 'PROFESSIONAL',
    writingStyle: 'DEFAULT',
};

const initialBlogPost: BlogPost = {
    title: '',
    outline: [],
    sections: [],
    isGenerating: false,
};

const initialTokenUsage: TokenUsage = {
    promptTokens: 0,
    responseTokens: 0,
    totalTokens: 0,
    estimatedCost: 0,
};

export const useBlogStore = create<StoreState>()(
    persist(
        (set, get) => ({
            // Initial States
            interview: initialInterviewState,
            context: initialBlogContext,
            post: initialBlogPost,
            tokenUsage: initialTokenUsage,

            // Interview Actions
            addMessage: (message: Message) =>
                set((state) => ({
                    interview: {
                        ...state.interview,
                        messages: [...state.interview.messages, message],
                    },
                })),

            setPhase: (phase: InterviewPhase) =>
                set((state) => ({
                    interview: {
                        ...state.interview,
                        currentPhase: phase,
                        progress: getProgressByPhase(phase),
                    },
                })),

            setProgress: (progress: number) =>
                set((state) => ({
                    interview: {
                        ...state.interview,
                        progress,
                    },
                })),

            completeInterview: () =>
                set((state) => ({
                    interview: {
                        ...state.interview,
                        isComplete: true,
                        progress: 100,
                    },
                })),

            // Context Actions
            setContext: (data: Partial<BlogContext>) =>
                set((state) => ({
                    context: {
                        ...state.context,
                        ...data,
                    },
                })),

            // Post Actions
            setOutline: (title: string, outline: SectionOutline[]) =>
                set((state) => ({
                    post: {
                        ...state.post,
                        title,
                        outline,
                        sections: outline.map((section) => ({
                            sectionId: section.id,
                            content: '',
                            status: 'pending' as const,
                        })),
                    },
                })),

            updateOutlineHeading: (id: number, heading: string) =>
                set((state) => ({
                    post: {
                        ...state.post,
                        outline: state.post.outline.map((section) =>
                            section.id === id ? { ...section, heading } : section
                        ),
                    },
                })),

            updateOutlineSubPoint: (id: number, subPointIndex: number, newText: string) =>
                set((state) => ({
                    post: {
                        ...state.post,
                        outline: state.post.outline.map((section) =>
                            section.id === id
                                ? {
                                      ...section,
                                      subPoints: section.subPoints.map((point, idx) =>
                                          idx === subPointIndex ? newText : point
                                      ),
                                  }
                                : section
                        ),
                    },
                })),

            deleteOutlineSubPoint: (id: number, subPointIndex: number) =>
                set((state) => ({
                    post: {
                        ...state.post,
                        outline: state.post.outline.map((section) =>
                            section.id === id
                                ? {
                                      ...section,
                                      subPoints: section.subPoints.filter((_, idx) => idx !== subPointIndex),
                                  }
                                : section
                        ),
                    },
                })),

            updateOutlineSubPoints: (id: number, subPoints: string[]) =>
                set((state) => ({
                    post: {
                        ...state.post,
                        outline: state.post.outline.map((section) =>
                            section.id === id ? { ...section, subPoints } : section
                        ),
                    },
                })),

            deleteOutlineSection: (id: number) =>
                set((state) => ({
                    post: {
                        ...state.post,
                        outline: state.post.outline.filter((section) => section.id !== id),
                        sections: state.post.sections.filter((section) => section.sectionId !== id),
                    },
                })),

            updateSectionStatus: (id: number, status: SectionContent['status']) =>
                set((state) => ({
                    post: {
                        ...state.post,
                        sections: state.post.sections.map((section) =>
                            section.sectionId === id ? { ...section, status } : section
                        ),
                    },
                })),

            appendSectionContent: (id: number, chunk: string) =>
                set((state) => ({
                    post: {
                        ...state.post,
                        sections: state.post.sections.map((section) =>
                            section.sectionId === id
                                ? { ...section, content: section.content + chunk }
                                : section
                        ),
                    },
                })),

            setSectionContent: (id: number, content: string) =>
                set((state) => ({
                    post: {
                        ...state.post,
                        sections: state.post.sections.map((section) =>
                            section.sectionId === id ? { ...section, content } : section
                        ),
                    },
                })),

            setGenerating: (isGenerating: boolean) =>
                set((state) => ({
                    post: {
                        ...state.post,
                        isGenerating,
                    },
                })),

            markSectionAsFactCheckModified: (id: number) =>
                set((state) => ({
                    post: {
                        ...state.post,
                        sections: state.post.sections.map((section) =>
                            section.sectionId === id
                                ? { ...section, factCheckModified: true }
                                : section
                        ),
                    },
                })),

            // Token Usage Actions
            addTokenUsage: (promptTokens: number, responseTokens: number) =>
                set((state) => {
                    const newPromptTokens = state.tokenUsage.promptTokens + promptTokens;
                    const newResponseTokens = state.tokenUsage.responseTokens + responseTokens;
                    const newTotalTokens = newPromptTokens + newResponseTokens;
                    
                    // Gemini 2.5 Flash 가격 (2024년 12월 기준)
                    // Input: $0.075 per 1M tokens
                    // Output: $0.30 per 1M tokens
                    const inputCost = (newPromptTokens / 1_000_000) * 0.075;
                    const outputCost = (newResponseTokens / 1_000_000) * 0.30;
                    const estimatedCost = inputCost + outputCost;

                    console.log('💰 Store: Adding token usage', {
                        added: { promptTokens, responseTokens },
                        new: { newPromptTokens, newResponseTokens, newTotalTokens, estimatedCost }
                    });

                    return {
                        tokenUsage: {
                            promptTokens: newPromptTokens,
                            responseTokens: newResponseTokens,
                            totalTokens: newTotalTokens,
                            estimatedCost,
                        },
                    };
                }),

            resetTokenUsage: () =>
                set({
                    tokenUsage: initialTokenUsage,
                }),

            // Global Actions
            reset: () =>
                set({
                    interview: initialInterviewState,
                    context: initialBlogContext,
                    post: initialBlogPost,
                    tokenUsage: initialTokenUsage,
                }),
        }),
        {
            name: 'blog-maker-storage',
            partialize: (state) => ({
                interview: state.interview,
                context: state.context,
                post: state.post,
                tokenUsage: state.tokenUsage,
            }),
        }
    )
);

// 헬퍼 함수: Phase에 따른 Progress 계산
function getProgressByPhase(phase: InterviewPhase): number {
    const progressMap: Record<InterviewPhase, number> = {
        TOPIC: 25,
        TARGET: 50,
        DETAIL: 75,
        FORMAT: 100,
    };
    return progressMap[phase];
}
