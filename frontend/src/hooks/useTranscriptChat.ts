import { useState, useRef, useCallback, useEffect } from 'react';
import { apiUrl } from '@/services/api';
import { toast } from 'sonner';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function useTranscriptChat(meetingId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isWaitingForFirstToken, setIsWaitingForFirstToken] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchSuggestedQuestions = useCallback(async () => {
    setIsLoadingQuestions(true);
    try {
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(apiUrl(`/api/meetings/${meetingId}/chat/suggested-questions`), {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error('Failed to fetch suggested questions');
      }

      const data = await response.json();
      if (data.success && Array.isArray(data.questions)) {
        setSuggestedQuestions(data.questions);
      }
    } catch (error) {
      console.error('Failed to load suggested questions:', error);
      setSuggestedQuestions([
        '这次会议的主要结论是什么？',
        '有哪些行动项需要跟进？',
        '会议中讨论的关键争议是什么？',
        '谁是主要的发言人？',
        '总结一下会议的主要内容',
        '有哪些重要的决策？'
      ]);
    } finally {
      setIsLoadingQuestions(false);
    }
  }, [meetingId]);

  useEffect(() => {
    fetchSuggestedQuestions();
  }, [fetchSuggestedQuestions]);

  const sendMessage = useCallback(async (content: string) => {
    const userMessage: Message = { role: 'user', content };
    setMessages((prev) => [...prev, userMessage]);
    setIsWaitingForFirstToken(true);
    setIsStreaming(true);
    setStreamingContent('');

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(apiUrl(`/api/meetings/${meetingId}/chat`), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: content,
          history: messages,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || errorData.error || errorData.message || 'Chat request failed';
        toast.error(errorMessage);
        setIsWaitingForFirstToken(false);
        setIsStreaming(false);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        toast.error('Failed to read response stream');
        setIsWaitingForFirstToken(false);
        setIsStreaming(false);
        return;
      }

      const decoder = new TextDecoder();
      let accumulatedContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              break;
            }

            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                accumulatedContent += parsed.content;
                console.log('[Chat Stream] Accumulated:', accumulatedContent.length, 'chars');
                setStreamingContent(accumulatedContent);
                if (isWaitingForFirstToken) {
                  setIsWaitingForFirstToken(false);
                }
              }
            } catch (e) {
              console.error('Failed to parse SSE data:', e);
            }
          }
        }
      }

      if (accumulatedContent) {
        const assistantMessage: Message = { role: 'assistant', content: accumulatedContent };
        setMessages((prev) => [...prev, assistantMessage]);
      }

      setStreamingContent('');
      setIsWaitingForFirstToken(false);
      setIsStreaming(false);
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Chat error:', error);
        toast.error('发送消息失败');
      }
      setIsWaitingForFirstToken(false);
      setIsStreaming(false);
      setStreamingContent('');
  } finally {
      abortControllerRef.current = null;
    }
  }, [meetingId, messages, isWaitingForFirstToken]);

  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (streamingContent) {
      const assistantMessage: Message = { role: 'assistant', content: streamingContent };
      setMessages((prev) => [...prev, assistantMessage]);
    }
    setStreamingContent('');
    setIsWaitingForFirstToken(false);
    setIsStreaming(false);
  }, [streamingContent]);

  const clearHistory = useCallback(() => {
    setMessages([]);
    setStreamingContent('');
    setIsWaitingForFirstToken(false);
    setIsStreaming(false);
  }, []);

  const regenerateLastMessage = useCallback(() => {
    if (messages.length < 2) return;
    
    // Find the last user message (reverse iteration)
    let lastUserMessageIndex = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        lastUserMessageIndex = i;
        break;
      }
    }
    
    if (lastUserMessageIndex === -1) return;

    const lastUserMessage = messages[lastUserMessageIndex];
    
    // Remove messages after the last user message
    setMessages(prev => prev.slice(0, lastUserMessageIndex + 1));
    
    // Resend the last user message
    sendMessage(lastUserMessage.content);
  }, [messages, sendMessage]);

  return {
    messages,
    isStreaming,
    isWaitingForFirstToken,
    streamingContent,
    suggestedQuestions,
    isLoadingQuestions,
    sendMessage,
    stopStreaming,
    clearHistory,
    regenerateLastMessage,
    refreshSuggestedQuestions: fetchSuggestedQuestions,
  };
}
