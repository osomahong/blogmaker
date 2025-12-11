'use client';

import { useState } from 'react';
import { WritingStyleType } from '@/types/blog';
import { WRITING_STYLES } from '@/lib/config/writingStyles';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';

interface StyleSelectorProps {
  onStyleSelect: (style: WritingStyleType) => void;
}

export function StyleSelector({ onStyleSelect }: StyleSelectorProps) {
  const [selectedStyle, setSelectedStyle] = useState<WritingStyleType | null>(null);

  const handleStyleClick = (styleId: WritingStyleType) => {
    setSelectedStyle(styleId);
  };

  const handleConfirm = () => {
    if (selectedStyle) {
      onStyleSelect(selectedStyle);
    }
  };

  const handleSkip = () => {
    onStyleSelect('DEFAULT');
  };

  const styles = Object.values(WRITING_STYLES);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
      <div className="max-w-3xl w-full space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">글 작성 스타일을 선택해주세요</h2>
          <p className="text-muted-foreground">
            원하는 스타일을 선택하면 해당 톤으로 블로그 글이 생성됩니다
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {styles.map((style) => (
            <Card
              key={style.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedStyle === style.id
                  ? 'ring-2 ring-primary border-primary'
                  : ''
              }`}
              onClick={() => handleStyleClick(style.id)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{style.name}</CardTitle>
                    <CardDescription className="mt-2">
                      {style.description}
                    </CardDescription>
                  </div>
                  {selectedStyle === style.id && (
                    <div className="ml-2 flex-shrink-0">
                      <div className="rounded-full bg-primary p-1">
                        <Check className="h-4 w-4 text-primary-foreground" />
                      </div>
                    </div>
                  )}
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>

        <div className="flex gap-3 justify-center pt-4">
          <Button
            variant="outline"
            onClick={handleSkip}
            className="min-w-[120px]"
          >
            건너뛰기
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedStyle}
            className="min-w-[120px]"
          >
            선택 완료
          </Button>
        </div>
      </div>
    </div>
  );
}
