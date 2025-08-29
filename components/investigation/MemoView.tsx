import React, { useRef, useEffect } from 'react';
import type { InvestigationMessage } from '../../types';

interface MemoViewProps {
  messages: InvestigationMessage[];
  onSendReply: (reply: string) => void;
}

export const MemoView: React.FC<MemoViewProps> = ({ messages, onSendReply }) => {
    const endOfMessagesRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);
    
    const lastMessage = messages[messages.length - 1];
    const playerChoices = lastMessage?.sender === 'contact' ? lastMessage.choices : [];

    return (
        <div className="flex flex-col h-full">
            <div className="flex-grow overflow-y-auto pr-2 space-y-4">
                {messages.map(msg => (
                    <div key={msg.id} className={`flex flex-col animate-fade-in ${
                        msg.sender === 'player' ? 'items-end' : 'items-start'
                    }`}>
                        <div className={`rounded-lg p-3 max-w-sm md:max-w-md ${
                            msg.sender === 'player' ? 'bg-blue-800' :
                            msg.sender === 'system' ? 'bg-gray-600' : 'bg-gray-700'
                        }`}>
                            {msg.sender === 'contact' && <p className="font-bold text-sm text-[--color-accent]">{msg.contactName}</p>}
                            <p className="text-white whitespace-pre-wrap">{msg.text}</p>
                        </div>
                    </div>
                ))}
                <div ref={endOfMessagesRef} />
            </div>
            {playerChoices && playerChoices.length > 0 && (
                <div className="mt-4 pt-4 border-t-2 border-gray-700">
                    <p className="text-center font-bold text-gray-400 mb-2">Vos options de réponse :</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {playerChoices.map((choice, index) => (
                            <button
                                key={index}
                                onClick={() => onSendReply(choice)}
                                className="p-3 bg-[--color-primary] text-white rounded-lg hover:bg-opacity-80 transition-colors"
                            >
                                {choice}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
