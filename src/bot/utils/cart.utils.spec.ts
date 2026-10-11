import {
  addItemToCart,
  buildCartBackContent,
  buildCartMessage,
  buildMediaHeader,
  buildImageHeader,
  calcTotalFromList,
  CartItem,
  extractMessageMedia,
  extractMediaHeader,
  extractDetectedImages,
  parseCartFromContent,
  serializeCart,
} from './cart.utils';

describe('Point Awarding & Media Detection - Pure Utils', () => {
  // ----------------------------------------------------------------
  // CASE: Add single item
  // ----------------------------------------------------------------
  describe('addItemToCart()', () => {
    it('should add first item to empty cart', () => {
      const result = addItemToCart('', { mission: 'CREST: 4+', points: 8 });
      expect(result).toBe('• **CREST: 4+** (+8 pts)');
    });

    it('should accumulate a second DIFFERENT item', () => {
      const existing = '• **CREST: 4+** (+8 pts)';
      const result = addItemToCart(existing, { mission: 'LDB: Spex 1st Place', points: 24 });
      expect(result).toBe('• **CREST: 4+** (+8 pts)\n• **LDB: Spex 1st Place** (+24 pts)');
    });

    it('[MAIN CASE] should accumulate SAME item twice (2x Crest 4+ = 16 pts)', () => {
      let cart = '';
      cart = addItemToCart(cart, { mission: 'CREST: 4+', points: 8 });
      cart = addItemToCart(cart, { mission: 'CREST: 4+', points: 8 });

      expect(cart).toBe(
        '• **CREST: 4+** (+8 pts)\n• **CREST: 4+** (+8 pts)'
      );
    });

    it('should accumulate 3 different items', () => {
      let cart = '';
      cart = addItemToCart(cart, { mission: 'CREST: 4+', points: 8 });
      cart = addItemToCart(cart, { mission: 'SREQ: Rep', points: 5 });
      cart = addItemToCart(cart, { mission: "LDB: Summoner Road 1st", points: 120 });

      const lines = cart.split('\n');
      expect(lines).toHaveLength(3);
    });

    it('should add batch item with count > 1 (e.g. 18x Crest 4+ = 144 pts)', () => {
      const result = addItemToCart('', { mission: 'CREST: 4+', points: 8 }, 18);
      expect(result).toBe('• **18x CREST: 4+** (+144 pts)');
      expect(calcTotalFromList(result)).toBe(144);
    });
  });

  // ----------------------------------------------------------------
  // CASE: Calculate total points
  // ----------------------------------------------------------------
  describe('calcTotalFromList()', () => {
    it('should return 0 for empty string', () => {
      expect(calcTotalFromList('')).toBe(0);
    });

    it('[MAIN CASE] should return 16 for 2x Crest 4+', () => {
      const list = '• **CREST: 4+** (+8 pts)\n• **CREST: 4+** (+8 pts)';
      expect(calcTotalFromList(list)).toBe(16);
    });

    it('should correctly sum mixed items', () => {
      const list = '• **CREST: 4+** (+8 pts)\n• **SREQ: Rep** (+5 pts)\n• **LDB: Summoner Road 1st** (+120 pts)';
      expect(calcTotalFromList(list)).toBe(133);
    });
  });

  // ----------------------------------------------------------------
  // CASE: Parse items from Discord message content
  // ----------------------------------------------------------------
  describe('parseCartFromContent()', () => {
    it('should return empty array if no items in message', () => {
      expect(parseCartFromContent('Select category:')).toEqual([]);
    });

    it('[MAIN CASE] should parse 2x same items from message', () => {
      const content = buildCartMessage(
        '• **CREST: 4+** (+8 pts)\n• **CREST: 4+** (+8 pts)'
      );
      const items = parseCartFromContent(content);
      expect(items).toHaveLength(2);
      expect(items[0]).toEqual({ mission: 'CREST: 4+', points: 8 });
      expect(items[1]).toEqual({ mission: 'CREST: 4+', points: 8 });
    });

    it('should parse 3 different items correctly', () => {
      const list = '• **CREST: 4+** (+8 pts)\n• **SREQ: Rep** (+5 pts)\n• **LDB: Spex 1st** (+24 pts)';
      const content = buildCartMessage(list);
      const items = parseCartFromContent(content);
      expect(items).toHaveLength(3);
      expect(items.reduce((s, i) => s + i.points, 0)).toBe(37);
    });
  });
  
  // ----------------------------------------------------------------
  // CASE: Media Detection & Headers (Images + Videos)
  // ----------------------------------------------------------------
  describe('Media Detection & Header', () => {
    it('should extract images and videos from attachments', () => {
      const msg = {
        attachments: [
          { url: 'http://cdn/photo.png', contentType: 'image/png' },
          { url: 'http://cdn/video.mp4', contentType: 'video/mp4' },
        ]
      };
      const media = extractMessageMedia(msg);
      expect(media.images).toHaveLength(1);
      expect(media.videos).toHaveLength(1);
    });

    it('should extract video links from content (YouTube)', () => {
      const msg = {
        attachments: [],
        content: 'Check my boss clear https://youtu.be/abc123xyz'
      };
      const media = extractMessageMedia(msg);
      expect(media.videos).toHaveLength(1);
      expect(media.videos[0].url).toBe('https://youtu.be/abc123xyz');
    });

    it('should format header with clean links for images and videos', () => {
      const media = {
        images: [{ url: 'http://img1' }, { url: 'http://img2' }],
        videos: [{ url: 'http://vid1.mp4' }]
      };
      const header = buildMediaHeader(media);
      expect(header).toBe('Media: [🖼️ 1](http://img1) • [🖼️ 2](http://img2) • [🎥 Video](http://vid1.mp4)');
    });

    it('should cap displayed image links to 5 and add (+X more)', () => {
      const attachments = Array.from({ length: 18 }, (_, i) => ({ url: `http://img${i + 1}` }));
      const header = buildMediaHeader(attachments);
      expect(header).toContain('Media: [🖼️ 1](http://img1)');
      expect(header).toContain('[🖼️ 5](http://img5)');
      expect(header).not.toContain('[🖼️ 6]');
      expect(header).toContain('*(+13 more)*');
    });
  });

  // ----------------------------------------------------------------
  // CASE: Extract media header
  // ----------------------------------------------------------------
  describe('extractMediaHeader()', () => {
    it('should extract Media: line from content', () => {
      const content = 'Target: **User**\nMedia: [🖼️ 1](http://img1)\n\n• **CREST** (+8 pts)';
      expect(extractMediaHeader(content)).toBe('Media: [🖼️ 1](http://img1)');
    });

    it('should support legacy detected images line', () => {
      const content = '📸 **Detected 2 image(s)**\n\n• **CREST** (+8 pts)';
      expect(extractMediaHeader(content)).toBe('📸 **Detected 2 image(s)**');
    });

    it('should return null if no media line', () => {
      expect(extractMediaHeader('Hello world')).toBeNull();
    });
  });

  // ----------------------------------------------------------------
  // CASE: Preservation in buildCartBackContent
  // ----------------------------------------------------------------
  describe('buildCartBackContent() preservation', () => {
    it('should preserve header and pending list when navigating', () => {
      const existing = 'Target: **Member**\nMedia: [🖼️ 1](http://img)\n\n• **CREST: 4+** (+8 pts)\n**Total: +8 pts**';
      const result = buildCartBackContent(existing, 'Select next:');
      expect(result).toContain('Target: **Member**');
      expect(result).toContain('Media: [🖼️ 1](http://img)');
      expect(result).toContain('• **CREST: 4+** (+8 pts)');
      expect(result).toContain('Total: +8 pts');
      expect(result).toContain('Select next:');
    });
  });

  // ----------------------------------------------------------------
  // CASE: Full end-to-end flow simulation
  // ----------------------------------------------------------------
  describe('Full Flow Simulation', () => {
    it('[E2E] 2 media, 2x Crest 4+ → total 16 pts, correct list', () => {
      let pendingList = '';
      pendingList = addItemToCart(pendingList, { mission: 'CREST: 4+', points: 8 });
      pendingList = addItemToCart(pendingList, { mission: 'CREST: 4+', points: 8 });

      const cartMessage = buildCartMessage(pendingList, 'Target: **User**\nMedia: [🖼️ 1](http://img1)');
      const items = parseCartFromContent(cartMessage);
      const total = items.reduce((s, i) => s + i.points, 0);

      expect(items).toHaveLength(2);
      expect(total).toBe(16);
      expect(cartMessage).toContain('Total: +16 pts');
      expect(cartMessage).not.toContain('Shopping Cart');
      expect(cartMessage).not.toContain('Pending Rewards:');
    });

    it('[E2E] 3 mixed items → correct total', () => {
      let pendingList = '';
      pendingList = addItemToCart(pendingList, { mission: 'CREST: Burst', points: 20 });
      pendingList = addItemToCart(pendingList, { mission: 'LDB: Spex 1st Place', points: 24 });
      pendingList = addItemToCart(pendingList, { mission: "SREQ: Custom", points: 20 });

      const cartMessage = buildCartMessage(pendingList);
      const items = parseCartFromContent(cartMessage);
      const total = items.reduce((s, i) => s + i.points, 0);

      expect(items).toHaveLength(3);
      expect(total).toBe(64);
      expect(cartMessage).toContain('Total: +64 pts');
    });
  });

  describe('Point Wizard Integration and Parsing', () => {
    const { getOptionById } = require('../services/point-calculator.service');

    it('should correctly resolve Crest 4+ option', () => {
      const customId = 'calc_final_crest_4plus_12345_6789';
      const parts = customId.split('_');
      parts.pop();
      parts.pop();
      const optionId = parts[3] + (parts[4] ? '_' + parts[4] : '');
      const type = parts[2];
      const catKey = type === 'crest' ? 'CRESTS' : 'SR_EQ';

      const option = getOptionById(catKey, optionId);
      expect(option).toBeDefined();
      expect(option?.points).toBe(8);
      expect(option?.label).toBe('4+');
    });

    it("should correctly resolve SR's EQ Rep option", () => {
      const customId = 'calc_final_sreq_eq_rep_12345_6789';
      const parts = customId.split('_');
      parts.pop();
      parts.pop();
      const optionId = parts[3] + (parts[4] ? '_' + parts[4] : '');
      const type = parts[2];
      const catKey = type === 'crest' ? 'CRESTS' : 'SR_EQ';

      const option = getOptionById(catKey, optionId);
      expect(option).toBeDefined();
      expect(option?.points).toBe(5);
      expect(option?.label).toBe('Rep');
    });
  });
});
