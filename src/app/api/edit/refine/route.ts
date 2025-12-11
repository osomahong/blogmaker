import { GoogleGenerativeAI } from '@google/generative-ai';
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

        const { originalText, fullContext, instruction } = await request.json();

        if (!originalText || !instruction) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            generationConfig: {
                temperature: 0.7,
                topP: 0.9,
                topK: 40,
                maxOutputTokens: 2048,
            },
        });

        const prompt = `다음 텍스트를 수정해주세요.

원본 텍스트:
"${originalText}"

수정 지시사항: ${instruction}

전체 문맥 (참고용):
${fullContext}

규칙:
1. 수정 지시사항에 따라 텍스트를 변경하세요
2. 전체 문맥과 자연스럽게 어울리도록 하세요
3. 마크다운 형식을 유지하세요
4. 수정된 텍스트만 반환하세요 (설명이나 추가 텍스트 없이)
5. 원본의 핵심 의미는 유지하되, 지시사항에 맞게 스타일을 조정하세요`;

        const result = await model.generateContent(prompt);
        const response = result.response;
        
        if (!response) {
            return NextResponse.json(
                { error: 'No response from AI' },
                { status: 500 }
            );
        }

        const refinedText = response.text().trim();

        // Log token usage
        const usageMetadata = response.usageMetadata;
        if (usageMetadata) {
            console.log('📊 Refine token usage:', {
                promptTokens: usageMetadata.promptTokenCount,
                responseTokens: usageMetadata.candidatesTokenCount,
                totalTokens: usageMetadata.totalTokenCount,
            });
        }

        return NextResponse.json({ refinedText });

    } catch (error) {
        console.error('Refine API Error:', error);
        return NextResponse.json(
            { error: 'Failed to refine text' },
            { status: 500 }
        );
    }
}
