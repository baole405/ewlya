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
    
    // Check permission
    const memberRecord = await prisma.member.findUnique({
      where: { discordId: message.author.id },
    });

    if (!memberRecord || memberRecord.status !== 'OFFICIAL') {
      return message.reply("Liza is busy with grimex rightnow, anything u wanna know , ask him first");
    }

    // Prepare question by removing the bot mention and keyword
    let question = message.content.replace(new RegExp(`<@!?${botId}>`, 'g'), '').replace(/hey liza/gi, '').trim();
    if (!question) {
      // Give the AI a generic prompt to greet the user if they just typed "hey liza"
      question = "Say hello to me!";
    }

    try {
      // Trigger typing indicator
      await message.channel.sendTyping();

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

      // Fetch last 50 messages for context (to save tokens as requested)
      const fetchedMessages = await targetTextChannel.messages.fetch({ limit: 50 });
      let contextMessages = fetchedMessages;

      // Filter out bot messages from context to save tokens and focus on user chat
      // Also filter out the current question message itself
      const filteredContext = contextMessages.filter(msg => !msg.author.bot && msg.id !== message.id);

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
        // Call AI Service
        const aiResponse = await AISummaryService.answerQuestion(filteredContext, question);
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
          { name: 'Tokens Used', value: `${tokens.toLocaleString()}`, inline: true },
          { name: 'Processing Time', value: `${(durationMs / 1000).toFixed(1)}s`, inline: true },
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
