import { Message, Client } from 'discord.js';
import { prisma } from '../../database/prisma';

export const name = 'messageCreate';
export const once = false;

export async function execute(message: Message) {
  // Bỏ qua tin nhắn từ Bot
  if (message.author.bot) return;

  const client = message.client as Client;
  const botId = client.user?.id;

  // Kiểm tra xem Bot có được Mention không
  if (botId && message.mentions.has(botId)) {
    console.log(`🤖 Bot được Mention bởi ${message.author.username}: ${message.content}`);

    const content = message.content.toLowerCase();
    const discordId = message.author.id;

    // Logic truy vấn thông tin Member
    if (content.includes('ign')) {
      const member = await prisma.member.findUnique({
        where: { discordId },
      });

      if (member) {
        return message.reply(`✅ IGN (In-game Name) của bạn là: **${member.ign}**`);
      } else {
        return message.reply(
          '❌ Tôi chưa thấy bạn trong hệ thống. Hãy dùng lệnh `/register` để đăng ký nhé!',
        );
      }
    }

    if (content.includes('gs code') || content.includes('friend code')) {
      const member = await prisma.member.findUnique({
        where: { discordId },
      });

      if (member && member.gsCode) {
        return message.reply(`✅ GS Friend Code của bạn là: **${member.gsCode}**`);
      } else {
        return message.reply('❌ Tôi không tìm thấy GS Code của bạn trong hồ sơ.');
      }
    }

    if (content.includes('điểm') || content.includes('points')) {
      const member = await prisma.member.findUnique({
        where: { discordId },
      });

      if (member) {
        return message.reply(`📊 Bạn đang có **${member.points}** điểm tích lũy.`);
      }
    }

    // Câu trả lời mặc định nếu không khớp từ khóa
    return message.reply(
      `Chào **${message.author.username}**! Bạn có thể hỏi tôi về 'ign', 'gs code' hoặc 'điểm' bằng cách mention nhé! ✨`,
    );
  }

  return;
}

