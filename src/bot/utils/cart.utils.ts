/**
 * Pure utility functions for Point Awarding & Media Detection.
 * Isolated from Discord client / DB for testability.
 */

export interface CartItem {
  mission: string;
  points: number;
}

export interface DetectedMedia {
  images: Array<{ url: string; name?: string }>;
  videos: Array<{ url: string; name?: string }>;
}

/**
 * Extracts both images and videos from a Discord message (attachments and media links).
 */
export function extractMessageMedia(message: { attachments?: any; content?: string }): DetectedMedia {
  const images: Array<{ url: string; name?: string }> = [];
  const videos: Array<{ url: string; name?: string }> = [];

  // 1. Attachments
  if (message.attachments) {
    const list = Array.from(message.attachments.values ? message.attachments.values() : message.attachments);
    for (const att of list as any[]) {
      const contentType = (att.contentType || '').toLowerCase();
      const name = (att.name || '').toLowerCase();

      if (contentType.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(name)) {
        images.push({ url: att.url, name: att.name });
      } else if (contentType.startsWith('video/') || /\.(mp4|mov|webm|m4v|mkv)$/i.test(name)) {
        videos.push({ url: att.url, name: att.name });
      }
    }
  }

  // 2. Links in message content
  if (message.content) {
    const urlRegex = /(https?:\/\/[^\s<]+)/gi;
    const urls = message.content.match(urlRegex) || [];
    for (const u of urls) {
      if (images.some(img => img.url === u) || videos.some(vid => vid.url === u)) continue;
      if (/(youtube\.com|youtu\.be|streamable\.com|medal\.tv|twitch\.tv|tiktok\.com|\.mp4|\.mov|\.webm)/i.test(u)) {
        videos.push({ url: u });
      } else if (/\.(png|jpe?g|webp|gif)($|\?)/i.test(u)) {
        images.push({ url: u });
      }
    }
  }

  return { images, videos };
}

/**
 * Builds a minimalist, professional media header line.
 * Example: "Media: [🖼️ 1](url) • [🖼️ 2](url) • [🎥 Video](url)"
 */
export function buildMediaHeader(media: DetectedMedia | Array<{ url: string }> | any): string {
  let images: Array<{ url: string }> = [];
  let videos: Array<{ url: string }> = [];

  if (Array.isArray(media)) {
    images = media;
  } else if (media && (Array.isArray(media.images) || Array.isArray(media.videos))) {
    images = media.images || [];
    videos = media.videos || [];
  } else if (media?.values) {
    images = Array.from(media.values());
  }

  const parts: string[] = [];

  const maxImages = 5;
  images.slice(0, maxImages).forEach((img, idx) => {
    parts.push(`[🖼️ ${idx + 1}](${img.url})`);
  });
  if (images.length > maxImages) {
    parts.push(`*(+${images.length - maxImages} more)*`);
  }

  const maxVideos = 3;
  videos.slice(0, maxVideos).forEach((vid, idx) => {
    const label = videos.length === 1 ? '🎥 Video' : `🎥 Video ${idx + 1}`;
    parts.push(`[${label}](${vid.url})`);
  });
  if (videos.length > maxVideos) {
    parts.push(`*(+${videos.length - maxVideos} more)*`);
  }

  if (parts.length === 0) return '';
  return `Media: ${parts.join(' • ')}`;
}

/**
 * Legacy alias for buildMediaHeader to maintain backward compatibility.
 */
export function buildImageHeader(imageAttachments: any): string {
  return buildMediaHeader(imageAttachments);
}

/**
 * Extracts target member line (e.g. "Target: **Name**") from message content.
 */
export function extractTargetLine(content: string): string | null {
  const match = content.match(/Target:\s*\*\*[^*]+\*\*/i);
  return match ? match[0].trim() : null;
}

/**
 * Extracts media header line ("Media: ...") or legacy detected images header.
 */
export function extractMediaHeader(content: string): string | null {
  const mediaMatch = content.match(/Media:\s*[^\n]+/i);
  if (mediaMatch) return mediaMatch[0].trim();
  const legacyMatch = content.match(/📸 \*\*Detected \d+ image\(s\)\*\*(?:[^\n]*)/);
  if (legacyMatch) return legacyMatch[0].trim();
  return null;
}

/**
 * Legacy alias for extractMediaHeader.
 */
export function extractDetectedImages(content: string): string | null {
  return extractMediaHeader(content);
}

/**
 * Extracts total media count detected from the message header.
 */
