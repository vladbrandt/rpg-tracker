import { validateAuth, cors } from './_auth.js';
import { DB, queryDB, createPage, updatePage, getTitle, getSelect, getCheckbox, getDate } from './_notion.js';
import { title, select, relation, date } from './_notion.js';

function fmt(page) {
  return {
    id: page.id,
    name: getTitle(page),
    status: getSelect(page, 'Статус'),
    startDate: getDate(page, 'Дата начала'),
    endDate: getDate(page, 'Дата конца'),
  };
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!validateAuth(req, res)) return;

  try {
    if (req.method === 'GET') {
      const pages = await queryDB(DB.weeks, null, [
        { timestamp: 'created_time', direction: 'descending' }
      ]);
      return res.json({ weeks: pages.map(fmt) });
    }

    if (req.method === 'POST') {
      // Close previous active week
      const existing = await queryDB(DB.weeks, {
        property: 'Статус', select: { equals: 'Активная' }
      });
      for (const w of existing) {
        await updatePage(w.id, { Статус: select('Завершена') });
      }

      // Create new week
      const weekNum = (existing.length + 1);
      const today = new Date().toISOString().split('T')[0];
      const weekEnd = new Date(Date.now() + 6 * 86400000).toISOString().split('T')[0];

      const weekPage = await createPage(DB.weeks, {
        Название: title(`Неделя ${weekNum}`),
        Статус: select('Активная'),
        'Дата начала': date(today),
        'Дата конца': date(weekEnd),
      });

      // Auto-create habit logs for all active habits
      const habits = await queryDB(DB.habits, {
        property: 'Активна', checkbox: { equals: true }
      });
      for (const habit of habits) {
        const habitName = habit.properties['Название']?.title?.[0]?.plain_text ?? '';
        await createPage(DB.habitLogs, {
          Название: title(habitName),
          Привычка: relation([habit.id]),
          Неделя: relation([weekPage.id]),
        });
      }

      return res.json({ week: fmt(weekPage), habitLogsCreated: habits.length });
    }

    if (req.method === 'PATCH') {
      const { id, status } = req.body;
      const page = await updatePage(id, { Статус: select(status) });
      return res.json({ week: fmt(page) });
    }

    res.status(405).end();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
