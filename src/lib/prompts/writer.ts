import { BlogContext, SectionOutline } from '@/types/blog';
import { WRITING_STYLES } from '@/lib/config/writingStyles';

export const getOutlinerSystemPrompt = (context: BlogContext): string => {
    // Apply writing style modifier with error handling
    const styleId = context.writingStyle || 'DEFAULT';
    const styleConfig = WRITING_STYLES[styleId] || WRITING_STYLES['DEFAULT'];
    
    // Log applied style for debugging
    console.log(`[Outliner] Applying writing style: ${styleConfig.id} (${styleConfig.name})`);
    
    const stylePrompt = styleConfig.promptModifier;
    
    // Style prompt comes FIRST for higher priority
    const styleSection = stylePrompt ? `${stylePrompt}\n\n` : '';
    
    const basePrompt = `${styleSection}블로그 목차를 생성합니다.

주제: ${context.topic}
타겟: ${context.targetAudience}
키워드: ${context.keywords.main}, ${context.keywords.lsi.join(', ')}
핵심 내용: ${context.keyExperiences.join(', ')}

규칙:
1. 4-6개 섹션 생성
2. 각 섹션당 2-3개 포인트
3. 서론-본론-결론 구조
4. 매력적인 제목

JSON 형식으로만 응답:
{
  "title": "블로그 제목",
  "outline": [
    {
      "id": 1,
      "heading": "섹션 제목",
      "subPoints": ["포인트1", "포인트2"]
    }
  ]
}

완전한 JSON만 반환하세요. 중간에 끊기지 않도록 주의하세요.`;
    
    return basePrompt;
};

export const getWriterSystemPrompt = (
    context: BlogContext,
    currentSection: SectionOutline,
    previousSummary: string
): string => {
    // Apply writing style modifier with error handling
    const styleId = context.writingStyle || 'DEFAULT';
    const styleConfig = WRITING_STYLES[styleId] || WRITING_STYLES['DEFAULT'];
    
    // Log applied style for debugging
    console.log(`[Writer] Applying writing style: ${styleConfig.id} (${styleConfig.name})`);
    
    const stylePrompt = styleConfig.promptModifier;
    
    // Style prompt comes FIRST for higher priority
    const styleSection = stylePrompt ? `${stylePrompt}\n\n` : '';
    
    const basePrompt = `${styleSection}당신은 실제 블로그 글처럼 자연스럽고 읽기 쉬운 글을 작성하는 전문 작가입니다.

주제: ${context.topic}
타겟: ${context.targetAudience}
키워드: ${context.keywords.lsi.join(', ')}
사용자 경험: ${context.keyExperiences.join(' / ')}

이전 내용: ${previousSummary || '(첫 섹션)'}

현재 섹션: ${currentSection.heading}
포함 내용:
${currentSection.subPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}

작성 규칙:
1. 실제 블로그 글처럼 자연스럽고 읽기 쉽게 작성
2. 500-800자 분량
3. 마크다운 사용 (**, -, > 등)
4. 이전 섹션과 자연스럽게 연결
5. 사용자 경험을 중심으로 작성
6. 구체적인 예시와 디테일 포함
7. 문단 나누기로 가독성 확보

섹션 제목(h2)은 포함하지 말고 바로 본문만 작성하세요.`;
    
    return basePrompt;
};