export function extractTotalImages(content: string): number {
  const mediaMatch = content.match(/Media:\s*([^\n]+)/i);
  if (mediaMatch) {
    const links = mediaMatch[1].match(/\[.*?\]\(.*?\)/g);
    const moreMatch = mediaMatch[1].match(/\(\+(\d+)\s*more\)/i);
    const extra = moreMatch ? parseInt(moreMatch[1], 10) : 0;
    return (links ? links.length : 0) + extra;
  }
  const legacy = content.match(/📸 \*\*Detected (\d+) image\(s\)\*\*/);
  return legacy ? parseInt(legacy[1], 10) : 0;
}

/**
 * Serializes a list of cart items into a clean markdown bullet list.
 */
export function serializeCart(items: CartItem[]): string {
  return items.map(i => `• **${i.mission}** (+${i.points} pts)`).join('\n');
}

/**
 * Parses awarded items from Discord message content.
 * Robust regex matching bullet points `• ... (+X pts)`.
 */
export function parseCartFromContent(content: string): CartItem[] {
  if (!content) return [];
  const lines = content.split('\n');
  const items: CartItem[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    const m = trimmed.match(/^[•\-]\s*(?:\*\*)?(?:(\d+)x\s+)?(.*?)(?:\*\*)?\s*\(\+(\d+)\s*pts\)/i);
    if (m) {
      const qty = m[1] ? parseInt(m[1], 10) : 1;
      const mission = m[2].trim();
      const points = parseInt(m[3], 10);
      items.push({ mission, points });
    }
  }

  return items;
}

/**
 * Extracts the pending bullet lines from existing message content.
 */
export function getPendingListFromContent(content: string): string {
  if (!content) return '';
  const lines = content.split('\n');
  const bulletLines = lines.filter(l => /^[•\-]\s*(?:\*\*)?(?:(\d+)x\s+)?(.*?)(?:\*\*)?\s*\(\+(\d+)\s*pts\)/i.test(l.trim()));
  return bulletLines.join('\n').trim();
}

/**
 * Calculates total number of items already processed (sums up 1x, 4x, etc.).
 */
export function countProcessedImages(content: string): number {
  if (!content) return 0;
  const lines = content.split('\n');
  return lines.reduce((sum, line) => {
    const m = line.trim().match(/^[•\-]\s*(?:\*\*)?(?:(\d+)x\s+)?/i);
    if (!line.trim() || !line.includes('(+')) return sum;
    const qty = m && m[1] ? parseInt(m[1], 10) : 1;
    return sum + qty;
  }, 0);
}

/**
 * Adds a new item to the existing pending list string.
 */
export function addItemToCart(pendingList: string, newItem: CartItem, count: number = 1): string {
  const effectiveCount = Math.max(1, count);
  const totalPts = newItem.points * effectiveCount;
  const label = effectiveCount > 1 ? `${effectiveCount}x ${newItem.mission}` : newItem.mission;
  const newLine = `• **${label}** (+${totalPts} pts)`;
  return pendingList ? `${pendingList.trim()}\n${newLine}` : newLine;
}

/**
 * Calculates total points from a list string.
 */
export function calcTotalFromList(pendingList: string): number {
  if (!pendingList) return 0;
  return pendingList.split('\n').reduce((sum, line) => {
    const pts = line.match(/\(\+(\d+)\s*pts\)/i);
    return sum + (pts ? parseInt(pts[1], 10) : 0);
  }, 0);
}

/**
 * Builds the clean, minimal review content (no amateur "shopping cart" wording).
 */
export function buildCartMessage(pendingList: string, existingContent?: string): string {
  const total = calcTotalFromList(pendingList);
  const targetLine = existingContent ? extractTargetLine(existingContent) : null;
  const mediaLine = existingContent ? extractMediaHeader(existingContent) : null;

  const headerParts = [targetLine, mediaLine].filter(Boolean);
  const prefix = headerParts.length > 0 ? `${headerParts.join('\n')}\n\n` : '';

  return `${prefix}${pendingList.trim()}\n\n**Total: +${total} pts**`;
}

/**
 * Builds a prompt message while preserving header and existing awarded items.
 */
export function buildCartBackContent(existingContent: string, prompt: string): string {
  const targetLine = extractTargetLine(existingContent);
  const mediaLine = extractMediaHeader(existingContent);
  const pendingList = getPendingListFromContent(existingContent);

  const headerParts = [targetLine, mediaLine].filter(Boolean);
  const prefix = headerParts.length > 0 ? `${headerParts.join('\n')}\n\n` : '';

  if (!pendingList) {
    return `${prefix}${prompt}`;
  }

  const total = calcTotalFromList(pendingList);
  return `${prefix}${pendingList}\n**Total: +${total} pts**\n\n${prompt}`;
}

/**
 * Removes an item from the pending list by its 0-based index.
 */
export function removeItemFromCart(pendingList: string, index: number): string {
  const lines = pendingList.trim().split('\n');
  if (index < 0 || index >= lines.length) return pendingList;
  lines.splice(index, 1);
  return lines.join('\n');
}
