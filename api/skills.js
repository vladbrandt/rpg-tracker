import { validateAuth, cors } from './_auth.js';
import { DB, queryDB, getSelect, getCheckbox, getNumber, getRelationIds } from './_notion.js';

const SKILLS = ['Маркетинг', 'SPOTONE', 'Личное'];
const BALLS_PER_LEVEL = 20;

export async function computeSkills() {
  const balls = { Маркетинг: 0, SPOTONE: 0, Личное: 0 };

  // +1 ball per done task
  const doneTasks = await queryDB(DB.tasks, {
    property: 'Статус', select: { equals: 'done' }
  });
  for (const t of doneTasks) {
    const skill = getSelect(t, 'Навык');
    if (skill && balls[skill] !== undefined) balls[skill]++;
  }

  // +1 ball per done habit log (via habit's skill)
  const doneLogs = await queryDB(DB.habitLogs, {
    property: 'Выполнено', checkbox: { equals: true }
  });
  const habitIds = [...new Set(doneLogs.flatMap(l => getRelationIds(l, 'Привычка')))];
  const habitSkillMap = {};
  if (habitIds.length > 0) {
    const habits = await queryDB(DB.habits, {
      or: habitIds.map(id => ({ property: 'Название', title: { is_not_empty: true } }))
    });
    for (const h of habits) {
      habitSkillMap[h.id] = getSelect(h, 'Навык');
    }
  }
  for (const log of doneLogs) {
    const habitId = getRelationIds(log, 'Привычка')[0];
    const skill = habitSkillMap[habitId];
    if (skill && balls[skill] !== undefined) balls[skill]++;
  }

  // +10 balls per received achievement
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
    res.status(500).json({ error: e.message });
  }
}
