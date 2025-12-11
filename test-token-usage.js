// Test token usage tracking
async function testTokenUsage() {
    try {
        const response = await fetch('http://localhost:3000/api/chat/interview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: [
                    { role: 'user', content: '블로그 글을 쓰고 싶어요' }
                ],
                currentPhase: 'TOPIC',
            }),
        });

        const data = await response.json();
        console.log('\n=== API Response ===');
        console.log('Message:', data.message?.substring(0, 100));
        console.log('Token Usage:', data.tokenUsage);
        console.log('Has tokenUsage:', !!data.tokenUsage);
        
        if (data.tokenUsage) {
            console.log('✅ Token usage is being tracked!');
            console.log('  - Prompt tokens:', data.tokenUsage.promptTokens);
            console.log('  - Response tokens:', data.tokenUsage.responseTokens);
        } else {
            console.log('❌ No token usage data in response');
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

testTokenUsage();
