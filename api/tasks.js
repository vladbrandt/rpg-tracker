import { validateAuth, cors } from './_auth.js';
import { DB, queryDB, createPage, updatePage, getTitle, getSelect, getRelationIds } from './_notion.js';
import { title, select, relation } from './_notion.js';

function fmt(page) {
  return {
    id: page.id,
    name: getTitle(page),
    skill: getSelect(page, 'Навык'),
    status: getSelect(page, 'Статус'),
    chapterIds: getRelationIds(page, 'Глава'),
  };
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!validateAuth(req, res)) return;

  try {
    if (req.method === 'GET') {
      const { chapterId, status } = req.query;
      let filter;
      if (chapterId) {
        filter = { property: 'Глава', relation: { contains: chapterId } };
        if (status) filter = { and: [filter, { property: 'Статус', select: { equals: status } }] };
      } else if (status) {
        filter = { property: 'Статус', select: { equals: status } };
      }
      const pages = await queryDB(DB.tasks, filter);
      return res.json({ tasks: pages.map(fmt) });
    }

    if (req.method === 'POST') {
      const { name, skill, chapterId } = req.body;
      const props = {
        Название: title(name),
        Навык: select(skill),
        Статус: select('todo'),
      };
      if (chapterId) props['Глава'] = relation([chapterId]);
      const page = await createPage(DB.tasks, props);
      return res.json({ task: fmt(page) });
    }

    if (req.method === 'PATCH') {
      const { id, status, name } = req.body;
      const props = {};
      if (status) props['Статус'] = select(status);
      if (name) props['Название'] = title(name);
      const page = await updatePage(id, props);
      return res.json({ task: fmt(page) });
    }

    if (req.method === 'DELETE') {
      const { id } = req.body;
      await notionReq('PATCH', `/pages/${id}`, { archived: true });
      return res.json({ ok: true });
    }

    res.status(405).end();
  } catch (e) {
    console.error('tasks error:', e.message);
    res.status(500).json({ error: e.message });
  }
}
