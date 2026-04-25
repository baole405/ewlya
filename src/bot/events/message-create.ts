import { Message, Client, Events } from 'discord.js';
import { prisma } from '../../database/prisma';

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

  // Check if bot was mentioned
  if (botId && message.mentions.has(botId)) {
    console.log(`🤖 Bot mentioned by ${message.author.username}`);

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

    // Default friendly response
    return message.reply(
      `Hello **${message.author.username}**! You can ask me about 'ign', 'gs code', or 'points' by mentioning me! ✨`,
    );
  }
}
