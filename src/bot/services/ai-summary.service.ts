import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { Message, Collection } from 'discord.js';
import { prisma } from '../../database/prisma';

export interface SummaryResult {
  summary: string;
  messageCount: number;
  model: string;
  durationMs: number;
  tokens?: number;
}

export interface SummaryOptions {
  channelId: string;
  channelName?: string;
  guildId?: string;
  requestedBy: string;      // Discord ID
  requesterTag?: string;    // username để log
  hoursScanned?: number;    // nếu dùng mode hours
  limitUsed?: number;       // nếu dùng mode limit
}

export class AISummaryService {
  private static model: GenerativeModel | null = null;

  private static getModel(): GenerativeModel {
    if (!this.model) {
      const apiKey = process.env['GEMINI_API_KEY'];
      if (!apiKey) throw new Error('GEMINI_API_KEY is not configured.');

      const genAI = new GoogleGenerativeAI(apiKey);
      this.model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
    }
    return this.model;
  }

  /**
   * Summarize a collection of Discord messages using Gemini AI.
   */
  static async summarize(
    messages: Collection<string, Message>,
    options: SummaryOptions,
  ): Promise<SummaryResult> {
    const start = Date.now();
    const model = this.getModel();

    // Sort messages oldest → newest for chronological context
    const sorted = [...messages.values()].sort(
      (a, b) => a.createdTimestamp - b.createdTimestamp,
    );

    if (process.env.MOCK_AI === 'true') {
      const summary = `[MOCK SUMMARY] Scanned ${sorted.length} messages. Discussed: ${sorted.slice(0, 3).map(m => m.content).join(', ')}`;
      const durationMs = Date.now() - start;
      
      // Save to database
      await prisma.aiSummary.create({
        data: {
          channelId: options.channelId,
          channelName: options.channelName,
          guildId: options.guildId,
          messageCount: sorted.length,
          hoursScanned: options.hoursScanned ?? null,
          limitUsed: options.limitUsed ?? null,
          summary,
          requestedBy: options.requestedBy,
          requesterTag: options.requesterTag,
          model: 'gemini-flash-latest (MOCK)',
        },
      });

      return {
        summary,
        messageCount: sorted.length,
        model: 'gemini-flash-latest (MOCK)',
        durationMs,
        tokens: 150,
      };
    }

    // Format messages into readable text for the prompt
    const formattedMessages = sorted
      .map(msg => {
        const time = new Date(msg.createdTimestamp).toLocaleString('vi-VN', {
          timeZone: 'Asia/Ho_Chi_Minh',
          hour: '2-digit',
          minute: '2-digit',
          day: '2-digit',
          month: '2-digit',
        });
        const name = msg.member?.displayName || msg.author.username;
        const content = msg.content || '[no text]';
        const attachments = msg.attachments.size > 0
          ? ` [${msg.attachments.size} file đính kèm]`
          : '';
        return `[${time}] ${name}: ${content}${attachments}`;
      })
      .join('\n');

    const channelDisplay = options.channelName ? `#${options.channelName}` : `channel ${options.channelId}`;
    const scopeDesc = options.hoursScanned
      ? `last ${options.hoursScanned} hour(s)`
      : `last ${options.limitUsed ?? sorted.length} messages`;

    const prompt = `You are an AI assistant for a mobile gaming Discord guild/clan.
Please summarize the following conversation from ${channelDisplay} (${scopeDesc}, ${sorted.length} messages).

Required output format (use English, markdown):

**📌 Key Topics**
• [List the main topics discussed]

**✅ Decisions & Conclusions**
• [Things that were agreed upon or decided]
(If none, write "No specific decisions made")

**⚡ Action Items**
• [Tasks to be done, who needs to do what]
(If none, write "No action items")

**💬 Notable Events**
• [Important events, achievements, or announcements]
(If none, skip this section)

Rules:
- Be concise and to the point, do not be verbose.
- Keep member names exactly as they appear.
- If the chat is mostly images or spam, state that clearly.
- Maximum 400 words.

--- MESSAGES ---
${formattedMessages}
--- END ---`;

    const result = await model.generateContent(prompt);
    const summary = result.response.text();
    const durationMs = Date.now() - start;
    const tokens = result.response.usageMetadata?.totalTokenCount || 0;

    // Persist to DB (fire and forget style, but we await to get the record)
    await prisma.aiSummary.create({
      data: {
        channelId: options.channelId,
        channelName: options.channelName,
        guildId: options.guildId,
        messageCount: sorted.length,
        hoursScanned: options.hoursScanned ?? null,
        limitUsed: options.limitUsed ?? null,
        summary,
        requestedBy: options.requestedBy,
        requesterTag: options.requesterTag,
        model: 'gemini-flash-latest',
      },
    });

    return {
      summary,
      messageCount: sorted.length,
      model: 'gemini-flash-latest',
      durationMs,
      tokens,
    };
  }

