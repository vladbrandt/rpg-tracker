import { validateAuth, cors } from './_auth.js';
import { DB, queryDB, createPage, updatePage, getTitle, getSelect, getCheckbox, getNumber, getRelationIds } from './_notion.js';
import { title, select, checkbox, num, relation } from './_notion.js';

function fmt(page) {
  return {
    id: page.id,
    name: getTitle(page),
    skill: getSelect(page, 'Навык'),
    balls: getNumber(page, 'Баллы'),
    isCheckpoint: getCheckbox(page, 'Чекпоинт главы'),
    received: getCheckbox(page, 'Получено'),
    chapterIds: getRelationIds(page, 'Глава'),
  };
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!validateAuth(req, res)) return;

  try {
    if (req.method === 'GET') {
      const { skill } = req.query;
      const filter = skill
        ? { property: 'Навык', select: { equals: skill } }
        : undefined;
      const pages = await queryDB(DB.achievements, filter, [
        { property: 'Навык', direction: 'ascending' }
      ]);
      return res.json({ achievements: pages.map(fmt) });
    }

    if (req.method === 'POST') {
      const { name, skill, isCheckpoint, chapterId } = req.body;
      const props = {
        Название: title(name),
        Навык: select(skill),
        Баллы: num(10),
        'Чекпоинт главы': checkbox(isCheckpoint || false),
        Получено: checkbox(false),
      };
      if (chapterId) props['Глава'] = relation([chapterId]);
      const page = await createPage(DB.achievements, props);
      return res.json({ achievement: fmt(page) });
    }

    if (req.method === 'PATCH') {
      const { id, received } = req.body;
      const page = await updatePage(id, { Получено: checkbox(received) });
      return res.json({ achievement: fmt(page) });
    }

    res.status(405).end();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
