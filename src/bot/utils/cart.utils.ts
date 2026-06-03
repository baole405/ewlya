/**
 * Pure utility functions for the Point Shopping Cart.
 * These functions are fully isolated from Discord/DB and can be unit tested directly.
 */

export interface CartItem {
  mission: string;
  points: number;
}

/**
 * Serializes a list of cart items into a markdown string stored in the Discord message.
 */
export function serializeCart(items: CartItem[]): string {
  return items.map(i => `• **${i.mission}** (+${i.points} pts)`).join('\n');
}

/**
 * Parses the pending rewards block from a Discord message content string.
 * Returns an array of CartItems.
 */
export function parseCartFromContent(content: string): CartItem[] {
  // Matches from "📜 **Pending Rewards:**" or "📜 Pending Rewards:" until the next double newline or end of string
  const match = content.match(/📜\s*(?:\*\*)?Pending Rewards:(?:\*\*)?\s*\n([\s\S]*?)(\n\n|$)/i);
  if (!match) return [];

  return match[1].split('\n').reduce<CartItem[]>((acc, line) => {
    // Matches bullet (• or -) followed by optional bold (**) then mission name then optional bold (**) then (+X pts)
    const m = line.match(/^[•\-]\s*(?:\*\*)?(.*?)(?:\*\*)?\s*\(\+(\d+)\s*pts\)/i);
    if (m) acc.push({ mission: m[1].trim(), points: parseInt(m[2]) });
    return acc;
  }, []);
}

/**
 * Adds a new item to the existing pending list string and returns the updated string.
 * Does NOT deduplicate — same item can appear multiple times.
 */
export function addItemToCart(pendingList: string, newItem: CartItem): string {
  const newLine = `• **${newItem.mission}** (+${newItem.points} pts)`;
  return pendingList ? `${pendingList.trim()}\n${newLine}` : newLine;
}

/**
 * Calculates the total points from a pending list string.
 */
export function calcTotalFromList(pendingList: string): number {
  if (!pendingList) return 0;
  return pendingList.split('\n').reduce((sum, line) => {
    const pts = line.match(/\(\+(\d+)\s*pts\)/i);
    return sum + (pts ? parseInt(pts[1]) : 0);
  }, 0);
}

/**
 * Extracts the "Detected X image(s)" string from a message content if it exists.
 */
export function extractDetectedImages(content: string): string | null {
  const match = content.match(/📸 \*\*Detected \d+ image\(s\)\*\*/);
  return match ? match[0] : null;
}

/**
 * Extracts the total number of images detected from the message content.
 */
export function extractTotalImages(content: string): number {
  const match = content.match(/📸 \*\*Detected (\d+) image\(s\)\*\*/);
  return match ? parseInt(match[1]) : 0;
}

/**
 * Builds the full Discord message content for the Shopping Cart.
 */
export function buildCartMessage(pendingList: string, existingContent?: string): string {
  const total = calcTotalFromList(pendingList);
  const detected = existingContent ? extractDetectedImages(existingContent) : null;
  const prefix = detected ? `${detected}\n\n` : '';

  return `${prefix}🛒 **Point Shopping Cart**\n\n📜 **Pending Rewards:**\n${pendingList.trim()}\n\n**Total Points to award: ${total}**\n*Click Confirm to save to Database.*`;
}

/**
 * Builds a message that preserves existing cart data while prompting for the next category.
 * Used when the Admin clicks "Add More" to go back to the category menu.
 */
export function buildCartBackContent(existingContent: string, prompt: string): string {
  const detected = extractDetectedImages(existingContent);
  const prefix = detected ? `${detected}\n\n` : '';

  const pendingMatch = existingContent.match(/📜\s*(?:\*\*)?Pending Rewards:(?:\*\*)?\s*\n([\s\S]*?)(\n\n|$)/i);
  if (!pendingMatch) return `${prefix}${prompt}`;

  const pendingList = pendingMatch[1].trim();
  const total = calcTotalFromList(pendingList);
  return `${prefix}🛒 **Point Shopping Cart** *(${total} pts so far)*\n\n📜 **Pending Rewards:**\n${pendingList}\n\n${prompt}`;
}

/**
 * Removes an item from the pending list by its index (0-based).
 */
export function removeItemFromCart(pendingList: string, index: number): string {
  const lines = pendingList.trim().split('\n');
  if (index < 0 || index >= lines.length) return pendingList;
  lines.splice(index, 1);
  return lines.join('\n');
}
