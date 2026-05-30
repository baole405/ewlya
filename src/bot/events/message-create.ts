import { Message, Client, Events, TextChannel } from 'discord.js';
import { prisma } from '../../database/prisma';
import { AISummaryService } from '../services/ai-summary.service';
import { LoggerService } from '../services/logger.service';

/**
 * Handle Message Create Event
 * Responds to mentions and provides member information
 */
export const name = Events.MessageCreate;
export const once = false;

export async function execute(message: Message) {
  // Ignore messages from other bots
  if (message.author.bot) return;

  // Store message in database for RAG long-term memory (fire and forget asynchronously)
  if (message.guildId && message.content && message.content.trim().length > 0) {
    prisma.chatMessage.create({
      data: {
        discordId: message.id,
        content: message.content,
        authorId: message.author.id,
        authorName: message.member?.nickname ?? message.author.username,
        channelId: message.channel.id,
      }
    }).then(async (dbMsg) => {
      try {
        const embedding = await AISummaryService.generateEmbedding(message.content);
        const vectorStr = '[' + embedding.join(',') + ']';
        await prisma.$executeRawUnsafe(
          'UPDATE "ChatMessage" SET embedding = $1::vector WHERE id = $2',
          vectorStr,
          dbMsg.id
        );
      } catch (embErr) {
        console.error(`❌ Failed to generate embedding for message ${message.id}:`, embErr);
      }
    }).catch(dbErr => {
      if (dbErr.code !== 'P2002') {
        console.error('❌ Failed to save message to ChatMessage table:', dbErr);
      }
    });
  }

  const content = message.content.toLowerCase();
  const client = message.client as Client;
  const botId = client.user?.id;

  // Check if bot was explicitly mentioned in the text (not just an implicit reply ping) or "hey liza" is present
  const isExplicitlyMentioned = botId ? new RegExp(`<@!?${botId}>`).test(message.content) : false;
  const hasKeyword = content.includes('hey liza');

  if (isExplicitlyMentioned || hasKeyword) {
    console.log(`🤖 Bot triggered by ${message.author.username}`);

    // Query Member info: IGN
    if (content.includes('ign')) {
      const member = await prisma.member.findUnique({
        where: { discordId: message.author.id },
      });

      if (member) {
        return message.reply(`✅ Your IGN (In-game Name) is: **${member.ign}**`);
      } else {
        return message.reply(
          "❌ I couldn't find you in our records. Please use `/register` to join the clan!",
        );
      }
    }

    // Query Member info: GS Code
    if (content.includes('gs code') || content.includes('friend code')) {
      const member = await prisma.member.findUnique({
        where: { discordId: message.author.id },
      });

      if (member && member.gsCode) {
        return message.reply(`✅ Your GS Friend Code is: **${member.gsCode}**`);
      } else {
        return message.reply("❌ I don't have your GS Code on file.");
      }
    }

    // Query Member info: Points
    if (content.includes('points')) {
      const member = await prisma.member.findUnique({
        where: { discordId: message.author.id },
      });

      if (member) {
        return message.reply(`📊 You currently have **${member.points}** points.`);
      }
    }

    // --- Conversational AI (Fallback) ---
    const adminIds = (process.env['ADMIN_IDS'] || '').split(',').map(id => id.trim());
    const isAdmin = adminIds.includes(message.author.id);

    const memberRecord = await prisma.member.findUnique({
      where: { discordId: message.author.id },
    });
    const isOfficial = memberRecord && memberRecord.status === 'OFFICIAL';

    const guideChannelId = '1505244602318454904';
    const testChannelId = process.env['TEST_CHANNEL_ID'];
    const isGuideChannel = message.channelId === guideChannelId || message.channelId === testChannelId;

    if (!isAdmin && !isOfficial) {
      if (isGuideChannel) {
        // Visitor querying in guide/workspace channel -> Answer about clan vision ONLY!
        let question = message.content.replace(new RegExp(`<@!?${botId}>`, 'g'), '').replace(/hey liza/gi, '').trim();
        if (!question) question = "What is the vision of DarkStar?";

        try {
          if ('sendTyping' in message.channel) {
            await (message.channel as any).sendTyping();
          }

          // Fetch vision from vision channel: 1303078062950449193
          const visionChannelId = '1303078062950449193';
          const visionChannel = await client.channels.fetch(visionChannelId).catch(() => null);
          let visionContext = '';
          if (visionChannel && visionChannel.isTextBased()) {
            const visionMsgs = await (visionChannel as any).messages.fetch({ limit: 50 }).catch(() => null);
            if (visionMsgs) {
              visionContext = [...visionMsgs.values()]
                .reverse()
                .map(m => m.content)
                .join('\n');
            }
          }

          const systemPrompt = `You are "Liza", the friendly AI assistant for the mobile gaming clan "DarkStar".
A visitor (who is not an official clan member) is asking you a question about the clan's vision, goals, or general information.
Please answer their question politely based ONLY on the Clan Vision Context provided below.
If their question is completely unrelated to the clan's vision, goals, or general info, politely explain that as an assistant for visitors, you can only answer questions regarding DarkStar's clan vision and goals.

--- CLAN VISION CONTEXT ---
${visionContext || 'DarkStar is a mobile gaming clan focused on progression, teamplay, and community.'}
--- END OF CONTEXT ---`;

          const { text: answer } = await AISummaryService.callLLM(systemPrompt, question, 500);
          return message.reply(answer);
        } catch (error) {
          console.error('❌ Visitor AI Error:', error);
          return message.reply('❌ An error occurred while trying to process your request. Please try again later.');
        }
      } else {
        return message.reply("Liza is busy with grimex rightnow, anything u wanna know , ask him first");
      }
    }

    // Prepare question by removing the bot mention and keyword
    let question = message.content.replace(new RegExp(`<@!?${botId}>`, 'g'), '').replace(/hey liza/gi, '').trim();
    if (!question) {
      // Give the AI a generic prompt to greet the user if they just typed "hey liza"
      question = "Say hello to me!";
    }

    try {
      // Trigger typing indicator
      if ('sendTyping' in message.channel) {
        await (message.channel as any).sendTyping();
      }

      // Check if the user mentioned a specific channel (e.g. <#123456789>)
      const channelMentionRegex = /<#(\d+)>/;
      const channelMatch = question.match(channelMentionRegex);
      
      let targetTextChannel = message.channel as TextChannel;
      
      if (channelMatch && channelMatch[1]) {
        const mentionedChannelId = channelMatch[1];
        try {
          const fetchedChannel = await client.channels.fetch(mentionedChannelId);
          if (fetchedChannel && fetchedChannel.isTextBased()) {
            targetTextChannel = fetchedChannel as TextChannel;
          }
        } catch (e) {
          console.log(`Could not fetch mentioned channel ${mentionedChannelId}`);
        }
      }

      // Fetch last 10 messages for conversational flow (to save tokens as requested)
      const fetchedMessages = await targetTextChannel.messages.fetch({ limit: 10 });
      const filteredContext = fetchedMessages.filter(msg => !msg.author.bot && msg.id !== message.id);

      // Retrieve top 20 relevant messages from RAG long-term memory
      const ragContext = await AISummaryService.retrieveRelevantContext(question, 20);

      // MOCK TEST COMMANDS BYPASS
      let answer = '';
      let tokens = 0;
      let durationMs = 0;

      if (question.startsWith('mock-503')) {
        throw new Error('GoogleGenerativeAIFetchError: [GoogleGenerativeAI Error]: Error fetching from https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent: [503 Service Unavailable]');
      } else if (question.startsWith('mock-429')) {
        throw new Error('GoogleGenerativeAIFetchError: [GoogleGenerativeAI Error]: Error fetching from https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent: [429 Quota Exceeded]');
      } else if (question.startsWith('mock-success ')) {
        answer = `[MOCK] ${question.replace('mock-success ', '')}`;
        tokens = 120;
        durationMs = 350;
      } else {
        // Call AI Service with both immediate context and RAG historical context
        const aiResponse = await AISummaryService.answerQuestion(filteredContext, ragContext, question);
        answer = aiResponse.answer;
        tokens = aiResponse.tokens;
        durationMs = aiResponse.durationMs;
      }
      
      // Background Log
      LoggerService.logAction(
        client,
        '💬 Conversational AI Used',
        `User **${message.author.username}** asked a question in <#${message.channel.id}>`,
        0x3b82f6, // Blue
        [
          { name: 'Question', value: question || 'Small talk' },
          { name: 'Tokens Used', value: `${tokens.toLocaleString()}` },
          { name: 'Processing Time', value: `${(durationMs / 1000).toFixed(1)}s` },
        ]
      ).catch(console.error);

      return message.reply(answer);
    } catch (error: any) {
      console.error('❌ Error generating AI answer:', error);
      
      const errMsg = error?.message?.toLowerCase() || '';
      if (errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('exhausted')) {
        return message.reply('Liza is sleeping right now, call me back tomorrow 💤');
      }
      
      if (errMsg.includes('503') || errMsg.includes('unavailable') || errMsg.includes('high demand')) {
        return message.reply('Liza is feeling a bit dizzy from all the messages right now 😵‍💫 Please ask me again in a minute!');
      }

      return message.reply('❌ An error occurred while trying to answer your question. Please try again later.');
    }
  }
}
