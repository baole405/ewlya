import { MessageReaction, User, PartialMessageReaction, PartialUser, Events } from 'discord.js';
import { MinesDropService } from '../services/mines-drop.service';

export const name = Events.MessageReactionRemove;

export async function execute(
  reaction: MessageReaction | PartialMessageReaction,
  user: User | PartialUser
) {
  if (reaction.partial) {
    try { await reaction.fetch(); } catch (error) { return; }
  }

  const message = reaction.message;

  // Only check authorized users
  const adminIds = (process.env['ADMIN_IDS'] || '').split(',').map(id => id.trim()).filter(Boolean);
  const authorizedIds = [...adminIds, '152989780274184192', '517740134440075274'];
  if (!authorizedIds.includes(user.id)) return;

  // ---------------------------------------------------------
  // MINES EQUIP DROPS REMOVAL (❤️ Heart Emoji)
  // ---------------------------------------------------------
  const isHeartEmoji = ['❤️', '❤', '♥️', '💖', '💗', '💓', '💕'].includes(reaction.emoji.name || '');
  if (isHeartEmoji) {
    try {
      const MINES_DROPS_CHANNEL_ID = '1265850153517060096';
      const minesChannelId = process.env['MINES_DROPS_CHANNEL_ID'] || MINES_DROPS_CHANNEL_ID;
      const hofChannelId = process.env['HOF_CHANNEL_ID'];
      const channel = message.channel;
      const channelName = channel && 'name' in channel ? (channel as any).name : '';
      const isMinesChannel =
        message.channelId === minesChannelId ||
        message.channelId === MINES_DROPS_CHANNEL_ID ||
        message.channelId === hofChannelId ||
        message.channelId === process.env['TEST_CHANNEL_ID'] ||
        channelName.toLowerCase().includes('mines') ||
        channelName.toLowerCase().includes('drop');

      if (!isMinesChannel) return;

      const result = await MinesDropService.removeReactionDrop(message.id);
      if (result.success) {
        // Remove bot's ✅ reaction
        const botReactions = message.reactions.cache.get('✅');
        if (botReactions && reaction.client.user) {
          await botReactions.users.remove(reaction.client.user.id).catch(() => null);
        }
      }
    } catch (error) {
      console.error('Mines Drop Reaction Remove Error:', error);
    }
  }
}
