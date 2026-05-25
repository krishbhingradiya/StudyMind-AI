/** Split markdown into measurable blocks for notebook pagination */
export function splitMarkdownIntoBlocks(markdown: string): string[] {
  const normalized = markdown.trim();
  if (!normalized) return [];

  const sections = normalized.split(/(?=^#{1,4} .+$)/m).filter((s) => s.trim());
  const blocks: string[] = [];

  for (const section of sections) {
    const paragraphs = section.split(/\n\n+/).filter((p) => p.trim());
    let chunk = "";

    for (const paragraph of paragraphs) {
      const candidate = chunk ? `${chunk}\n\n${paragraph}` : paragraph;
      if (candidate.length > 1400 && chunk) {
        blocks.push(chunk);
        chunk = paragraph;
      } else {
        chunk = candidate;
      }
    }

    if (chunk.trim()) blocks.push(chunk);
  }

  return blocks.length > 0 ? blocks : [normalized];
}

/** Group block indices into pages by measured height */
export function groupBlocksIntoPages(
  blockHeights: number[],
  maxHeight: number
): number[][] {
  if (blockHeights.length === 0) return [];

  const pages: number[][] = [];
  let current: number[] = [];
  let height = 0;

  for (let i = 0; i < blockHeights.length; i++) {
    const blockHeight = blockHeights[i] || 0;

    if (height + blockHeight > maxHeight && current.length > 0) {
      pages.push(current);
      current = [i];
      height = blockHeight;
    } else {
      current.push(i);
      height += blockHeight;
    }
  }

  if (current.length > 0) pages.push(current);

  return pages.length > 0 ? pages : [blockHeights.map((_, i) => i)];
}

/** Merge pages down to a target count (for display preferences) */
export function mergePagesToCount(pageGroups: number[][], targetCount: number): number[][] {
  if (pageGroups.length <= targetCount || targetCount < 1) return pageGroups;

  const merged: number[][] = [];
  const perPage = Math.ceil(pageGroups.length / targetCount);

  for (let i = 0; i < pageGroups.length; i += perPage) {
    merged.push(pageGroups.slice(i, i + perPage).flat());
  }

  return merged;
}

export function blocksToPageContent(blocks: string[], indices: number[]): string {
  return indices
    .map((i) => blocks[i])
    .filter(Boolean)
    .join("\n\n")
    .trim();
}
