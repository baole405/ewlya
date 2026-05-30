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
   * Helper to invoke different LLM APIs (Gemini, OpenRouter, Pollinations, OpenAI custom endpoints)
   */
  public static async callLLM(
    systemPrompt: string,
    userPrompt: string,
    maxTokens: number = 1000
  ): Promise<{ text: string; tokens: number }> {
    const provider = (process.env['AI_PROVIDER'] || 'gemini').toLowerCase();
    const apiKey = process.env['AI_API_KEY'] || process.env['GEMINI_API_KEY'];
    const modelName = process.env['AI_MODEL'];

    if (provider === 'gemini') {
      const model = this.getModel();
      const prompt = `${systemPrompt}\n\n${userPrompt}`;
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const tokens = result.response.usageMetadata?.totalTokenCount || 0;
      return { text, tokens };
    }

    let url = '';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    let bodyModel = '';

    if (provider === 'pollinations') {
      url = 'https://text.pollinations.ai/openai';
      bodyModel = modelName || 'qwen';
    } else if (provider === 'openrouter') {
      url = 'https://openrouter.ai/api/v1/chat/completions';
      bodyModel = modelName || 'meta-llama/llama-3-8b-instruct:free';
      headers['Authorization'] = `Bearer ${apiKey || ''}`;
      headers['HTTP-Referer'] = 'https://github.com/baole405/Ewlya';
      headers['X-OpenRouter-Title'] = 'Ewlya Bot';
    } else if (provider === 'openai') {
      const baseUrl = process.env['AI_BASE_URL'] || 'https://api.openai.com/v1';
      url = `${baseUrl.replace(/\/$/, '')}/chat/completions`;
      bodyModel = modelName || 'gpt-4o-mini';
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }
    } else {
      throw new Error(`Unsupported AI provider: ${provider}`);
    }

    const requestBody = {
      model: bodyModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: maxTokens,
      temperature: 0.7,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`LLM API Request failed (${provider}): ${response.status} ${response.statusText} - ${errText}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';
    const tokens = data.usage?.total_tokens || 0;

    return { text, tokens };
  }

  /**
   * Summarize a collection of Discord messages using the selected LLM.
   */
  static async summarize(
    messages: Collection<string, Message>,
    options: SummaryOptions,
  ): Promise<SummaryResult> {
    const start = Date.now();

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
          model: `${process.env['AI_PROVIDER'] || 'gemini'} (MOCK)`,
        },
      });

      return {
        summary,
        messageCount: sorted.length,
        model: `${process.env['AI_PROVIDER'] || 'gemini'} (MOCK)`,
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

    const systemPrompt = `You are an AI assistant for a mobile gaming Discord guild/clan.
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
- Maximum 400 words.`;

    const userPrompt = `--- MESSAGES ---
${formattedMessages}
--- END ---`;

    const { text: summary, tokens } = await this.callLLM(systemPrompt, userPrompt, 1500);
    const durationMs = Date.now() - start;
    const providerName = (process.env['AI_PROVIDER'] || 'gemini').toLowerCase();
    const modelUsed = providerName === 'gemini' ? 'gemini-flash-latest' : (process.env['AI_MODEL'] || providerName);

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
        model: modelUsed,
      },
    });

    return {
      summary,
      messageCount: sorted.length,
      model: modelUsed,
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

    const systemPrompt = `You are "Liza", a friendly AI assistant for a mobile gaming Discord guild.
A user just asked you a question. Please answer their question directly based on the recent chat history and relevant historical context provided below.

Rules:
- CRITICAL: Keep your answer EXTREMELY short (1-2 sentences maximum). Save tokens as much as possible.
- If the user asks you to blame, mock, or praise someone (e.g., "blame halcy", "mock grimex", "blame fish"), you MUST do it playfully and sarcastically WITHOUT needing any justification or context from the chat history. Just play along immediately.
- Be concise, helpful, and natural. Do not be overly robotic.
- Answer in English.
- Use the provided chat histories (Immediate Recent Chat and Relevant Historical Chat) to find the answer.
- If the user asks a factual question and the chat history does not contain the answer, politely inform the user that you don't see anything about it in the recent messages.
- Keep member names exactly as they appear in the logs.`;

    const userPrompt = `Question from user: "${question}"

--- RELEVANT HISTORICAL CHAT (RAG) ---
${formattedRag || 'No relevant historical context found.'}
--- END OF HISTORICAL CHAT ---

--- IMMEDIATE RECENT CHAT ---
${formattedMessages}
--- END OF RECENT CHAT ---`;

    const { text: answer, tokens } = await this.callLLM(systemPrompt, userPrompt, 500);
    const durationMs = Date.now() - start;

    return {
      answer,
      durationMs,
      tokens,
    };
  }

  static async generateEmbedding(text: string): Promise<number[]> {
    // We check if it is a mock command or test. If so, return a mock embedding
    if (text.startsWith('mock-') || process.env.MOCK_AI === 'true') {
      return new Array(768).fill(0).map(() => Math.random());
    }

    const apiKey = process.env['GEMINI_API_KEY'];
    if (!apiKey) {
      console.warn('⚠️ GEMINI_API_KEY is not configured. Falling back to mock embedding for RAG.');
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
