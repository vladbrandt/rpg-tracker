const NOTION_VERSION = '2022-06-28';
const BASE = 'https://api.notion.com/v1';

export const DB = {
  chapters:    '03a8ce8416d8402285dda192407a79e9',
  weeks:       '3b6770e3f042445d8e0c6d3788712673',
  habits:      'ddbe6e06a9cb42fdaea6b619cb3c772a',
  tasks:       '712dea30a9a54cfbb4645c5836bfb815',
  habitLogs:   'a8dd23eb6843499f9a75284d5cfe1bab',
  achievements:'5e945337da5b479c99d22159b629bfba',
};

function headers() {
  return {
    'Authorization': `Bearer ${process.env.NOTION_TOKEN}`,
    'Notion-Version': NOTION_VERSION,
    'Content-Type': 'application/json',
  };
}

export async function notionReq(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: headers(),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Notion ${res.status}: ${text}`);
  }
  return res.json();
}

export async function queryDB(dbId, filter, sorts) {
  const results = [];
  let cursor = undefined;
  do {
    const body = { page_size: 100 };
    if (filter) body.filter = filter;
    if (sorts) body.sorts = sorts;
    if (cursor) body.start_cursor = cursor;
    const data = await notionReq('POST', `/databases/${dbId}/query`, body);
    results.push(...data.results);
    cursor = data.has_more ? data.next_cursor : null;
  } while (cursor);
  return results;
}

export async function createPage(dbId, properties) {
  return notionReq('POST', '/pages', {
    parent: { database_id: dbId },
    properties,
  });
}

export async function updatePage(pageId, properties) {
  return notionReq('PATCH', `/pages/${pageId}`, { properties });
}

// ── Property helpers ────────────────────────────────────────────────────────

export function title(text) {
  return { title: [{ text: { content: String(text) } }] };
}
export function richText(text) {
  return { rich_text: [{ text: { content: String(text) } }] };
}
export function select(name) {
  return { select: { name } };
}
export function checkbox(val) {
  return { checkbox: Boolean(val) };
}
export function num(val) {
  return { number: Number(val) };
}
export function relation(ids) {
  return { relation: ids.map(id => ({ id })) };
}
export function date(start) {
  return { date: { start } };
}

// ── Read helpers ─────────────────────────────────────────────────────────────

export function getTitle(page) {
  const prop = Object.values(page.properties).find(p => p.type === 'title');
  return prop?.title?.[0]?.plain_text ?? '';
}
export function getSelect(page, key) {
  return page.properties[key]?.select?.name ?? null;
}
export function getCheckbox(page, key) {
  return page.properties[key]?.checkbox ?? false;
}
export function getNumber(page, key) {
  return page.properties[key]?.number ?? 0;
}
export function getRelationIds(page, key) {
  return (page.properties[key]?.relation ?? []).map(r => r.id);
}
export function getDate(page, key) {
  return page.properties[key]?.date?.start ?? null;
}
