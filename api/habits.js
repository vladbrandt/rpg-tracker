import { validateAuth, cors } from './_auth.js';
import { DB, queryDB, createPage, updatePage, getTitle, getSelect, getCheckbox, getRelationIds } from './_notion.js';
import { title, select, checkbox, relation } from './_notion.js';

function fmtHabit(page) {
  return {
    id: page.id,
    name: getTitle(page),
    skill: getSelect(page, 'Навык'),
    active: getCheckbox(page, 'Активна'),
  };
}

function fmtLog(page) {
  return {
    id: page.id,
    name: getTitle(page),
    habitId: getRelationIds(page, 'Привычка')[0] ?? null,
    weekId: getRelationIds(page, 'Неделя')[0] ?? null,
    done: getCheckbox(page, 'Выполнено'),
  };
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!validateAuth(req, res)) return;

  const isLogs = req.url.includes('habit-logs') || req.query.logs === '1';

  try {
    // ── Habit Logs ────────────────────────────────────────────────────────
    if (isLogs) {
      if (req.method === 'GET') {
        const { weekId } = req.query;
        const filter = weekId
          ? { property: 'Неделя', relation: { contains: weekId } }
          : undefined;
        const pages = await queryDB(DB.habitLogs, filter);
        return res.json({ logs: pages.map(fmtLog) });
      }

      if (req.method === 'PATCH') {
        const { id, done } = req.body;
        const page = await updatePage(id, { Выполнено: checkbox(done) });
        return res.json({ log: fmtLog(page) });
      }
    }

    // ── Habits ────────────────────────────────────────────────────────────
    if (req.method === 'GET') {
      const pages = await queryDB(DB.habits);
      return res.json({ habits: pages.map(fmtHabit) });
    }

    if (req.method === 'POST') {
      const { name, skill } = req.body;
      const page = await createPage(DB.habits, {
        Название: title(name),
        Навык: select(skill),
        Активна: checkbox(true),
      });
      return res.json({ habit: fmtHabit(page) });
    }

    if (req.method === 'PATCH') {
      const { id, active } = req.body;
      const page = await updatePage(id, { Активна: checkbox(active) });
      return res.json({ habit: fmtHabit(page) });
    }

    res.status(405).end();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
