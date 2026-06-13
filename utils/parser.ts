import type { NoteDB } from '../types';

/**
 * 从文本内容中解析所有 [[title]] 引用
 * 返回匹配到的标题列表（去重）
 */
export function parseLinks(content: string): string[] {
  if (!content) return [];

  const regex = /\[\[([^\]]+)\]\]/g;
  const titles: string[] = [];
  const seen = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    const title = match[1].trim();
    if (title && !seen.has(title.toLowerCase())) {
      seen.add(title.toLowerCase());
      titles.push(title);
    }
  }

  return titles;
}

/**
 * 通过标题查找便签（大小写不敏感、去除首尾空格）
 */
export function findNoteByTitle(notes: NoteDB[], title: string): NoteDB | undefined {
  const trimmed = title.trim().toLowerCase();
  return notes.find((n) => n.title.trim().toLowerCase() === trimmed);
}

/**
 * 将内容中的 [[title]] 替换为可点击的链接标记
 * 返回 HTML 字符串，[[title]] 被替换为高亮样式
 */
export function renderContentWithLinks(
  content: string,
  validNoteIds: Set<string>,
  notes: NoteDB[]
): string {
  if (!content) return '';

  // 转义 HTML 特殊字符
  let html = escapeHtml(content);

  // 替换 [[title]] 为高亮链接
  html = html.replace(
    /\[\[([^\]]+)\]\]/g,
    (_match: string, title: string) => {
      const trimmedTitle = title.trim();
      const target = findNoteByTitle(notes, trimmedTitle);
      if (target) {
        return `<span class="link-ref" data-note-id="${target.id}" title="跳转到: ${escapeHtml(target.title)}">📎${escapeHtml(trimmedTitle)}</span>`;
      }
      // 未匹配的链接显示为灰色
      return `<span class="link-ref-unresolved" title="未找到便签: ${escapeHtml(trimmedTitle)}">📎${escapeHtml(trimmedTitle)}</span>`;
    }
  );

  return html;
}

/**
 * 转义 HTML 特殊字符
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (c) => map[c] || c);
}

/**
 * 获取便签内容的纯文本摘要（去除 [[ 语法标记，截取前 N 个字符）
 */
export function getContentPreview(content: string, maxLength: number = 100): string {
  if (!content) return '（空内容）';

  // 去除 [[title]] 标记，保留标题文字
  const plain = content.replace(/\[\[([^\]]+)\]\]/g, '$1').trim();
  if (plain.length <= maxLength) return plain;
  return plain.substring(0, maxLength) + '…';
}

/**
 * 搜索内容中的匹配位置
 */
export function findSearchMatches(
  text: string,
  query: string
): Array<[number, number]> {
  if (!query || !text) return [];

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const matches: Array<[number, number]> = [];
  let startIndex = 0;

  while (startIndex < lowerText.length) {
    const index = lowerText.indexOf(lowerQuery, startIndex);
    if (index === -1) break;
    matches.push([index, index + query.length]);
    startIndex = index + 1;
  }

  return matches;
}

/**
 * 高亮显示搜索匹配的文本
 */
export function highlightMatches(
  text: string,
  query: string
): string {
  if (!query || !text) return escapeHtml(text);

  const matches = findSearchMatches(text, query);
  if (matches.length === 0) return escapeHtml(text);

  let result = '';
  let lastEnd = 0;

  for (const [start, end] of matches) {
    result += escapeHtml(text.substring(lastEnd, start));
    result += `<mark class="search-highlight">${escapeHtml(text.substring(start, end))}</mark>`;
    lastEnd = end;
  }
  result += escapeHtml(text.substring(lastEnd));

  return result;
}
