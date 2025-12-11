import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest } from 'next/server';
import { getWriterSystemPrompt } from '@/lib/prompts/writer';
import { BlogContext, SectionOutline } from '@/types/blog';

export async function POST(request: NextRequest) {
    try {
        const apiKey = process.env.GOOGLE_API_KEY;

        if (!apiKey) {
            return new Response(
                JSON.stringify({ error: 'API key not configured' }),
                { status: 500, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const { context, currentSection, previousSectionSummary } = await request.json() as {
            context: BlogContext;
            currentSection: SectionOutline;
            previousSectionSummary: string;
        };

        const systemPrompt = getWriterSystemPrompt(context, currentSection, previousSectionSummary);

        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            systemInstruction: systemPrompt,
            generationConfig: {
                temperature: 0.8,
                topP: 0.9,
                topK: 40,
                maxOutputTokens: 2048,
            },
        });

        const prompt = `이 섹션의 본문을 작성해주세요.

작성 시 유의사항:
1. 실제 블로그 글의 구조와 스타일을 참고하세요
2. 자연스러운 문장 흐름과 표현을 사용하세요
3. 사용자가 제공한 경험을 중심으로 작성하세요
4. 구체적이고 생생한 표현을 사용하세요`;

        const result = await model.generateContentStream(prompt);

        // Create a streaming response
        const encoder = new TextEncoder();
        let totalTokens = 0;
        let promptTokens = 0;
        let responseTokens = 0;

        const stream = new ReadableStream({
            async start(controller) {
                let chunkCount = 0;
                let totalChars = 0;
                
                try {
                    console.log(`🚀 Starting section generation: ${currentSection.heading}`);
                    
                    for await (const chunk of result.stream) {
                        const text = chunk.text();
                        if (text) {
                            chunkCount++;
                            totalChars += text.length;
                            controller.enqueue(encoder.encode(text));
                            
                            // Log progress every 10 chunks
                            if (chunkCount % 10 === 0) {
                                console.log(`📝 Section progress: ${chunkCount} chunks, ${totalChars} chars`);
                            }
                        }
                        
                        // Track token usage
                        if (chunk.usageMetadata) {
                            promptTokens = chunk.usageMetadata.promptTokenCount || 0;
                            responseTokens = chunk.usageMetadata.candidatesTokenCount || 0;
                            totalTokens = chunk.usageMetadata.totalTokenCount || 0;
                        }
                    }
                    
                    // Log final token usage
                    console.log('📊 Section generation completed:', {
                        section: currentSection.heading,
                        chunks: chunkCount,
                        chars: totalChars,
                        promptTokens,
                        responseTokens,
                        totalTokens,
                    });
                    
                    // Verify we got meaningful content
                    if (totalChars < 50) {
                        console.error('⚠️ Generated content too short:', totalChars);
                        throw new Error('Generated content too short');
                    }
                    
                    // Send token usage as final message
                    const tokenUsageMessage = `\n\n__TOKEN_USAGE__:${JSON.stringify({ promptTokens, responseTokens })}`;
                    controller.enqueue(encoder.encode(tokenUsageMessage));
                    
                    controller.close();
                } catch (error) {
                    console.error('❌ Stream error:', error);
                    console.error('Stream stats:', { chunkCount, totalChars });
                    
                    // Try to send error info to client
                    try {
                        const errorMsg = `\n\n[생성 중 오류 발생: ${error instanceof Error ? error.message : 'Unknown error'}]`;
                        controller.enqueue(encoder.encode(errorMsg));
                    } catch (e) {
                        // Ignore if controller already closed
                    }
                    
                    controller.error(error);
                }
            },
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Transfer-Encoding': 'chunked',
            },
        });

    } catch (error) {
        console.error('Section API Error:', error);
        return new Response(
            JSON.stringify({ error: 'Failed to generate section' }),
            {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}
