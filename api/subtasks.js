import { validateAuth, cors } from './_auth.js';
import { DB, queryDB, createPage, updatePage, getTitle, getCheckbox, getRelationIds } from './_notion.js';
import { title, checkbox, relation } from './_notion.js';

const SUBTASKS_DB = '46f6737f-543c-41aa-871a-d15c3f749efa';

function fmt(page) {
  return {
    id: page.id,
    name: getTitle(page),
    done: getCheckbox(page, 'Выполнено'),
    taskId: getRelationIds(page, 'Задача')[0] ?? null,
  };
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!validateAuth(req, res)) return;

  try {
    if (req.method === 'GET') {
      const { taskId } = req.query;
      if (!taskId) return res.status(400).json({ error: 'taskId required' });
      const pages = await queryDB(SUBTASKS_DB, {
        property: 'Задача', relation: { contains: taskId }
      });
      return res.json({ subtasks: pages.map(fmt) });
    }

    if (req.method === 'POST') {
      const { name, taskId } = req.body;
      const page = await createPage(SUBTASKS_DB, {
        Название: title(name),
        Задача: relation([taskId]),
        Выполнено: checkbox(false),
      });
      return res.json({ subtask: fmt(page) });
    }

    if (req.method === 'PATCH') {
      const { id, done } = req.body;
      const page = await updatePage(id, { Выполнено: checkbox(done) });
      return res.json({ subtask: fmt(page) });
    }

    res.status(405).end();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