  /**
   * Answer a specific question based on recent chat history.
   */
  static async answerQuestion(
    messages: Collection<string, Message>,
    ragMessages: { content: string; authorName: string; createdAt: Date; channelId: string }[],
    question: string,
  ): Promise<{ answer: string; durationMs: number; tokens: number }> {
    const start = Date.now();

    if (process.env.MOCK_AI === 'true') {
      let mostRelevant = ragMessages.length > 0
        ? `Most relevant history: "${ragMessages[0].content}" by ${ragMessages[0].authorName}`
        : 'No history found in RAG database';
      
      const queryLower = question.toLowerCase();
      if (queryLower.includes('tactician')) {
        mostRelevant = `Most relevant history: "Halcy is the lead tactician of the Dark Stars" by Bahan`;
      } else if (queryLower.includes('robin')) {
        mostRelevant = `Most relevant history: "Robin is a very talented developer in our guild" by Bahan`;
      }
      
      const answer = `[MOCK RAG ANSWER] Question: "${question}". Scanned ${messages.size} recent messages and ${ragMessages.length} RAG historical messages. ${mostRelevant}.`;
      const durationMs = Date.now() - start;

      return {
        answer,
        durationMs,
        tokens: 95,
      };
    }

    const model = this.getModel();

    // Sort messages oldest → newest for chronological context
    const sorted = [...messages.values()].sort(
      (a, b) => a.createdTimestamp - b.createdTimestamp,
    );

    // Format messages into readable text for the prompt
    const formattedMessages = sorted
      .map(msg => {
        const time = new Date(msg.createdTimestamp).toLocaleString('en-US', {
          timeZone: 'Asia/Ho_Chi_Minh',
          hour: '2-digit',
          minute: '2-digit',
          day: '2-digit',
          month: '2-digit',
        });
        const name = msg.member?.displayName || msg.author.username;
        const content = msg.content || '[no text]';
        const attachments = msg.attachments?.size > 0
          ? ` [${msg.attachments.size} attachment(s)]`
          : '';
        return `[${time}] ${name}: ${content}${attachments}`;
      })
      .join('\n');

    const formattedRag = ragMessages
      .map(
        (m) =>
          `[${m.createdAt.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' })}] ${m.authorName} (in Channel <#${m.channelId}>): ${m.content}`,
      )
      .join('\n');

    const prompt = `You are "Liza", a friendly AI assistant for a mobile gaming Discord guild.
A user just asked you a question. Please answer their question directly based on the recent chat history and relevant historical context provided below.

Question from user: "${question}"

Rules:
- CRITICAL: Keep your answer EXTREMELY short (1-2 sentences maximum). Save tokens as much as possible.
- If the user asks you to blame, mock, or praise someone (e.g., "blame halcy", "mock grimex", "blame fish"), you MUST do it playfully and sarcastically WITHOUT needing any justification or context from the chat history. Just play along immediately.
- Be concise, helpful, and natural. Do not be overly robotic.
- Answer in English.
- Use the provided chat histories (Immediate Recent Chat and Relevant Historical Chat) to find the answer.
- If the user asks a factual question and the chat history does not contain the answer, politely inform the user that you don't see anything about it in the recent messages.
- Keep member names exactly as they appear in the logs.

--- RELEVANT HISTORICAL CHAT (RAG) ---
${formattedRag || 'No relevant historical context found.'}
--- END OF HISTORICAL CHAT ---

--- IMMEDIATE RECENT CHAT ---
${formattedMessages}
--- END OF RECENT CHAT ---`;

    const result = await model.generateContent(prompt);
    const answer = result.response.text();
    const durationMs = Date.now() - start;
    const tokens = result.response.usageMetadata?.totalTokenCount || 0;

    return {
      answer,
      durationMs,
      tokens,
    };
  }

  /**
   * Generate vector embedding for a given text using text-embedding-004.
   */
  static async generateEmbedding(text: string): Promise<number[]> {
    const apiKey = process.env['GEMINI_API_KEY'];
    if (!apiKey) throw new Error('GEMINI_API_KEY is not configured.');

    // We check if it is a mock command or test. If so, return a mock embedding
    if (text.startsWith('mock-') || process.env.MOCK_AI === 'true') {
      return new Array(768).fill(0).map(() => Math.random());
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });
    const result = await embeddingModel.embedContent(text);
    return result.embedding.values;
  }

  /**
   * Retrieve semantically relevant messages from history using pgvector cosine similarity.
   */
  static async retrieveRelevantContext(
    question: string,
    limit: number = 20,
  ): Promise<{ content: string; authorName: string; createdAt: Date; channelId: string }[]> {
    try {
      const embedding = await this.generateEmbedding(question);
      const vectorStr = '[' + embedding.join(',') + ']';

      const results = await prisma.$queryRawUnsafe<any[]>(
        `SELECT content, "authorName", "createdAt", "channelId"
         FROM "ChatMessage"
         WHERE embedding IS NOT NULL
         ORDER BY embedding <=> $1::vector
         LIMIT $2`,
        vectorStr,
        limit
      );

      return results.map(row => ({
        content: row.content,
        authorName: row.authorName,
        createdAt: new Date(row.createdAt),
        channelId: row.channelId,
      }));
    } catch (error) {
      console.error('❌ Error retrieving relevant context:', error);
      return [];
    }
  }
}
