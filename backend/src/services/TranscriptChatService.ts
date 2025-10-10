import OpenAI from 'openai';
import { internal } from '../utils/errors';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

class TranscriptChatService {
  private client: OpenAI | null = null;
  private isInitialized = false;

  async initialize() {
    if (this.isInitialized) return;

    const apiKey = process.env.SUMMIT_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    const baseURL = process.env.SUMMIT_OPENAI_BASE_URL || process.env.OPENAI_BASE_URL;

    if (!apiKey) {
      throw internal(
        'SUMMIT_OPENAI_API_KEY or OPENAI_API_KEY environment variable is required',
        'chat.api_key_missing'
      );
    }

    this.client = new OpenAI({
      apiKey,
      baseURL,
    });

    this.isInitialized = true;
  }

  async generateSuggestedQuestions(transcript: string, meetingTitle?: string): Promise<string[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.client) {
      throw internal('Chat service not initialized', 'chat.not_initialized');
    }

    const prompt = `根据以下会议记录，生成 3-5 个最相关和有价值的问题，帮助用户快速了解会议内容。

会议标题：${meetingTitle || '未知'}

会议记录摘录：
${transcript.slice(0, 8000)}${transcript.length > 8000 ? '...' : ''}

要求：
1. 问题要具体、针对这次会议的内容
2. 涵盖不同方面：结论、行动项、争议点、决策等
3. 每个问题不超过20个字
4. 直接返回JSON数组格式：["问题1", "问题2", ...]
5. 不要包含任何其他文字说明`;

    const model = process.env.SUMMIT_OPENAI_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini';

    try {
      const completion = await this.client.chat.completions.create({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.8,
        max_tokens: 500,
        response_format: { type: 'json_object' },
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        return this.getFallbackQuestions();
      }

      const parsed = JSON.parse(content);
      const questions = Array.isArray(parsed.questions) 
        ? parsed.questions 
        : Array.isArray(parsed) 
        ? parsed 
        : Object.values(parsed).find(Array.isArray);

      if (Array.isArray(questions) && questions.length > 0) {
        return questions.slice(0, 5).map(q => String(q));
      }

      return this.getFallbackQuestions();
    } catch (error) {
      console.error('Failed to generate suggested questions:', error);
      return this.getFallbackQuestions();
    }
  }

  private getFallbackQuestions(): string[] {
    return [
      '这次会议的主要结论是什么？',
      '有哪些行动项需要跟进？',
      '会议中讨论的关键争议是什么？',
      '谁是主要的发言人？',
      '总结一下会议的主要内容',
      '有哪些重要的决策？'
    ];
  }

  async chatStream(transcript: string, userMessage: string, history: ChatMessage[] = []) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.client) {
      throw internal('Chat service not initialized', 'chat.not_initialized');
    }

    const systemPrompt = `你是一个专业的会议记录分析助手。你的任务是帮助用户理解和分析会议内容。

以下是完整的会议记录：

${transcript}

请根据会议记录回答用户的问题。注意：
1. 尽可能引用具体的发言人和时间点
2. 回答要准确、简洁
3. 如果会议记录中没有相关信息，请明确说明
4. 使用中文回答`;

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: userMessage },
    ];

    const model = process.env.SUMMIT_OPENAI_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini';

    const stream = await this.client.chat.completions.create({
      model,
      messages,
      stream: true,
      temperature: 0.7,
      max_tokens: 2000,
    });

    return stream;
  }
}

export const transcriptChatService = new TranscriptChatService();
export default transcriptChatService;
