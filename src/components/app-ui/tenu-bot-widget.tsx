'use client';

import { useState, useRef, useEffect } from 'react';
import { aiApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import ReactMarkdown from 'react-markdown';

type Message = {
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string;
};

export function TenuBotWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { role: 'assistant', content: 'Hi! I am Tenu-bot. I can tell you about your active, suspended, and expiring contractors. How can I help?' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isOpen]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMsg: Message = { role: 'user', content: input };
        const newMessages = [...messages, userMsg];
        
        setMessages(newMessages);
        setInput('');
        setIsLoading(true);

        try {
            // We only send user and assistant messages to the backend to keep it clean,
            // or we can send the whole array so the backend has context.
            const response = await aiApi.chat(newMessages);
            const assistantMsg: Message = response.data;
            
            setMessages((prev) => [...prev, assistantMsg]);
        } catch (error) {
            console.error('AI Chat Error:', error);
            setMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error connecting to my brain! Please try again later.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
            {isOpen && (
                <div className="w-80 md:w-96 h-[500px] max-h-[80vh] bg-background border rounded-2xl shadow-2xl mb-4 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5">
                    {/* Header */}
                    <div className="bg-primary px-4 py-3 flex justify-between items-center">
                        <div>
                            <h3 className="text-primary-foreground font-semibold">Tenu-Bot</h3>
                            <p className="text-primary-foreground/80 text-xs">AI Assistant (Beta)</p>
                        </div>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-primary-foreground hover:bg-primary-foreground/20 rounded-full h-8 w-8"
                            onClick={() => setIsOpen(false)}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                        </Button>
                    </div>
                    
                    {/* Chat Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/30">
                        {messages.filter(m => m.role !== 'system' && m.role !== 'tool').map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div 
                                    className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm space-y-2 [&>p]:leading-relaxed [&>ul]:list-disc [&>ul]:pl-4 [&>ol]:list-decimal [&>ol]:pl-4 [&_strong]:font-semibold ${
                                        msg.role === 'user' 
                                        ? 'bg-primary text-primary-foreground rounded-br-sm' 
                                        : 'bg-background border shadow-sm rounded-bl-sm text-foreground'
                                    }`}
                                >
                                    <ReactMarkdown>
                                        {msg.content}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        ))}
                        
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-background border shadow-sm rounded-2xl rounded-bl-sm px-4 py-3 text-sm flex items-center space-x-2">
                                    <div className="flex space-x-1">
                                        <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" />
                                        <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:0.2s]" />
                                        <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:0.4s]" />
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-3 bg-background border-t flex items-center gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Ask me about contractors..."
                            className="flex-1 bg-muted rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                            disabled={isLoading}
                        />
                        <Button 
                            onClick={handleSend} 
                            disabled={!input.trim() || isLoading}
                            size="icon"
                            className="rounded-full h-10 w-10 shrink-0"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
                        </Button>
                    </div>
                </div>
            )}

            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="h-14 w-14 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center hover:scale-105 transition-transform active:scale-95"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
                    </svg>
                </button>
            )}
        </div>
    );
}
