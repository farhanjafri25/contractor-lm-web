'use client';

import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { MinusLarge, PaperPlane } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { aiApi } from '@/lib/api';

type Message = {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
};

const INITIAL_MESSAGES: Message[] = [
  {
    role: 'assistant',
    content:
      'Hi! I am Tenu-bot. I can tell you about your active, suspended, and expiring contractors. How can I help?',
  },
];

/* ─────────────────────────────────────────────────────────
 * CHATBOT MOTION STORYBOARD
 *
 * Read top-to-bottom. Each `at` value is ms after trigger.
 *
 *    0ms   shell begins expanding upward from the bottom bar
 *   40ms   backdrop fades in behind the active shell
 *  110ms   header chrome settles into view
 *  180ms   message region fades and slides into place
 * ───────────────────────────────────────────────────────── */

const TIMING = {
  shellExpand: 0, // shell starts expanding immediately
  backdropFade: 40, // backdrop follows the shell open
  headerReveal: 110, // header appears after expansion begins
  messagesReveal: 180, // message list appears last
};

const SHELL = {
  collapsedHeight: 48,
  composerHeight: 62,
  collapsedWidth: 384,
  openWidth: 480,
  desktopMaxHeight: 560,
  mobileMaxHeight: 640,
  desktopViewportOffset: 96,
  mobileViewportOffset: 16,
  transition: { type: 'spring' as const, stiffness: 320, damping: 32 },
};

const REVEAL = {
  offsetY: 10,
  transition: { duration: 0.18, ease: 'easeOut' as const },
};

const BACKDROP = {
  duration: 0.18,
  ease: 'easeOut' as const,
};

