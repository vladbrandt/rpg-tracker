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
    weekIds: getRelationIds(page, 'Неделя'),
  };
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!validateAuth(req, res)) return;

  try {
    if (req.method === 'GET') {
      const { weekId, chapterId, status } = req.query;
      let filter;

      if (weekId) {
        filter = { property: 'Неделя', relation: { contains: weekId } };
      } else if (chapterId) {
        filter = {
          and: [
            { property: 'Глава', relation: { contains: chapterId } },
            { property: 'Неделя', relation: { is_empty: true } },
          ]
        };
        if (status) filter.and.push({ property: 'Статус', select: { equals: status } });
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
      const { id, status, weekId } = req.body;
      const props = {};
      if (status) props['Статус'] = select(status);
      if (weekId) props['Неделя'] = relation([weekId]);
      if (weekId === null) props['Неделя'] = { relation: [] };
      const page = await updatePage(id, props);
      return res.json({ task: fmt(page) });
    }

    res.status(405).end();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
