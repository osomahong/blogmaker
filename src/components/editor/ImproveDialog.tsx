'use client';

import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ImprovedSection {
    heading: string;
    content: string;
    changes: string;
}

interface ImproveDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onApply: (sections: ImprovedSection[]) => void;
    isLoading: boolean;
    onImprove: (instruction?: string) => void;
    improvedSections: ImprovedSection[] | null;
}

export function ImproveDialog({
    open,
    onOpenChange,
    onApply,
    isLoading,
    onImprove,
    improvedSections,
}: ImproveDialogProps) {
    const [instruction, setInstruction] = useState('');
    const [showPreview, setShowPreview] = useState(false);

    const handleImprove = () => {
        setShowPreview(true);
        onImprove(instruction || undefined);
    };

    const handleApply = () => {
        if (improvedSections) {
            onApply(improvedSections);
            onOpenChange(false);
            setShowPreview(false);
            setInstruction('');
        }
    };

    const handleClose = () => {
        onOpenChange(false);
        setShowPreview(false);
        setInstruction('');
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        AI 글 개선
                    </DialogTitle>
                    <DialogDescription>
                        전체 글의 맥락을 분석하여 중복 제거, 흐름 개선, 가독성 향상을 수행합니다.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-hidden flex flex-col gap-4">
                    {!showPreview ? (
                        <>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">
                                    추가 요청사항 (선택)
                                </label>
                                <Textarea
                                    placeholder="예: 더 전문적인 톤으로 수정해주세요&#10;예: 문장을 더 짧게 만들어주세요&#10;예: 이모지를 더 추가해주세요"
                                    value={instruction}
                                    onChange={(e) => setInstruction(e.target.value)}
                                    rows={4}
                                    className="resize-none"
                                />
                            </div>

                            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                                <h4 className="font-medium text-sm">자동으로 수행되는 작업:</h4>
                                <ul className="text-sm text-muted-foreground space-y-1">
                                    <li>✓ 중복되는 내용 제거 및 통합</li>
                                    <li>✓ 섹션 간 연결성 강화</li>
                                    <li>✓ 불필요한 반복 표현 제거</li>
                                    <li>✓ 전체적인 흐름 개선</li>
                                    <li>✓ 가독성 향상</li>
                                </ul>
                            </div>

                            <div className="flex gap-2 justify-end">
                                <Button variant="outline" onClick={handleClose}>
                                    취소
                                </Button>
                                <Button onClick={handleImprove} disabled={isLoading}>
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            분석 중...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="h-4 w-4 mr-2" />
                                            개선 시작
                                        </>
                                    )}
                                </Button>
                            </div>
                        </>
                    ) : (
                        <>
                            {isLoading ? (
                                <div className="flex-1 flex items-center justify-center">
                                    <div className="text-center space-y-4">
                                        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                                        <div>
                                            <p className="font-medium">AI가 글을 분석하고 있습니다...</p>
                                            <p className="text-sm text-muted-foreground mt-2">
                                                전체 맥락을 파악하고 개선점을 찾는 중입니다.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ) : improvedSections ? (
                                <>
                                    <ScrollArea className="flex-1 pr-4">
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2 text-green-600 bg-green-50 dark:bg-green-950 p-3 rounded-lg">
                                                <CheckCircle2 className="h-5 w-5" />
                                                <span className="font-medium">
                                                    {improvedSections.length}개 섹션 개선 완료
                                                </span>
                                            </div>

                                            {improvedSections.map((section, idx) => (
                                                <Card key={idx}>
                                                    <CardHeader className="pb-3">
                                                        <CardTitle className="text-base">
                                                            {section.heading}
                                                        </CardTitle>
                                                        {section.changes && (
                                                            <p className="text-sm text-muted-foreground mt-1">
                                                                📝 {section.changes}
                                                            </p>
                                                        )}
                                                    </CardHeader>
                                                    <CardContent>
                                                        <div className="text-sm whitespace-pre-wrap bg-muted/30 p-3 rounded">
                                                            {section.content}
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>
                                    </ScrollArea>

                                    <div className="flex gap-2 justify-end border-t pt-4">
                                        <Button variant="outline" onClick={handleClose}>
                                            취소
                                        </Button>
                                        <Button onClick={handleApply}>
                                            <CheckCircle2 className="h-4 w-4 mr-2" />
                                            개선 내용 적용
                                        </Button>
                                    </div>
                                </>
                            ) : (
                                <div className="flex-1 flex items-center justify-center">
                                    <div className="text-center space-y-4">
                                        <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
                                        <div>
                                            <p className="font-medium">개선 중 오류가 발생했습니다</p>
                                            <p className="text-sm text-muted-foreground mt-2">
                                                다시 시도해주세요.
                                            </p>
                                        </div>
                                        <Button onClick={() => setShowPreview(false)}>
                                            다시 시도
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
