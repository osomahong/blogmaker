'use client';

import { useState } from 'react';
import { ChatContainer } from '@/components/chat/ChatContainer';
import { EditorContainer } from '@/components/editor/EditorContainer';
import { StyleSelector } from '@/components/chat/StyleSelector';
import TokenUsageBar from '@/components/TokenUsageBar';
import { useBlogStore } from '@/lib/store/useBlogStore';
import { Button } from '@/components/ui/button';
import { PenLine, RotateCcw } from 'lucide-react';
import { WritingStyleType } from '@/types/blog';

type ViewMode = 'interview' | 'style-selection' | 'editor';

export default function Home() {
  const [viewMode, setViewMode] = useState<ViewMode>('interview');
  const { interview, reset, setContext } = useBlogStore();

  const handleInterviewComplete = () => {
    setViewMode('style-selection');
  };

  const handleStyleSelect = (style: WritingStyleType) => {
    setContext({ writingStyle: style });
    setViewMode('editor');
  };

  const handleBackToInterview = () => {
    setViewMode('interview');
  };

  const handleReset = () => {
    if (confirm('모든 진행 상황이 초기화됩니다. 계속하시겠습니까?')) {
      reset();
      setViewMode('interview');
    }
  };

  // If interview is already complete and we're in interview mode, show option to go to style selection
  const showStyleSelectionOption = interview.isComplete && viewMode === 'interview';

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b bg-card">
        <div className="flex items-center gap-3">
          <PenLine className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold">BlogMaker Agent</h1>
        </div>

        <div className="flex items-center gap-2">
          {showStyleSelectionOption && (
            <Button onClick={() => setViewMode('style-selection')} variant="outline" size="sm">
              스타일 선택으로 이동
            </Button>
          )}
          <Button onClick={handleReset} variant="ghost" size="sm">
            <RotateCcw className="h-4 w-4 mr-2" />
            처음부터
          </Button>
        </div>
      </header>

      {/* Token Usage Bar */}
      <TokenUsageBar />

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        {viewMode === 'interview' ? (
          <ChatContainer onInterviewComplete={handleInterviewComplete} />
        ) : viewMode === 'style-selection' ? (
          <StyleSelector onStyleSelect={handleStyleSelect} />
        ) : (
          <EditorContainer onBack={handleBackToInterview} />
        )}
      </main>
    </div>
  );
}
