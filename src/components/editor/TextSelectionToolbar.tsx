'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, Edit3, Check, X, Trash2 } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

interface TextSelectionToolbarProps {
    selectedText: string;
    position: { x: number; y: number } | null;
    onRefine: (instruction: string) => Promise<void>;
    onDirectEdit: (newText: string) => void;
    onDelete: () => void;
    onClose: () => void;
}

export function TextSelectionToolbar({
    selectedText,
    position,
    onRefine,
    onDirectEdit,
    onDelete,
    onClose,
}: TextSelectionToolbarProps) {
    const [showDialog, setShowDialog] = useState(false);
    const [instruction, setInstruction] = useState('');
    const [isRefining, setIsRefining] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState('');

    useEffect(() => {
        if (!position) {
            setShowDialog(false);
            setInstruction('');
            setIsEditing(false);
            setEditText('');
        }
    }, [position]);

    if (!position || !selectedText) return null;

    const handleRefineClick = () => {
        setShowDialog(true);
    };

    const handleDirectEditClick = () => {
        setEditText(selectedText);
        setIsEditing(true);
    };

    const handleSaveEdit = () => {
        if (editText !== selectedText) {
            onDirectEdit(editText);
        }
        setIsEditing(false);
        setEditText('');
        onClose();
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditText('');
    };

    const handleDelete = () => {
        onDelete();
        onClose();
    };

    const handleSubmit = async () => {
        if (!instruction.trim()) return;

        setIsRefining(true);
        try {
            await onRefine(instruction);
            setShowDialog(false);
            setInstruction('');
            onClose();
        } catch (error) {
            console.error('Refine error:', error);
        } finally {
            setIsRefining(false);
        }
    };

    const quickActions = [
        '농담 제거',
        '존댓말로 변경',
        '반말로 변경',
        '더 자세하게',
        '더 간결하게',
    ];

    return (
        <>
            {/* Floating toolbar or inline editor */}
            {!isEditing ? (
                <div
                    className="fixed z-50 bg-background border rounded-lg shadow-lg p-1 flex gap-1"
                    style={{
                        left: `${position.x}px`,
                        top: `${position.y - 50}px`,
                    }}
                >
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleRefineClick}
                        className="gap-1"
                    >
                        <Sparkles className="h-3 w-3" />
                        AI 수정
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleDirectEditClick}
                        className="gap-1"
                    >
                        <Edit3 className="h-3 w-3" />
                        직접 수정
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleDelete}
                        className="gap-1 text-destructive hover:text-destructive"
                    >
                        <Trash2 className="h-3 w-3" />
                        삭제
                    </Button>
                </div>
            ) : (
                <div
                    className="fixed z-50 bg-background border rounded-lg shadow-lg p-2"
                    style={{
                        left: `${position.x - 150}px`,
                        top: `${position.y - 80}px`,
                        width: '300px',
                    }}
                >
                    <Textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="min-h-[80px] mb-2"
                        autoFocus
                    />
                    <div className="flex justify-end gap-1">
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleCancelEdit}
                        >
                            <X className="h-3 w-3" />
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleSaveEdit}
                        >
                            <Check className="h-3 w-3" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Refine dialog */}
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>텍스트 수정 요청</DialogTitle>
                        <DialogDescription>
                            선택한 텍스트를 어떻게 수정할까요?
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        {/* Selected text preview */}
                        <div className="p-3 bg-muted rounded-md text-sm max-h-32 overflow-y-auto">
                            <p className="text-muted-foreground text-xs mb-1">선택된 텍스트:</p>
                            <p className="line-clamp-4">{selectedText}</p>
                        </div>

                        {/* Quick actions */}
                        <div>
                            <p className="text-sm text-muted-foreground mb-2">빠른 수정:</p>
                            <div className="flex flex-wrap gap-2">
                                {quickActions.map((action) => (
                                    <Button
                                        key={action}
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setInstruction(action)}
                                        className="text-xs"
                                    >
                                        {action}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        {/* Custom instruction */}
                        <div>
                            <p className="text-sm text-muted-foreground mb-2">또는 직접 입력:</p>
                            <Textarea
                                value={instruction}
                                onChange={(e) => setInstruction(e.target.value)}
                                placeholder="예: 더 전문적인 톤으로 변경해줘"
                                className="min-h-[80px]"
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setShowDialog(false)}
                                disabled={isRefining}
                            >
                                취소
                            </Button>
                            <Button
                                onClick={handleSubmit}
                                disabled={!instruction.trim() || isRefining}
                            >
                                {isRefining && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                수정하기
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
