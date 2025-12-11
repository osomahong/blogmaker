'use client';

import { useState } from 'react';
import { useBlogStore } from '@/lib/store/useBlogStore';
import { Loader2, CheckCircle2, XCircle, Circle, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface GenerationStatusProps {
    isGeneratingOutline: boolean;
}

export function GenerationStatus({ isGeneratingOutline }: GenerationStatusProps) {
    const { post } = useBlogStore();
    const [isExpanded, setIsExpanded] = useState(true);

    const hasOutline = post.outline.length > 0;
    const isGeneratingContent = post.isGenerating;
    const sections = post.sections;

    // 현재 진행 중인 섹션 찾기
    const currentSection = sections.find(s => s.status === 'generating');
    const completedCount = sections.filter(s => s.status === 'completed').length;
    const errorCount = sections.filter(s => s.status === 'error').length;
    const totalCount = post.outline.length;

    // 아무 작업도 없으면 표시 안함
    if (!isGeneratingOutline && !isGeneratingContent && !hasOutline) {
        return null;
    }

    return (
        <div className="fixed bottom-4 right-4 z-50 w-80 bg-background border rounded-lg shadow-lg">
            {/* Header with toggle */}
            <div className="flex items-center justify-between p-4 pb-2">
                <h3 className="font-semibold text-sm">📝 글 생성 진행 상황</h3>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="h-6 w-6 p-0"
                >
                    {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                    ) : (
                        <ChevronUp className="h-4 w-4" />
                    )}
                </Button>
            </div>

            {/* Collapsed summary */}
            {!isExpanded && (
                <div className="px-4 pb-4">
                    <div className="text-xs text-muted-foreground">
                        {isGeneratingOutline ? '목차 생성 중...' : 
                         isGeneratingContent ? `본문 작성 중 (${completedCount}/${totalCount})` :
                         completedCount === totalCount && totalCount > 0 ? '✅ 완료' :
                         '대기 중'}
                    </div>
                </div>
            )}

            {/* Expanded content */}
            {isExpanded && (
                <div className="px-4 pb-4">
            
            {/* 목차 생성 상태 */}
            <div className="flex items-center gap-2 mb-2">
                {isGeneratingOutline ? (
                    <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                ) : hasOutline ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                    <Circle className="h-4 w-4 text-muted-foreground" />
                )}
                <span className={cn(
                    "text-sm",
                    isGeneratingOutline && "text-blue-500 font-medium",
                    hasOutline && !isGeneratingOutline && "text-muted-foreground"
                )}>
                    {isGeneratingOutline ? '목차 생성 중...' : hasOutline ? '목차 생성 완료' : '목차 대기 중'}
                </span>
            </div>

            {/* 섹션 생성 상태 */}
            {hasOutline && (
                <>
                    <div className="border-t my-2 pt-2">
                        <div className="flex items-center justify-between text-sm mb-2">
                            <span>본문 작성</span>
                            <span className="text-muted-foreground">
                                {completedCount}/{totalCount} 완료
                            </span>
                        </div>
                        
                        {/* 프로그레스 바 */}
                        <div className="w-full bg-muted rounded-full h-2 mb-3">
                            <div 
                                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
                            />
                        </div>

                        {/* 섹션 목록 */}
                        <div className="space-y-1 max-h-40 overflow-y-auto">
                            {post.outline.map((outline, idx) => {
                                const section = sections.find(s => s.sectionId === outline.id);
                                const status = section?.status || 'pending';
                                
                                return (
                                    <div key={outline.id} className="flex items-center gap-2 text-xs">
                                        {status === 'generating' ? (
                                            <Loader2 className="h-3 w-3 animate-spin text-blue-500 shrink-0" />
                                        ) : status === 'completed' ? (
                                            <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                                        ) : status === 'error' ? (
                                            <XCircle className="h-3 w-3 text-red-500 shrink-0" />
                                        ) : (
                                            <Circle className="h-3 w-3 text-muted-foreground shrink-0" />
                                        )}
                                        <span className={cn(
                                            "truncate",
                                            status === 'generating' && "text-blue-500 font-medium",
                                            status === 'completed' && "text-muted-foreground",
                                            status === 'error' && "text-red-500"
                                        )}>
                                            {idx + 1}. {outline.heading}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* 에러 표시 */}
                    {errorCount > 0 && (
                        <div className="mt-2 text-xs text-red-500">
                            ⚠️ {errorCount}개 섹션 생성 실패
                        </div>
                    )}

                    {/* 완료 메시지 */}
                    {completedCount === totalCount && totalCount > 0 && (
                        <div className="mt-2 text-xs text-green-600 font-medium">
                            ✅ 모든 섹션 작성 완료!
                        </div>
                    )}
                </>
            )}

            {/* 현재 작업 표시 */}
            {currentSection && (
                <div className="mt-2 pt-2 border-t text-xs text-blue-500">
                    ✍️ 작성 중: {post.outline.find(o => o.id === currentSection.sectionId)?.heading}
                </div>
            )}
                </div>
            )}
        </div>
    );
}
