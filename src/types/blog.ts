// 1. 인터뷰 상태 관리
export interface Message {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    createdAt?: Date;
}

export type InterviewPhase = 'TOPIC' | 'TARGET' | 'DETAIL' | 'FORMAT';

export interface InterviewState {
    messages: Message[];
    currentPhase: InterviewPhase;
    progress: number; // 0 ~ 100
    isComplete: boolean;
}

// 2. 블로그 컨텍스트 (인터뷰 결과물)
export type BlogCategory = 'REVIEW' | 'INFO' | 'COLUMN';
export type ToneType = 'WITTY' | 'PROFESSIONAL' | 'EMOTIONAL';

// 글 작성 스타일 타입
export type WritingStyleType = 'DEFAULT' | 'NAVER_POWER_BLOG' | 'DIGITAL_MARKETING_EXPERT';

// 스타일 설정 인터페이스
export interface WritingStyleConfig {
    id: WritingStyleType;
    name: string;
    description: string;
    promptModifier: string; // 프롬프트에 추가될 스타일 지시사항
}

export interface BlogContext {
    topic: string;
    category: BlogCategory;
    targetAudience: string;
    keywords: {
        main: string;
        lsi: string[]; // 연관 키워드 (LSI: Latent Semantic Indexing)
    };
    keyExperiences: string[]; // 사용자 경험 데이터
    tone: ToneType;
    writingStyle?: WritingStyleType;
}

// 3. 블로그 구조 및 콘텐츠
export interface SectionOutline {
    id: number;
    heading: string; // h2
    subPoints: string[]; // h3, bullet points
}

export interface SectionContent {
    sectionId: number;
    content: string; // Markdown text
    status: 'pending' | 'generating' | 'completed' | 'error';
    factCheckModified?: boolean; // 팩트체크로 수정된 섹션 표시
}

export interface BlogPost {
    title: string;
    outline: SectionOutline[];
    sections: SectionContent[];
    isGenerating: boolean;
}

// 4. 토큰 사용량 추적
export interface TokenUsage {
    promptTokens: number;
    responseTokens: number;
    totalTokens: number;
    estimatedCost: number; // USD
}

// 5. 스토어 전체 상태
export interface StoreState {
    // States
    interview: InterviewState;
    context: BlogContext;
    post: BlogPost;
    tokenUsage: TokenUsage;

    // Interview Actions
    addMessage: (message: Message) => void;
    setPhase: (phase: InterviewPhase) => void;
    setProgress: (progress: number) => void;
    completeInterview: () => void;

    // Context Actions
    setContext: (data: Partial<BlogContext>) => void;

    // Post Actions
    setOutline: (title: string, outline: SectionOutline[]) => void;
    updateOutlineHeading: (id: number, heading: string) => void;
    updateOutlineSubPoint: (id: number, subPointIndex: number, newText: string) => void;
    deleteOutlineSubPoint: (id: number, subPointIndex: number) => void;
    updateOutlineSubPoints: (id: number, subPoints: string[]) => void;
    deleteOutlineSection: (id: number) => void;
    updateSectionStatus: (id: number, status: SectionContent['status']) => void;
    appendSectionContent: (id: number, chunk: string) => void;
    setSectionContent: (id: number, content: string) => void;
    setGenerating: (isGenerating: boolean) => void;
    markSectionAsFactCheckModified: (id: number) => void;

    // Token Usage Actions
    addTokenUsage: (promptTokens: number, responseTokens: number) => void;
    resetTokenUsage: () => void;

    // Global Actions
    reset: () => void;
}
