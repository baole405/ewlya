import {
  addItemToCart,
  buildCartBackContent,
  buildCartMessage,
  calcTotalFromList,
  CartItem,
  extractDetectedImages,
  parseCartFromContent,
  serializeCart,
} from './cart.utils';

describe('Shopping Cart - Point Accumulation', () => {
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
  // CASE: Parse cart from Discord message content
  // ----------------------------------------------------------------
  describe('parseCartFromContent()', () => {
    it('should return empty array if no cart in message', () => {
      expect(parseCartFromContent('Please select the point category:')).toEqual([]);
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
  // CASE: Extract detected images
  // ----------------------------------------------------------------
  describe('extractDetectedImages()', () => {
    it('should extract detected images string from content', () => {
      const content = '📸 **Detected 3 image(s)**\n\n🛒 **Point Shopping Cart**';
      expect(extractDetectedImages(content)).toBe('📸 **Detected 3 image(s)**');
    });

    it('should return null if no detected images string', () => {
      expect(extractDetectedImages('Hello world')).toBeNull();
    });
  });

  // ----------------------------------------------------------------
  // CASE: Preservation in buildCartBackContent
  // ----------------------------------------------------------------
  describe('buildCartBackContent() preservation', () => {
    it('should preserve detected images line when going back', () => {
      const existing = '📸 **Detected 2 image(s)**\n\n🛒 **Point Shopping Cart**\n\n📜 **Pending Rewards:**\n• **CREST: 4+** (+8 pts)\n\nSelect next:';
      const result = buildCartBackContent(existing, 'New prompt:');
      expect(result).toContain('📸 **Detected 2 image(s)**');
      expect(result).toContain('New prompt:');
    });
  });

  // ----------------------------------------------------------------
  // CASE: Full end-to-end cart flow simulation
  // ----------------------------------------------------------------
  describe('Full Cart Flow - E2E Simulation', () => {
    it('[E2E] 2 images, 2x Crest 4+ → total 16 pts, correct list', () => {
      // Step 1: Admin picks Crest 4+ for image 1
      let pendingList = '';
      pendingList = addItemToCart(pendingList, { mission: 'CREST: 4+', points: 8 });

      // Step 2: Admin clicks "Add More", picks Crest 4+ for image 2
      pendingList = addItemToCart(pendingList, { mission: 'CREST: 4+', points: 8 });

      // Step 3: Bot builds cart message
      const cartMessage = buildCartMessage(pendingList);

      // Step 4: Bot parses cart message to save to DB
      const items = parseCartFromContent(cartMessage);
      const total = items.reduce((s, i) => s + i.points, 0);

      expect(items).toHaveLength(2);
      expect(total).toBe(16);
      expect(cartMessage).toContain('Total Points to award: 16');
    });

    it('[E2E] Preservation of detected images throughout flow', () => {
      const initialHeader = '📸 **Detected 2 image(s)**';
      let pendingList = '';
      
      // Step 1: First item added
      pendingList = addItemToCart(pendingList, { mission: 'CREST: 4+', points: 8 });
      let message = buildCartMessage(pendingList, initialHeader);
      expect(message).toContain(initialHeader);

      // Step 2: Go back
      message = buildCartBackContent(message, 'Select next category:');
      expect(message).toContain(initialHeader);

      // Step 3: Add second item
      pendingList = addItemToCart(pendingList, { mission: 'SREQ: Rep', points: 5 });
      message = buildCartMessage(pendingList, message);
      expect(message).toContain(initialHeader);
      expect(message).toContain('Total Points to award: 13');
    });

    it('[E2E] 3 images mixed → correct total and item count', () => {
      let pendingList = '';
      pendingList = addItemToCart(pendingList, { mission: 'CREST: Burst', points: 20 });
      pendingList = addItemToCart(pendingList, { mission: 'LDB: Spex 1st Place', points: 24 });
      pendingList = addItemToCart(pendingList, { mission: "SREQ: Custom", points: 20 });

      const cartMessage = buildCartMessage(pendingList);
      const items = parseCartFromContent(cartMessage);
      const total = items.reduce((s, i) => s + i.points, 0);

      expect(items).toHaveLength(3);
      expect(total).toBe(64);
      expect(cartMessage).toContain('Total Points to award: 64');
    });
  });

  describe('Point Wizard Integration and Parsing', () => {
    const { getOptionById } = require('../services/point-calculator.service');

    it('should correctly resolve Crest 4+ option', () => {
      const customId = 'calc_final_crest_4plus_12345_6789';
      const parts = customId.split('_');
      parts.pop(); // messageId
      parts.pop(); // memberId
      const optionId = parts[3] + (parts[4] ? '_' + parts[4] : '');
      const type = parts[2];
      const catKey = type === 'crest' ? 'CRESTS' : 'SR_EQ';

      const option = getOptionById(catKey, optionId);
      expect(option).toBeDefined();
      expect(option?.points).toBe(8);
      expect(option?.label).toBe('4+');
    });

    it("should correctly resolve SR's EQ Rep option with the new eq_ prefix pattern", () => {
      const customId = 'calc_final_sreq_eq_rep_12345_6789';
      const parts = customId.split('_');
      parts.pop(); // messageId
      parts.pop(); // memberId
      const optionId = parts[3] + (parts[4] ? '_' + parts[4] : '');
      const type = parts[2];
      const catKey = type === 'crest' ? 'CRESTS' : 'SR_EQ';

      const option = getOptionById(catKey, optionId);
      expect(option).toBeDefined();
      expect(option?.points).toBe(5);
      expect(option?.label).toBe('Rep');
    });

    it("should correctly resolve SR's EQ Custom option with the new eq_ prefix pattern", () => {
      const customId = 'calc_final_sreq_eq_custom_12345_6789';
      const parts = customId.split('_');
      parts.pop(); // messageId
      parts.pop(); // memberId
      const optionId = parts[3] + (parts[4] ? '_' + parts[4] : '');
      const type = parts[2];
      const catKey = type === 'crest' ? 'CRESTS' : 'SR_EQ';

      const option = getOptionById(catKey, optionId);
      expect(option).toBeDefined();
      expect(option?.points).toBe(20);
      expect(option?.label).toBe('Custom');
    });
  });
});
