import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

interface FactCheckIssue {
    claim: string;
    issue: string;
    suggestion: string;
    sources: string[];
    severity: 'high' | 'medium' | 'low';
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

        const { content, title, strict = false } = await request.json();

        if (!content) {
            return NextResponse.json(
                { error: 'Missing content' },
                { status: 400 }
            );
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        // Use Pro for thorough fact-checking and analysis
        const model = genAI.getGenerativeModel({
            model: 'gemini-1.5-pro',
            generationConfig: {
                temperature: 0.3, // Low temperature for factual accuracy
                topP: 0.9,
                topK: 40,
                maxOutputTokens: 4096,
            },
        });

        const strictInstructions = strict ? `

**🔴 강한 검증 모드 활성화**
다음 사항을 추가로 엄격하게 검증하세요:

1. **모호한 표현 검증:**
   - "약", "정도", "대략" 등의 모호한 수치 표현
   - "일반적으로", "보통" 등의 불명확한 주장
   - 출처가 불분명한 통계나 데이터

2. **과장된 표현 검증:**
   - "최고", "최상", "완벽한" 등의 절대적 표현
   - "반드시", "무조건", "100%" 등의 단정적 표현
   - 검증되지 않은 효과나 결과 주장

3. **논리적 비약 검증:**
   - 인과관계가 명확하지 않은 주장
   - 근거 없는 일반화
   - 상관관계를 인과관계로 오해할 수 있는 표현

4. **시간 민감 정보:**
   - 최신성이 중요한 정보의 시점 명시 여부
   - 변경 가능성이 있는 정보의 업데이트 필요성

5. **법적/의료적 주의사항:**
   - 전문가 상담이 필요한 내용의 면책 표시
   - 개인차가 있을 수 있는 내용의 주의사항

**강한 검증 모드에서는 사소해 보이는 문제도 지적하세요.**` : `

중요: 실제로 검증이 필요한 중요한 문제만 지적하세요. 사소한 것은 무시하세요.`;

        const prompt = `당신은 전문 팩트체커입니다. 다음 블로그 글의 내용을 검증하고, 문제가 있는 부분${strict ? '을 엄격하게' : '만'} 지적해주세요.

제목: ${title}

내용:
${content}

다음 기준으로 팩트체크를 수행하세요:

**우선순위 높음 (반드시 검증):**
1. 장소, 위치 정보 (주소, 지명, 건물명 등)
2. 시간, 기간 정보 (날짜, 영업시간, 기간 등)
3. 가격, 비용 정보
4. 절차, 방법에 대한 구체적 설명
5. 통계, 수치 데이터

**우선순위 중간:**
6. 인과관계, 상호관계에 대한 주장
7. 효과, 결과에 대한 주장
8. 제품/서비스의 기능, 특징

**검증 제외:**
- 개인적 의견이나 감상
- 주관적 평가
${strict ? '' : '- 사소한 표현이나 수사적 표현'}

${strictInstructions}

**응답 형식:**
문제가 발견되면 JSON 배열로 반환하세요:
[
  {
    "claim": "검증이 필요한 원문 내용",
    "issue": "문제점 설명",
    "suggestion": "수정 제안",
    "severity": "high|medium|low"
  }
]

문제가 없다면 빈 배열 []을 반환하세요.`;

        const result = await model.generateContent(prompt);
        const response = result.response;
        
        if (!response) {
            return NextResponse.json(
                { error: 'No response from AI' },
                { status: 500 }
            );
        }

        let responseText = response.text().trim();
        
        // Extract JSON from markdown code blocks if present
        const jsonMatch = responseText.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
        if (jsonMatch) {
            responseText = jsonMatch[1];
        }

        // Parse the response
        let issues: FactCheckIssue[] = [];
        try {
            const parsed = JSON.parse(responseText);
            issues = Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            console.error('Failed to parse AI response:', e);
            // If parsing fails, return empty array (no issues found)
            issues = [];
        }

        // Return issues without web verification for now (to simplify)
        const verifiedIssues: FactCheckIssue[] = issues.map(issue => ({
            claim: issue.claim,
            issue: issue.issue,
            suggestion: issue.suggestion,
            sources: [],
            severity: issue.severity,
        }));

        // Log token usage
        const usageMetadata = response.usageMetadata;
        if (usageMetadata) {
            console.log('📊 Fact-check token usage:', {
                promptTokens: usageMetadata.promptTokenCount,
                responseTokens: usageMetadata.candidatesTokenCount,
                totalTokens: usageMetadata.totalTokenCount,
            });
        }

        return NextResponse.json({ 
            issues: verifiedIssues,
            summary: verifiedIssues.length === 0 
                ? '검증 결과 중요한 문제가 발견되지 않았습니다.' 
                : `${verifiedIssues.length}개의 검증이 필요한 내용이 발견되었습니다.`
        });

    } catch (error) {
        console.error('Fact-check API Error:', error);
        return NextResponse.json(
            { error: 'Failed to perform fact-check' },
            { status: 500 }
        );
    }
}
