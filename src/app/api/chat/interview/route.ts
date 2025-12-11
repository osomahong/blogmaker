import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';
import { getInterviewerSystemPrompt } from '@/lib/prompts/interviewer';
import { InterviewPhase } from '@/types/blog';

interface ParsedResponse {
    message: string;
    collectedData: Record<string, unknown>;
    shouldAdvancePhase: boolean;
    nextPhase: string | null;
    tokenUsage?: {
        promptTokens: number;
        responseTokens: number;
    };
}

function parseGeminiResponse(text: string): ParsedResponse {
    const defaultResponse: ParsedResponse = {
        message: '응답을 처리하는 중 오류가 발생했습니다.',
        collectedData: {},
        shouldAdvancePhase: false,
        nextPhase: null,
    };

    if (!text || text.trim() === '') {
        console.error('Empty text provided to parser');
        return defaultResponse;
    }

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

    // Extract JSON object
    const firstBrace = jsonStr.indexOf('{');
    const lastBrace = jsonStr.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace > firstBrace) {
        jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
    }

    try {
        const parsed = JSON.parse(jsonStr);

        if (!parsed.message || typeof parsed.message !== 'string') {
            console.error('Invalid message in parsed response:', parsed);
            return defaultResponse;
        }

        return {
            message: parsed.message,
            collectedData: parsed.collectedData || {},
            shouldAdvancePhase: Boolean(parsed.shouldAdvancePhase),
            nextPhase: parsed.nextPhase || null,
        };
    } catch (err) {
        console.error('JSON parse error:', err);
        console.error('Attempted string:', jsonStr.substring(0, 300));
        return defaultResponse;
    }
}

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
        const { messages, currentPhase } = await request.json();

        if (messages.length === 0) {
            return NextResponse.json({
                message: '어떤 주제로 블로그 글을 쓰고 싶으신가요?',
                collectedData: {},
                shouldAdvancePhase: false,
                nextPhase: null,
            });
        }

        const systemPrompt = getInterviewerSystemPrompt(currentPhase as InterviewPhase);

        // Use text generation without JSON mode for more reliable responses
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            systemInstruction: systemPrompt,
            generationConfig: {
                temperature: 0.7,
                topP: 0.8,
                topK: 40,
                maxOutputTokens: 2048, // Increased for complete responses
            },
        });

        // Build conversation history with both roles
        const conversationHistory = messages
            .slice(-10) // Only last 10 messages to avoid token limits
            .map((msg: { role: string; content: string }) => {
                return `${msg.role === 'user' ? '사용자' : 'AI'}: ${msg.content}`;
            })
            .join('\n\n');

        const prompt = `대화 기록:
${conversationHistory}

위 대화를 바탕으로 다음 질문을 생성하세요. 반드시 JSON 형식으로만 응답하세요.`;

        console.log('Sending prompt to Gemini...');
        
        const result = await model.generateContent(prompt);
        const response = result.response;
        
        // Check for safety blocks or empty responses
        if (!response) {
            console.error('No response from Gemini');
            return NextResponse.json({
                message: '죄송합니다. 응답을 생성할 수 없습니다. 다시 시도해주세요.',
                collectedData: {},
                shouldAdvancePhase: false,
                nextPhase: null,
            });
        }

        // Check if response was blocked
        const candidates = response.candidates;
        if (!candidates || candidates.length === 0) {
            console.error('Response blocked or no candidates');
            console.error('Prompt feedback:', response.promptFeedback);
            return NextResponse.json({
                message: '죄송합니다. 다른 방식으로 답변해주시겠어요?',
                collectedData: {},
                shouldAdvancePhase: false,
                nextPhase: null,
            });
        }

        const text = response.text();
        
        if (!text || text.trim() === '') {
            console.error('Empty text response from Gemini');
            return NextResponse.json({
                message: '죄송합니다. 조금 더 구체적으로 말씀해주시겠어요?',
                collectedData: {},
                shouldAdvancePhase: false,
                nextPhase: null,
            });
        }

        // Log token usage
        const usageMetadata = response.usageMetadata;
        console.log('Raw usageMetadata:', usageMetadata);
        
        const tokenUsage = usageMetadata ? {
            promptTokens: usageMetadata.promptTokenCount || 0,
            responseTokens: usageMetadata.candidatesTokenCount || 0,
        } : undefined;
        
        if (usageMetadata) {
            console.log('📊 Token usage:', {
                promptTokens: usageMetadata.promptTokenCount,
                responseTokens: usageMetadata.candidatesTokenCount,
                totalTokens: usageMetadata.totalTokenCount,
            });
        } else {
            console.warn('⚠️ No usageMetadata in Gemini response');
        }

        console.log('Raw response length:', text.length);
        console.log('Raw response preview:', text.substring(0, 200));
        
        const parsedResponse = parseGeminiResponse(text);
        parsedResponse.tokenUsage = tokenUsage;
        
        // If parsing failed, return a generic follow-up question
        if (parsedResponse.message === '응답을 처리하는 중 오류가 발생했습니다.') {
            console.error('Failed to parse response, using fallback');
            return NextResponse.json({
                message: '더 자세히 말씀해주시겠어요?',
                collectedData: {},
                shouldAdvancePhase: false,
                nextPhase: null,
            });
        }

        console.log('Parsed message:', parsedResponse.message.substring(0, 100));

        return NextResponse.json(parsedResponse);

    } catch (error) {
        console.error('Interview API Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error details:', errorMessage);
        
        return NextResponse.json({
            message: '죄송합니다. 일시적인 오류가 발생했습니다. 다시 시도해주세요.',
            collectedData: {},
            shouldAdvancePhase: false,
            nextPhase: null,
        });
    }
}
