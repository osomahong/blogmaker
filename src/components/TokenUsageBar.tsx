'use client';

import { useBlogStore } from '@/lib/store/useBlogStore';
import { useEffect, useState } from 'react';

export default function TokenUsageBar() {
    const tokenUsage = useBlogStore((state) => state.tokenUsage);
    const [exchangeRate, setExchangeRate] = useState<number>(1400); // 기본값 1400원

    useEffect(() => {
        // 환율 정보 가져오기 (한 번만)
        fetch('https://api.exchangerate-api.com/v4/latest/USD')
            .then(res => res.json())
            .then(data => {
                if (data.rates && data.rates.KRW) {
                    setExchangeRate(data.rates.KRW);
                }
            })
            .catch(() => {
                // 실패 시 기본값 사용
                console.log('Using default exchange rate: 1400 KRW/USD');
            });
    }, []);

    const costInKRW = tokenUsage.estimatedCost * exchangeRate;

    return (
        <div className="bg-gray-50 border-b border-gray-200 px-4 py-2">
            <div className="max-w-7xl mx-auto flex items-center justify-between text-sm">
                <div className="flex items-center gap-6">
                    <div>
                        <span className="text-gray-600">입력 토큰:</span>{' '}
                        <span className="font-mono font-medium">{tokenUsage.promptTokens.toLocaleString()}</span>
                    </div>
                    <div>
                        <span className="text-gray-600">출력 토큰:</span>{' '}
                        <span className="font-mono font-medium">{tokenUsage.responseTokens.toLocaleString()}</span>
                    </div>
                    <div>
                        <span className="text-gray-600">총 토큰:</span>{' '}
                        <span className="font-mono font-medium">{tokenUsage.totalTokens.toLocaleString()}</span>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div>
                        <span className="text-gray-600">환율:</span>{' '}
                        <span className="font-mono text-xs">₩{exchangeRate.toFixed(0)}/USD</span>
                    </div>
                    <div>
                        <span className="text-gray-600">예상 비용:</span>{' '}
                        <span className="font-mono font-semibold text-blue-600">
                            ${tokenUsage.estimatedCost.toFixed(4)}
                        </span>
                        <span className="text-gray-500 ml-2">
                            (₩{costInKRW.toFixed(0)})
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
