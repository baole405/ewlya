import { Collection, Message } from 'discord.js';
import { AISummaryService } from './src/bot/services/ai-summary.service';
import * as dotenv from 'dotenv';
dotenv.config();

async function runTest() {
  console.log('🧪 Bắt đầu chạy Test Case cho AISummaryService...\n');
  
  // Tạo bộ dữ liệu mẫu (Mock Messages)
  const dummyMessages = new Collection<string, Message>();
  
  const createMockMsg = (id: string, content: string, username: string) => {
    return {
      id,
      content,
      author: { username },
      attachments: new Collection(),
      createdTimestamp: Date.now(),
    } as unknown as Message;
  };

  dummyMessages.set('1', createMockMsg('1', 'Tối nay 8h có ai đi raid boss không mọi người?', 'PlayerA'));
  dummyMessages.set('2', createMockMsg('2', 'Có nha, tôi đi với. Đủ team 5 người thì xuất phát.', 'PlayerB'));
  dummyMessages.set('3', createMockMsg('3', 'Nhớ mang theo pot máu, boss dạo này khoẻ lắm.', 'PlayerC'));
  dummyMessages.set('4', createMockMsg('4', 'Ok, vậy chốt 8h tối nha.', 'PlayerA'));

  console.log('📝 Dữ liệu đầu vào: 4 tin nhắn chat về việc tổ chức Raid Boss.\n');

  try {
    const result = await AISummaryService.summarize(dummyMessages, {
      channelId: '1424269975698407454',
      channelName: 'test-bot',
      guildId: '1179416079878078616',
      requestedBy: 'TestUser',
      requesterTag: 'TestUser#0000',
      limitUsed: 4
    });

    console.log('✅ KẾT QUẢ TÓM TẮT THÀNH CÔNG:\n');
    console.log(result.summary);
    console.log('\n⏱️ Thời gian xử lý:', result.durationMs, 'ms');
    console.log('🤖 Model sử dụng:', result.model);
    console.log('\n🎉 Test Passed!');
  } catch (error) {
    console.error('❌ Test Failed! Lỗi:', error);
  }
}

runTest();
