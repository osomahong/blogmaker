import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
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

        // Use Pro for high-quality long-form content generation
        const model = genAI.getGenerativeModel({
            model: 'gemini-1.5-pro',
            systemInstruction: systemPrompt,
            generationConfig: {
                temperature: 0.8,
                topP: 0.95,
                topK: 40,
                maxOutputTokens: 8192, // Pro supports up to 8192 tokens
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

        const prompt = `이 섹션의 본문을 작성해주세요.

작성 시 유의사항:
1. 실제 블로그 글의 구조와 스타일을 참고하세요
2. 자연스러운 문장 흐름과 표현을 사용하세요
3. 사용자가 제공한 경험을 중심으로 작성하세요
4. 구체적이고 생생한 표현을 사용하세요
5. 500-800자 분량으로 충분히 작성하세요
6. 문장을 중간에 끊지 말고 완전하게 마무리하세요

반드시 완성된 문장으로 끝내주세요.`;

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
                    
                    let lastFinishReason = null;
                    
                    for await (const chunk of result.stream) {
                        // Check finish reason
                        if (chunk.candidates && chunk.candidates[0]) {
                            const candidate = chunk.candidates[0];
                            if (candidate.finishReason) {
                                lastFinishReason = candidate.finishReason;
                                console.log(`🏁 Finish reason: ${lastFinishReason}`);
                            }
                            
                            // Check for safety blocks
                            if (candidate.safetyRatings) {
                                const highProbability = candidate.safetyRatings.find(r => r.probability === 'HIGH');
                                if (highProbability) {
                                    console.warn('⚠️ High probability safety rating:', highProbability);
                                }
                            }
                        }
                        
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
                    
                    // Check if generation was incomplete
                    if (lastFinishReason && lastFinishReason !== 'STOP' && lastFinishReason !== 'MAX_TOKENS') {
                        console.warn(`⚠️ Generation ended with reason: ${lastFinishReason}`);
                        if (lastFinishReason === 'SAFETY') {
                            const warningMsg = '\n\n[일부 내용이 안전 필터에 의해 제한되었을 수 있습니다]';
                            controller.enqueue(encoder.encode(warningMsg));
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
                        finishReason: lastFinishReason,
                    });
                    
                    // Verify we got meaningful content (reduced threshold)
                    if (totalChars < 30) {
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
