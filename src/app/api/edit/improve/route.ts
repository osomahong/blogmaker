import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const apiKey = process.env.GOOGLE_API_KEY;

        if (!apiKey) {
            return NextResponse.json(
                { error: 'API key not configured' },
                { status: 500 }
            );
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const { title, sections, instruction } = await request.json() as {
            title: string;
            sections: Array<{ heading: string; content: string }>;
            instruction?: string;
        };

        // Combine all content
        const fullContent = sections
            .map(s => `## ${s.heading}\n\n${s.content}`)
            .join('\n\n');

        const systemPrompt = `당신은 블로그 글을 전문적으로 편집하는 에디터입니다.

주요 역할:
1. 전체 글의 맥락을 파악하고 흐름을 개선
2. 중복되는 내용 제거 및 통합
3. 섹션 간 연결성 강화
4. 불필요한 반복 표현 제거
5. 가독성 향상

편집 원칙:
- 원문의 핵심 메시지와 정보는 유지
- 자연스러운 문장 흐름 유지
- 각 섹션의 고유한 내용은 보존
- 마크다운 포맷 유지
- 섹션 제목(##)은 그대로 유지

출력 형식:
각 섹션을 JSON 배열로 반환하세요.
[
  {
    "heading": "섹션 제목",
    "content": "개선된 본문",
    "changes": "주요 변경사항 요약"
  }
]`;

        const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash-exp',
            systemInstruction: systemPrompt,
            generationConfig: {
                temperature: 0.7,
                topP: 0.95,
                topK: 40,
                maxOutputTokens: 8192,
                candidateCount: 1,
            },
            safetySettings: [
                {
                    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
                    threshold: HarmBlockThreshold.BLOCK_NONE,
                },
                {
                    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                    threshold: HarmBlockThreshold.BLOCK_NONE,
                },
                {
                    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                    threshold: HarmBlockThreshold.BLOCK_NONE,
                },
                {
                    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                    threshold: HarmBlockThreshold.BLOCK_NONE,
                },
            ],
        });

        const userInstruction = instruction 
            ? `\n\n추가 요청사항: ${instruction}` 
            : '';

        const prompt = `다음 블로그 글을 전체적으로 검토하고 개선해주세요.

제목: ${title}

${fullContent}${userInstruction}

작업 내용:
1. 전체 글을 읽고 맥락 파악
2. 중복되는 내용이나 표현 찾기
3. 섹션 간 중복 제거 및 통합
4. 불필요한 반복 제거
5. 흐름 개선 및 연결성 강화
6. 각 섹션별로 개선된 내용 반환

JSON 형식으로만 응답하세요.`;

        console.log('🔍 Starting content improvement...');
        const result = await model.generateContent(prompt);
        const response = result.response;

        if (!response) {
            throw new Error('No response from AI');
        }

        const text = response.text();
        console.log('📝 Improvement response length:', text.length);

        // Parse JSON response
        let improvedSections;
        try {
            let jsonStr = text.trim();

            // Remove markdown code blocks
            if (jsonStr.includes('```')) {
                const startIdx = jsonStr.indexOf('```');
                let contentStart = startIdx + 3;
                if (jsonStr.substring(contentStart).startsWith('json')) {
                    contentStart += 4;
                }
                const endIdx = jsonStr.lastIndexOf('```');
                if (endIdx > contentStart) {
                    jsonStr = jsonStr.substring(contentStart, endIdx).trim();
                }
            }

            // Extract JSON array
            const firstBracket = jsonStr.indexOf('[');
            const lastBracket = jsonStr.lastIndexOf(']');
            if (firstBracket !== -1 && lastBracket > firstBracket) {
                jsonStr = jsonStr.substring(firstBracket, lastBracket + 1);
            }

            improvedSections = JSON.parse(jsonStr);
            console.log('✅ Successfully parsed improved sections:', improvedSections.length);
        } catch (err) {
            console.error('JSON parse error:', err);
            console.error('Raw text:', text.substring(0, 500));
            throw new Error('Failed to parse improvement response');
        }

        // Track token usage
        const usageMetadata = response.usageMetadata;
        if (usageMetadata) {
            console.log('📊 Improvement token usage:', {
                promptTokens: usageMetadata.promptTokenCount,
                responseTokens: usageMetadata.candidatesTokenCount,
                totalTokens: usageMetadata.totalTokenCount,
            });
        }

        return NextResponse.json({
            sections: improvedSections,
            tokenUsage: usageMetadata ? {
                promptTokens: usageMetadata.promptTokenCount || 0,
                responseTokens: usageMetadata.candidatesTokenCount || 0,
            } : undefined,
        });

    } catch (error) {
        console.error('Improvement API Error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to improve content' },
            { status: 500 }
        );
    }
}
