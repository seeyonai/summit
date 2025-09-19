import { useState, useCallback } from 'react';
import { apiService } from '@/services/api';

interface UseTodoAdviceReturn {
  adviceById: Record<string, string>;
  loadingById: Record<string, boolean>;
  selectedTodoId: string | null;
  generateAdvice: (meetingId: string, todoId: string, todoText: string) => Promise<void>;
  setSelectedTodoId: (id: string | null) => void;
  clearAdvice: (todoId: string) => void;
}

export function useTodoAdvice(): UseTodoAdviceReturn {
  const [adviceById, setAdviceById] = useState<Record<string, string>>({});
  const [loadingById, setLoadingById] = useState<Record<string, boolean>>({});
  const [selectedTodoId, setSelectedTodoId] = useState<string | null>(null);

  const generateAdvice = useCallback(async (
    meetingId: string,
    todoId: string,
    todoText: string
  ) => {
    if (!todoId || !meetingId) return;

    try {
      setLoadingById(prev => ({ ...prev, [todoId]: true }));
      
      const response = await apiService.generateTodoAdvice(meetingId, todoText);
      const advice = response.advice;
      
      setAdviceById(prev => ({ ...prev, [todoId]: advice }));
      setSelectedTodoId(todoId);
    } catch (error) {
      console.error('Failed to generate AI advice:', error);
      setAdviceById(prev => ({ 
        ...prev, 
        [todoId]: '生成建议时出错，请稍后重试。' 
      }));
      setSelectedTodoId(todoId);
    } finally {
      setLoadingById(prev => ({ ...prev, [todoId]: false }));
    }
  }, []);

  const clearAdvice = useCallback((todoId: string) => {
    setAdviceById(prev => {
      const newAdvices = { ...prev };
      delete newAdvices[todoId];
      return newAdvices;
    });
    setLoadingById(prev => {
      const newLoading = { ...prev };
      delete newLoading[todoId];
      return newLoading;
    });
  }, []);

  return {
    adviceById,
    loadingById,
    selectedTodoId,
    generateAdvice,
    setSelectedTodoId,
    clearAdvice,
  };
}
