'use client';

import * as React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, CheckCircle, Info, ExternalLink, RefreshCw, FileSearch } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface FactCheckIssue {
    claim: string;
    issue: string;
    suggestion: string;
    sources: string[];
    severity: 'high' | 'medium' | 'low';
}

interface FactCheckDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    issues: FactCheckIssue[];
    summary: string;
    isLoading: boolean;
    onRecheck: () => void;
    onStrictCheck: () => void;
    onCheckSection: (sectionId: number) => void;
    onApplySuggestion: (claim: string, suggestion: string) => Promise<void>;
    sections: Array<{ id: number; heading: string }>;
    feedback?: { type: 'success' | 'error'; message: string } | null;
}

export function FactCheckDialog({
    open,
    onOpenChange,
    issues,
    summary,
    isLoading,
    onRecheck,
    onStrictCheck,
    onCheckSection,
    onApplySuggestion,
    sections,
    feedback,
}: FactCheckDialogProps) {
    const getSeverityIcon = (severity: string) => {
        switch (severity) {
            case 'high':
                return <AlertTriangle className="h-5 w-5 text-red-500" />;
            case 'medium':
                return <Info className="h-5 w-5 text-yellow-500" />;
            case 'low':
                return <Info className="h-5 w-5 text-blue-500" />;
            default:
                return <Info className="h-5 w-5" />;
        }
    };

    const getSeverityBadge = (severity: string) => {
        switch (severity) {
            case 'high':
                return <Badge variant="destructive">높음</Badge>;
            case 'medium':
                return <Badge variant="outline" className="border-yellow-500 text-yellow-700">중간</Badge>;
            case 'low':
                return <Badge variant="outline" className="border-blue-500 text-blue-700">낮음</Badge>;
            default:
                return <Badge variant="outline">알 수 없음</Badge>;
        }
    };

    const [selectedSectionId, setSelectedSectionId] = React.useState<string>('');
    const [applyingIndex, setApplyingIndex] = React.useState<number | null>(null);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {isLoading ? (
                                <>
                                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                                    팩트체크 진행 중...
                                </>
                            ) : issues.length === 0 ? (
                                <>
                                    <CheckCircle className="h-5 w-5 text-green-500" />
                                    팩트체크 완료
                                </>
                            ) : (
                                <>
                                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                                    팩트체크 결과
                                </>
                            )}
                        </div>
                        {!isLoading && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onRecheck}
                                className="gap-2"
                            >
                                <RefreshCw className="h-4 w-4" />
                                다시 검증
                            </Button>
                        )}
                    </DialogTitle>
                    <DialogDescription>
                        {isLoading ? '글의 내용을 검증하고 있습니다...' : summary}
                    </DialogDescription>
                </DialogHeader>

                {!isLoading && (
                    <>
                        {/* Feedback message */}
                        {feedback && (
                            <div className={`mb-4 p-3 rounded-lg border ${
                                feedback.type === 'success' 
                                    ? 'bg-green-50 border-green-200 text-green-800' 
                                    : 'bg-red-50 border-red-200 text-red-800'
                            }`}>
                                <div className="flex items-center gap-2">
                                    {feedback.type === 'success' ? (
                                        <CheckCircle className="h-4 w-4" />
                                    ) : (
                                        <AlertTriangle className="h-4 w-4" />
                                    )}
                                    <span className="text-sm font-medium">{feedback.message}</span>
                                </div>
                            </div>
                        )}
                        
                        {/* Section-specific fact check */}
                        <div className="mb-3 p-3 border rounded-lg bg-muted/30">
                            <div className="flex items-center gap-3">
                                <FileSearch className="h-5 w-5 text-muted-foreground" />
                                <div className="flex-1">
                                    <p className="text-sm font-medium mb-2">특정 섹션 팩트체크</p>
                                    <div className="flex gap-2 mb-3">
                                        <Select value={selectedSectionId} onValueChange={setSelectedSectionId}>
                                            <SelectTrigger className="flex-1">
                                                <SelectValue placeholder="섹션 선택..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {sections.map((section) => (
                                                    <SelectItem key={section.id} value={section.id.toString()}>
                                                        {section.heading}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                if (selectedSectionId) {
                                                    onCheckSection(parseInt(selectedSectionId));
                                                }
                                            }}
                                            disabled={!selectedSectionId}
                                        >
                                            검증
                                        </Button>
                                    </div>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={onStrictCheck}
                                        className="w-full gap-2"
                                    >
                                        <AlertTriangle className="h-4 w-4" />
                                        강한 검증 (엄격 모드)
                                    </Button>
                                    <p className="text-xs text-muted-foreground mt-2">
                                        💡 모호한 표현, 과장, 논리적 비약까지 엄격하게 검증합니다
                                    </p>
                                </div>
                            </div>
                        </div>

                        <ScrollArea className="flex-1 overflow-auto pr-4">
                            {issues.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
                                    <p className="text-lg font-medium mb-2">검증 완료!</p>
                                    <p className="text-sm text-muted-foreground">
                                        중요한 팩트 오류가 발견되지 않았습니다.
                                    </p>
                                </div>
                            ) : (
                            <div className="space-y-4">
                                {issues.map((issue, index) => (
                                    <div
                                        key={index}
                                        className="border rounded-lg p-4 space-y-3 bg-card"
                                    >
                                        <div className="flex items-start gap-3">
                                            {getSeverityIcon(issue.severity)}
                                            <div className="flex-1 space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium">문제 {index + 1}</span>
                                                    {getSeverityBadge(issue.severity)}
                                                </div>
                                                
                                                <div className="space-y-2">
                                                    <div>
                                                        <p className="text-sm font-medium text-muted-foreground mb-1">
                                                            원문 내용:
                                                        </p>
                                                        <p className="text-sm bg-muted p-2 rounded whitespace-pre-wrap break-words max-h-32 overflow-y-auto overflow-wrap-anywhere">
                                                            "{issue.claim}"
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <p className="text-sm font-medium text-muted-foreground mb-1">
                                                            문제점:
                                                        </p>
                                                        <p className="text-sm text-red-600 whitespace-pre-wrap break-words overflow-wrap-anywhere">
                                                            {issue.issue}
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <div className="flex items-center justify-between mb-1">
                                                            <p className="text-sm font-medium text-muted-foreground">
                                                                수정 제안:
                                                            </p>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="h-7 text-xs shrink-0"
                                                                onClick={async () => {
                                                                    setApplyingIndex(index);
                                                                    try {
                                                                        await onApplySuggestion(issue.claim, issue.suggestion);
                                                                    } finally {
                                                                        setApplyingIndex(null);
                                                                    }
                                                                }}
                                                                disabled={applyingIndex === index}
                                                            >
                                                                {applyingIndex === index ? (
                                                                    <>
                                                                        <div className="h-3 w-3 mr-1 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                                                                        반영 중...
                                                                    </>
                                                                ) : (
                                                                    '수정 제안 반영하기'
                                                                )}
                                                            </Button>
                                                        </div>
                                                        <div className="text-sm text-green-700 bg-green-50 p-2 rounded whitespace-pre-wrap break-words max-h-48 overflow-y-auto overflow-wrap-anywhere">
                                                            {issue.suggestion}
                                                        </div>
                                                    </div>

                                                    {issue.sources && issue.sources.length > 0 && (
                                                        <div>
                                                            <p className="text-sm font-medium text-muted-foreground mb-1">
                                                                참고 자료:
                                                            </p>
                                                            <ul className="space-y-1">
                                                                {issue.sources.map((source, idx) => (
                                                                    <li key={idx}>
                                                                        <a
                                                                            href={source}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                                                                        >
                                                                            <ExternalLink className="h-3 w-3" />
                                                                            {source}
                                                                        </a>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        </ScrollArea>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
