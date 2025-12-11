'use client';

import { Progress } from '@/components/ui/progress';
import { InterviewPhase } from '@/types/blog';

interface ProgressBarProps {
    currentPhase: InterviewPhase;
    progress: number;
}

const phaseLabels: Record<InterviewPhase, string> = {
    TOPIC: '주제 파악',
    TARGET: '타겟 분석',
    DETAIL: '상세 정보',
    FORMAT: '스타일 확정',
};

const phaseOrder: InterviewPhase[] = ['TOPIC', 'TARGET', 'DETAIL', 'FORMAT'];

export function ProgressBar({ currentPhase, progress }: ProgressBarProps) {
    const currentIndex = phaseOrder.indexOf(currentPhase);

    return (
        <div className="w-full px-4 py-3 bg-card border-b">
            <div className="max-w-2xl mx-auto">
                <div className="flex justify-between mb-2">
                    {phaseOrder.map((phase, index) => (
                        <div
                            key={phase}
                            className={`text-xs font-medium transition-colors ${index <= currentIndex
                                    ? 'text-primary'
                                    : 'text-muted-foreground'
                                }`}
                        >
                            {phaseLabels[phase]}
                        </div>
                    ))}
                </div>
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1 text-center">
                    {currentIndex + 1} / {phaseOrder.length} 단계
                </p>
            </div>
        </div>
    );
}