export function TenuBotWidget() {
  const prefersReducedMotion = useReducedMotion();
  const [isOpen, setIsOpen] = useState(false);
  const [stage, setStage] = useState(0);
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });

  const composerInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef(false);

  const visibleMessages = messages.filter((message) => message.role !== 'system' && message.role !== 'tool');
  const hasStartedConversation = messages.some((message) => message.role === 'user');
  const isSendDisabled = !isOpen || !input.trim() || isLoading;
  const isMobile = viewport.width > 0 ? viewport.width < 768 : false;
  const viewportHeight = viewport.height > 0 ? viewport.height : 900;
  const availableHeight = isMobile
    ? Math.max(viewportHeight - SHELL.mobileViewportOffset, SHELL.composerHeight)
    : Math.max(viewportHeight - SHELL.desktopViewportOffset, SHELL.composerHeight);
  const openHeight = isMobile
    ? Math.min(availableHeight, SHELL.mobileMaxHeight)
    : Math.min(availableHeight, SHELL.desktopMaxHeight);
  const shellHeight = isOpen ? openHeight : SHELL.collapsedHeight;
  const topRegionHeight = Math.max(openHeight - SHELL.composerHeight, 0);

  useEffect(() => {
    const updateViewport = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    };

    updateViewport();
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setStage(0);
      return;
    }

    setStage(1);
    const headerTimer = window.setTimeout(() => setStage(2), TIMING.headerReveal);
    const messagesTimer = window.setTimeout(() => setStage(3), TIMING.messagesReveal);

    return () => {
      window.clearTimeout(headerTimer);
      window.clearTimeout(messagesTimer);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    messagesEndRef.current?.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    });
  }, [isOpen, messages, prefersReducedMotion]);

  useEffect(() => {
    if (!isOpen) return;

    const frame = requestAnimationFrame(() => {
      composerInputRef.current?.focus();
    });

    return () => cancelAnimationFrame(frame);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen || !returnFocusRef.current) return;

    const frame = requestAnimationFrame(() => {
      composerInputRef.current?.focus();
      returnFocusRef.current = false;
    });

    return () => cancelAnimationFrame(frame);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;

      event.preventDefault();
      closePanel();
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const openPanel = () => {
    setIsOpen(true);
  };

  const closePanel = () => {
    returnFocusRef.current = true;
    setIsOpen(false);
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = { role: 'user', content: input };
    const newMessages = [...messages, userMsg];

    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await aiApi.chat(newMessages);
      const assistantMsg: Message = response.data;

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (error) {
      console.error('AI Chat Error:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error connecting to my brain! Please try again later.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const shellTransition = prefersReducedMotion
    ? { duration: BACKDROP.duration }
    : { ...SHELL.transition, delay: TIMING.shellExpand / 1000 };

  const revealTransition = prefersReducedMotion
    ? { duration: 0.12 }
    : REVEAL.transition;

  return (
    <div className="pointer-events-none fixed inset-0 z-50">
      <motion.button
        type="button"
        aria-label="Close Tenu-Bot"
        className={`fixed inset-0 bg-foreground/12 backdrop-blur-[2px] ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
        initial={false}
        animate={{ opacity: isOpen ? 1 : 0 }}
        transition={{
          duration: BACKDROP.duration,
          ease: BACKDROP.ease,
          delay: isOpen ? TIMING.backdropFade / 1000 : 0,
        }}
        onClick={closePanel}
      />

      <div className="absolute inset-x-0 bottom-0 flex justify-center px-2 pb-2 md:px-6 md:pb-6">
        <motion.section
          aria-label="Tenu-Bot assistant"
          initial={false}
          animate={{
            height: shellHeight,
            maxWidth: isOpen ? SHELL.openWidth : SHELL.collapsedWidth,
          }}
          transition={shellTransition}
          className="card-surface relative isolate pointer-events-auto flex w-full flex-col overflow-hidden rounded-[14px] bg-background/95 backdrop-blur-xl md:rounded-[16px]"
        >
          <div
            className={`pointer-events-none absolute left-1/2 top-0 z-0 h-48 w-[140%] -translate-x-1/2 -translate-y-[34%] bg-center bg-cover bg-no-repeat transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
            style={{ backgroundImage: "url('/gradient-blur.svg')" }}
            aria-hidden="true"
          />
          <motion.div
            initial={false}
            animate={{ height: stage >= 1 ? topRegionHeight : 0 }}
            transition={shellTransition}
            className={isOpen ? "overflow-visible" : "overflow-hidden"}
          >
            <div className="relative z-10 flex h-full min-h-0 flex-col">
              <div className="px-[2px] pt-[2px] pb-0">
                <motion.div
                  initial={false}
                  animate={{
                    opacity: stage >= 2 ? 1 : 0,
                    y: stage >= 2 || prefersReducedMotion ? 0 : REVEAL.offsetY,
                  }}
                  transition={{
                    ...revealTransition,
                    delay: isOpen && !prefersReducedMotion ? TIMING.headerReveal / 1000 : 0,
                  }}
                  className="relative rounded-[12px] px-4 pt-3 pb-2 text-foreground"
                >
                  <div className="relative z-10 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <h3 className="truncate text-[15px] font-semibold tracking-[-0.01em] text-foreground">
                          Tenurio AI
                        </h3>
                        <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-foreground/55">
                          Beta
                        </span>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 rounded-[10px] text-foreground/72 hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10"
                      onClick={closePanel}
                      aria-label="Minimize Tenurio AI"
                    >
                      <MinusLarge size={16} />
                    </Button>
                  </div>
                  {!hasStartedConversation ? (
                    <p className="relative z-10 mt-0.5 max-w-[24rem] text-xs leading-5 text-foreground/68">
                      Ask about active, suspended, and expiring contractors without leaving the page.
                    </p>
                  ) : null}
                </motion.div>
              </div>

              <motion.div
                initial={false}
                animate={{
                  opacity: stage >= 3 ? 1 : 0,
                  y: stage >= 3 || prefersReducedMotion ? 0 : REVEAL.offsetY,
                }}
                transition={{
                  ...revealTransition,
                  delay: isOpen && !prefersReducedMotion ? TIMING.messagesReveal / 1000 : 0,
                }}
                className="flex-1 overflow-y-auto px-3 py-3 scroll-pb-4 [-webkit-mask-image:linear-gradient(to_bottom,transparent_0%,rgba(0,0,0,0.22)_10px,black_34px,black_100%)] [mask-image:linear-gradient(to_bottom,transparent_0%,rgba(0,0,0,0.22)_10px,black_34px,black_100%)]"
              >
                <div className="space-y-4">
                  {visibleMessages.map((message, index) => (
                    <div
                      key={`${message.role}-${index}`}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[86%] space-y-2 rounded-[18px] border-[0.5px] border-black/8 px-3 py-2.5 text-sm shadow-xs dark:border-white/8 [&>p]:leading-relaxed [&>ul]:list-disc [&>ul]:pl-4 [&>ol]:list-decimal [&>ol]:pl-4 [&_strong]:font-semibold ${
                          message.role === 'user'
                            ? 'rounded-br-md bg-primary text-primary-foreground'
                            : 'rounded-bl-md bg-background/92 text-foreground dark:bg-input/45'
                        }`}
                      >
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      </div>
                    </div>
                  ))}

                  {isLoading ? (
                    <div className="flex justify-start">
                      <div
                        className="flex items-center gap-3 rounded-[18px] rounded-bl-md border-[0.5px] border-black/8 bg-background/92 px-3 py-2.5 text-sm shadow-xs dark:border-white/8 dark:bg-input/45"
                      >
                        <div className="flex gap-1">
                          <div className="size-2 rounded-full bg-muted-foreground/45 animate-bounce" />
                          <div className="size-2 rounded-full bg-muted-foreground/45 animate-bounce [animation-delay:0.15s]" />
                          <div className="size-2 rounded-full bg-muted-foreground/45 animate-bounce [animation-delay:0.3s]" />
                        </div>
                        <span className="text-xs text-muted-foreground">Thinking through your request...</span>
                      </div>
                    </div>
                  ) : null}

                  <div ref={messagesEndRef} />
                </div>
              </motion.div>
            </div>
          </motion.div>

          <div className={`relative z-10 bg-background ${isOpen ? 'px-2 pt-0.5 pb-2' : 'flex flex-1 flex-col justify-end p-0'}`}>
            <div
              className={`border border-border/70 bg-background ${isOpen ? 'flex items-end gap-2 rounded-[12px] p-1.5' : 'flex h-full items-center gap-2 rounded-[10px] py-px pr-[3px] pl-px'}`}
              onPointerDownCapture={() => {
                if (!isOpen) {
                  openPanel();
                }
              }}
            >
              <input
                ref={composerInputRef}
                type="text"
                value={input}
                readOnly={!isOpen}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (!isOpen) {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      openPanel();
                      return;
                    }

                    if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
                      event.preventDefault();
                      setInput(event.key);
                      openPanel();
                    }
                    return;
                  }
                  if (event.key !== 'Enter') return;

                  event.preventDefault();
                  void handleSend();
                }}
                placeholder="Ask me about contractors..."
                className={`bg-transparent text-left text-sm text-foreground outline-none placeholder:text-muted-foreground ${isOpen ? 'min-h-9 flex-1 px-3 py-1.5' : 'h-full min-h-0 flex-1 px-3 py-0'}`}
                aria-label="Ask Tenu-Bot about contractors"
                disabled={isLoading}
              />

              <Button
                type="button"
                onClick={() => {
                  if (!isOpen) {
                    openPanel();
                    return;
                  }

                  void handleSend();
                }}
                disabled={isSendDisabled}
                tabIndex={isOpen ? 0 : -1}
                aria-hidden={!isOpen}
                size="icon"
                className="size-10 rounded-[10px] disabled:border-transparent disabled:bg-primary/12 disabled:text-primary-foreground/45 disabled:opacity-100 disabled:shadow-none disabled:ring-0"
              >
                <PaperPlane
                  size={16}
                  className={isSendDisabled ? 'text-primary-foreground/70' : ''}
                />
              </Button>
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  );
}
