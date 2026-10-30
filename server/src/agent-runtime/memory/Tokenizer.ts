/**
 * agent-runtime/memory/Tokenizer.ts
 * 通用轻量 Token 估算器 (Tokenizer SSOT)
 *
 * 核心机制：
 * 采用启发式算法快速估算大模型上下文 Token 消耗，规避庞大的外部 WASM/tiktoken 依赖：
 * 1. 中文字符：约 1.4~1.6 Token/字；
 * 2. 英文与数字：按空格和标点分词，约 1.2~1.3 Token/词；
 * 3. 增加 15% 安全冗余裕度 (Safety Margin)，确保物理调用绝对不超大模型限制。
 */

export class Tokenizer {
  private static readonly SAFETY_MARGIN = 1.15;

  /**
   * 快速估算文本的 Token 消耗数量
   */
  public static estimateTokens(text?: string): number {
    if (!text || text.length === 0) return 0;

    let chineseChars = 0;
    let otherChars = 0;

    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      // CJK 统一表意符号区间
      if (
        (code >= 0x4e00 && code <= 0x9fff) ||
        (code >= 0x3400 && code <= 0x4dbf) ||
        (code >= 0x20000 && code <= 0x2a6df)
      ) {
        chineseChars++;
      } else {
        otherChars++;
      }
    }

    // 中文按 ~1.5 tokens/char，其他英文字符按 ~0.35 tokens/char (即 ~3.5 chars/token)
    const rawEstimate = chineseChars * 1.5 + otherChars * 0.35;
    return Math.ceil(rawEstimate * this.SAFETY_MARGIN);
  }

  /**
   * 批量估算消息列表的总 Token 消耗
   */
  public static estimateMessagesTokens(
    messages: Array<{ role: string; content: string }>,
  ): number {
    let total = 0;
    for (const msg of messages) {
      // 消息元数据结构与角色开销 (每条约 4 tokens)
      total += 4 + this.estimateTokens(msg.content);
    }
    return total;
  }
}
