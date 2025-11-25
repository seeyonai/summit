import { internal } from '../utils/errors';
import { ProofingRequest, ProofingResponse, ProofingChatMessage } from '../types';
import { createChatCompletion } from '../utils/openai';

class ProofingService {
  private isInitialized = false;

  async initialize() {
    if (this.isInitialized) return;

    const apiKey = process.env.SUMMIT_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    const baseURL = process.env.SUMMIT_OPENAI_BASE_URL || process.env.OPENAI_BASE_URL;

    if (!apiKey) {
      throw internal('需要设置 SUMMIT_OPENAI_API_KEY 或 OPENAI_API_KEY 环境变量', 'proofing.api_key_missing');
    }

    this.isInitialized = true;
  }

  async correctText(request: ProofingRequest): Promise<ProofingResponse> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Build system prompt with context
    const systemPrompt = this.buildSystemPrompt(request.systemContext);

    // Build user message with corrections if provided
    let userMessage: string;
    if (request.corrections && request.corrections.length > 0) {
      userMessage = JSON.stringify({
        input: request.input,
        previousUserCorrections: request.corrections.map((c) => ({
          wrong: c.original,
          correct: c.corrected,
        })),
      });
    } else {
      userMessage = JSON.stringify({ input: request.input });
    }

    // Prepare chat messages
    const messages: ProofingChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...request.history.slice(-50), // Limit to last 50 messages
      { role: 'user', content: userMessage },
    ];

    try {
      const openaiRequest = {
        messages,
        temperature: 0.3,
        max_tokens: 500,
        response_format: { type: 'json_object' },
      } as const;

      console.log('* Sending request to OpenAI:', openaiRequest);
      console.time('⏰ OpenAI response');
      const completion = await createChatCompletion(openaiRequest, 'fast');
      console.timeEnd('⏰ OpenAI response');

      const content = completion.choices[0]?.message?.content;
      console.log('* OpenAI response:', content);
      if (!content) {
        return { output: request.input };
      }

      const parsed = JSON.parse(content);
      const output = parsed.output || request.input;

      // Parse alternatives from {opt1|opt2|opt3} format
      const alternatives = this.parseAlternatives(output);

      return {
        output,
        alternatives: Object.keys(alternatives).length > 0 ? alternatives : undefined,
      };
    } catch (error) {
      console.error('Failed to correct text:', error);
      // Return original input on error
      return { output: request.input };
    }
  }

  private buildSystemPrompt(context?: ProofingRequest['systemContext']): string {
    const participantsList = context?.meetingMembers?.length
      ? `参与者: ${context.meetingMembers.join(', ')}`
      : context?.speakerNames?.length
      ? `参与者: ${context.speakerNames.join(', ')}`
      : '';

    const hotwordsList = context?.hotwords?.length ? `热词: ${context.hotwords.join(', ')}` : '';

    const contextInfo = [participantsList, hotwordsList].filter(Boolean).join('\n');

    return `你是一个智能文本校对助手，专门用于会议速记。

${contextInfo ? `会议背景：\n${contextInfo}\n\n` : ''}任务说明：
1. 将拼音转换为中文字符（支持全拼、简拼、首字母缩写）
2. 修正错别字和语法错误
3. 保持原始含义不变
4. 使用正确的标点符号
5. 对于模糊的人名或词汇，提供备选项：{选项1|选项2|选项3}
6. 保持术语的原样（如 API、SDK、CI/CD 等）
7. 支持中英文混杂输入，但是除了术语，必须统一翻译成中文输出，避免互联网黑话
8. 用户可能用拼音、首字母、简写等方式输入，请智能推测其真实含义
9. **重要**：如果用户提供了之前的纠正记录（previousUserCorrections），请学习这些纠正，避免重复相同的错误
   注意：previousUserCorrections是用户对之前输入的纠正，不是对当前input的纠正

输入格式：
- 基本：{"input": "用户输入的文本"}
- 带纠正：{"input": "当前用户输入", "previousUserCorrections": [{"wrong": "之前的原始输入", "correct": "用户手动纠正后的正确版本"}]}

输出格式 (JSON)：{"output": "校对后的文本"}

示例：
输入：{"input": "jin tian wo men kai hui taolun AI xiang mu"}
输出：{"output": "今天我们开会讨论AI项目"}

输入：{"input": "qing fu zong baogao yi xia Q4 ye ji"}
输出：{"output": "请{付总|傅总|副总}报告一下Q4业绩"}

输入：{"input": "fu zong qing jia you", "previousUserCorrections": [{"wrong": "qing fu zong fa yan", "correct": "请付总发言"}]}
输出：{"output": "付总请加油"}
（从previousUserCorrections学习到"fu zong"应该是"付总"而不是"副总"或"傅总"，应用到当前input）

输入：{"input": "xzkaishikaih,laowangnixianss深圳 project 的jd"}
输出：{"output": "现在开始开会，老王你先说说深圳项目的进度"}`;
  }

  private parseAlternatives(text: string): Record<string, string[]> {
    const alternatives: Record<string, string[]> = {};
    const regex = /\{([^}]+)\}/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
      const optionsStr = match[1];
      const options = optionsStr.split('|').map((opt) => opt.trim());

      if (options.length > 1) {
        // Use the entire matched text as key
        alternatives[match[0]] = options;
      }
    }

    return alternatives;
  }
}

export const proofingService = new ProofingService();
export default proofingService;
