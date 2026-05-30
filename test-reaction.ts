import { Client, GatewayIntentBits, Partials } from 'discord.js';
import * as dotenv from 'dotenv';
import { execute } from './src/bot/events/message-reaction-add';

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.Message, Partials.Reaction, Partials.User],
});

client.on('ready', async () => {
  console.log(`🤖 Test Bot logged in as ${client.user?.tag}`);

  try {
    const channelId = process.env.TEST_CHANNEL_ID!;
    const channel = await client.channels.fetch(channelId);

    if (channel && channel.isTextBased()) {
      // 1. Send a mock message from the bot (simulating a user message)
      const message = await (channel as any).send("Test progression check message.");
      console.log(`✅ Sent test message: ${message.id}`);

      // 2. Add a reaction
      await message.react('✅');
      console.log(`✅ Added reaction`);

      // 3. We simulate the event being fired twice (which caused the bug)
      // We will manually fetch the reaction and the user
      const reaction = message.reactions.cache.get('✅');
      if (reaction) {
        // We use the bot's user as the "grimex" user for testing purposes, but wait, the code checks if the username includes 'grimex'.
        // So we must mock the user object!
        const mockUser = {
          id: '289758037453963264',
          username: 'grimexddd',
          bot: false,
        };

        // We need to mock the author as a valid member in the database.
        // Let's assume the author is grimexddd as well.
        const mockReaction = Object.create(reaction);
        mockReaction.message = Object.create(message);
        mockReaction.message.author = mockUser; // The author of the message is grimexddd

        console.log(`🚀 Emitting messageReactionAdd FIRST time...`);
        await execute(mockReaction as any, mockUser as any);

        console.log(`🚀 Emitting messageReactionAdd SECOND time (duplicate event simulation)...`);
        await execute(mockReaction as any, mockUser as any);
        
        console.log('🎉 Test completed. Check the channel for notifications!');
      }
    }
  } catch (err) {
    console.error('❌ Test failed:', err);
  } finally {
    process.exit(0);
  }
});

client.login(process.env.DISCORD_TOKEN);
