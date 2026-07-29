import { validateAuth, cors } from './_auth.js';
import { DB, queryDB, getSelect, getCheckbox, getNumber, getRelationIds } from './_notion.js';

const SKILLS = ['Маркетинг', 'SPOTONE', 'Личное'];
const BALLS_PER_LEVEL = 20;

export async function computeSkills() {
  const balls = { Маркетинг: 0, SPOTONE: 0, Личное: 0 };

  // +1 за выполненную задачу
  const doneTasks = await queryDB(DB.tasks, {
    property: 'Статус', select: { equals: 'done' }
  });
  for (const t of doneTasks) {
    const skill = getSelect(t, 'Навык');
    if (skill && balls[skill] !== undefined) balls[skill]++;
  }

  // +1 за выполненный лог привычки
  const doneLogs = await queryDB(DB.habitLogs, {
    property: 'Выполнено', checkbox: { equals: true }
  });
  if (doneLogs.length > 0) {
    const habits = await queryDB(DB.habits);
    const habitMap = Object.fromEntries(habits.map(h => [h.id, getSelect(h, 'Навык')]));
    for (const log of doneLogs) {
      const hId = getRelationIds(log, 'Привычка')[0];
      const skill = habitMap[hId];
      if (skill && balls[skill] !== undefined) balls[skill]++;
    }
  }

  // +N за достижения
  const received = await queryDB(DB.achievements, {
    property: 'Получено', checkbox: { equals: true }
  });
  for (const a of received) {
    const skill = getSelect(a, 'Навык');
    const pts = getNumber(a, 'Баллы');
    if (skill && balls[skill] !== undefined) balls[skill] += pts;
  }

  return SKILLS.map(name => ({
    name,
    balls: balls[name],
    level: Math.floor(balls[name] / BALLS_PER_LEVEL),
    nextLevelAt: (Math.floor(balls[name] / BALLS_PER_LEVEL) + 1) * BALLS_PER_LEVEL,
  }));
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!validateAuth(req, res)) return;
  try {
    const skills = await computeSkills();
    res.json({ skills });
  } catch (e) {
    console.error('skills error:', e.message);
    res.status(500).json({ error: e.message });
  }
}
