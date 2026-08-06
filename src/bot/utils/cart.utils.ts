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
    // Matches bullet (• or -) followed by optional bold (**) then optional (Nx ) then mission name then optional bold (**) then (+X pts)
    const m = line.match(/^[•\-]\s*(?:\*\*)?(?:(\d+)x\s+)?(.*?)(?:\*\*)?\s*\(\+(\d+)\s*pts\)/i);
    if (m) {
      const qty = m[1] ? parseInt(m[1], 10) : 1;
      acc.push({ mission: m[2].trim(), points: parseInt(m[3], 10) });
    }
    return acc;
  }, []);
}

/**
 * Calculates the total number of images already processed in the shopping cart (sums quantities like 4x, 1x).
 */
export function countProcessedImages(content: string): number {
  const match = content.match(/📜\s*(?:\*\*)?Pending Rewards:(?:\*\*)?\s*\n([\s\S]*?)(\n\n|$)/i);
  if (!match) return 0;

  return match[1].split('\n').reduce((sum, line) => {
    const m = line.match(/^[•\-]\s*(?:\*\*)?(?:(\d+)x\s+)?/i);
    if (!line.trim() || !line.includes('(+')) return sum;
    const qty = m && m[1] ? parseInt(m[1], 10) : 1;
    return sum + qty;
  }, 0);
}

/**
 * Adds a new item to the existing pending list string and returns the updated string.
 * Supports optional count (e.g. 18x item for batch awarding).
 */
export function addItemToCart(pendingList: string, newItem: CartItem, count: number = 1): string {
  const effectiveCount = Math.max(1, count);
  const totalPts = newItem.points * effectiveCount;
  const label = effectiveCount > 1 ? `${effectiveCount}x ${newItem.mission}` : newItem.mission;
  const newLine = `• **${label}** (+${totalPts} pts)`;
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
 * Builds a safe image header string that caps displayed links to 5 images max
 * to prevent exceeding Discord's 2000-character message limit.
 */
export function buildImageHeader(imageAttachments: Array<{ url: string }> | any): string {
  const list = Array.from(imageAttachments?.values ? imageAttachments.values() : (imageAttachments || []));
  const count = list.length;
  if (count === 0) return '📸 **Detected 0 image(s)**';

  const maxDisplay = 5;
  const displayed = list.slice(0, maxDisplay);
  const links = displayed
    .map((att: any, idx: number) => `[🖼️ Image ${idx + 1}](${att.url})`)
    .join(' | ');

  const remaining = count - maxDisplay;
  const moreText = remaining > 0 ? ` *(+${remaining} more)*` : '';

  return `📸 **Detected ${count} image(s)**: ${links}${moreText}`;
}

/**
 * Extracts the "Detected X image(s)" string from a message content if it exists.
 */
export function extractDetectedImages(content: string): string | null {
  const match = content.match(/📸 \*\*Detected \d+ image\(s\)\*\*(?:[^\n]*)/);
  return match ? match[0].trim() : null;
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
