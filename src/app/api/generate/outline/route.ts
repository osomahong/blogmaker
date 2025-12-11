import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';
import { getOutlinerSystemPrompt } from '@/lib/prompts/writer';
import { BlogContext } from '@/types/blog';

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
        const { context } = await request.json() as { context: BlogContext };

        const systemPrompt = getOutlinerSystemPrompt(context);

        // Use flash for structured JSON output (outline)
        const model = genAI.getGenerativeModel({
            model: 'gemini-1.5-flash',
            systemInstruction: systemPrompt,
            generationConfig: {
                temperature: 0.7,
                topP: 0.9,
                topK: 40,
                maxOutputTokens: 2048, // Outline doesn't need much
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

        console.log('Generating outline...');
        const result = await model.generateContent('블로그 목차를 생성해주세요.');
        const response = result.response;
        
        if (!response) {
            console.error('No response from Gemini');
            return NextResponse.json(
                { error: 'No response from AI' },
                { status: 500 }
            );
        }

        const text = response.text();
        // Log token usage
        const usageMetadata = response.usageMetadata;
        if (usageMetadata) {
            console.log('📊 Outline token usage:', {
                promptTokens: usageMetadata.promptTokenCount,
                responseTokens: usageMetadata.candidatesTokenCount,
                totalTokens: usageMetadata.totalTokenCount,
            });
        }

        console.log('Raw outline response length:', text.length);
        console.log('Raw outline preview:', text.substring(0, 300));

        // Parse JSON response with better error handling
        let parsedResponse;
        try {
            let jsonStr = text.trim();
            
            // Remove markdown code blocks if present
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
            
            // Try to fix incomplete JSON by closing arrays/objects
            if (jsonStr.includes('"outline": [') && !jsonStr.endsWith(']}')) {
                console.log('Attempting to fix incomplete JSON...');
                // Count open brackets
                const openBrackets = (jsonStr.match(/\[/g) || []).length;
                const closeBrackets = (jsonStr.match(/\]/g) || []).length;
                const openBraces = (jsonStr.match(/\{/g) || []).length;
                const closeBraces = (jsonStr.match(/\}/g) || []).length;
                
                // Add missing closing brackets
                for (let i = 0; i < openBrackets - closeBrackets; i++) {
                    jsonStr += ']';
                }
                for (let i = 0; i < openBraces - closeBraces; i++) {
                    jsonStr += '}';
                }
            }
            
            parsedResponse = JSON.parse(jsonStr);
            console.log('Successfully parsed outline');
        } catch (err) {
            console.error('JSON parse error:', err);
            console.error('Full raw text:', text);
            return NextResponse.json(
                { error: 'Failed to parse outline response. Please try again.' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            title: parsedResponse.title,
            outline: parsedResponse.outline,
            tokenUsage: usageMetadata ? {
                promptTokens: usageMetadata.promptTokenCount || 0,
                responseTokens: usageMetadata.candidatesTokenCount || 0,
            } : undefined,
        });

    } catch (error) {
        console.error('Outline API Error:', error);
        return NextResponse.json(
            { error: 'Failed to generate outline' },
            { status: 500 }
        );
    }
}
