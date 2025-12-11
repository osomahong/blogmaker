'use client';

import { cn } from '@/lib/utils';
import { Message } from '@/types/blog';

interface ChatMessageProps {
    message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
    const isUser = message.role === 'user';

    return (
        <div
            className={cn(
                'flex w-full mb-4',
                isUser ? 'justify-end' : 'justify-start'
            )}
        >
            <div
                className={cn(
                    'max-w-[80%] rounded-2xl px-4 py-3',
                    isUser
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : 'bg-muted text-foreground rounded-bl-md'
                )}
            >
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                    {message.content}
                </p>
            </div>
        </div>
    );
}
