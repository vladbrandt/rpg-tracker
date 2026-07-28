import { validateAuth, cors } from './_auth.js';
import { DB, queryDB, createPage, updatePage, getTitle, getSelect, getNumber } from './_notion.js';
import { title, richText, select, num } from './_notion.js';

function fmt(page) {
  return {
    id: page.id,
    name: getTitle(page),
    narrative: page.properties['Нарратив']?.rich_text?.[0]?.plain_text ?? '',
    status: getSelect(page, 'Статус'),
    characterLevel: getNumber(page, 'Уровень персонажа'),
  };
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!validateAuth(req, res)) return;

  try {
    if (req.method === 'GET') {
      const pages = await queryDB(DB.chapters, null, [
        { property: 'Статус', direction: 'ascending' }
      ]);
      return res.json({ chapters: pages.map(fmt) });
    }

    if (req.method === 'POST') {
      const { name, narrative } = req.body;
      const page = await createPage(DB.chapters, {
        Название: title(name),
        Нарратив: richText(narrative || ''),
        Статус: select('Активная'),
      });
      return res.json({ chapter: fmt(page) });
    }

    if (req.method === 'PATCH') {
      const { id, status, characterLevel } = req.body;
      const props = {};
      if (status) props['Статус'] = select(status);
      if (characterLevel !== undefined) props['Уровень персонажа'] = num(characterLevel);
      const page = await updatePage(id, props);
      return res.json({ chapter: fmt(page) });
    }

    res.status(405).end();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
