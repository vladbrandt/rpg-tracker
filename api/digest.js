import { DB, queryDB, getTitle, getSelect, getCheckbox, getRelationIds } from './_notion.js';

const ALLOWED_USER_ID = 1040381598;

async function sendMessage(text) {
  await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: ALLOWED_USER_ID,
      text,
      parse_mode: 'HTML',
    }),
  });
}

export default async function handler(req, res) {
  // Cron jobs from Vercel are GET requests
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).end();

  try {
    // Get active week
    const weeks = await queryDB(DB.weeks, {
      property: 'Статус', select: { equals: 'Активная' }
    });
    const week = weeks[0];
    if (!week) {
      await sendMessage('📋 Нет активной недели — создай новую в трекере!');
      return res.json({ ok: true });
    }
    const weekId = week.id;
    const weekName = week.properties['Название']?.title?.[0]?.plain_text ?? 'Неделя';

    // Done tasks this week
    const tasks = await queryDB(DB.tasks, {
      and: [
        { property: 'Неделя', relation: { contains: weekId } },
        { property: 'Статус', select: { equals: 'done' } },
      ]
    });

    // Habit logs this week
    const logs = await queryDB(DB.habitLogs, {
      property: 'Неделя', relation: { contains: weekId }
    });
    const doneLogs = logs.filter(l => getCheckbox(l, 'Выполнено'));

    // Balls gained
    const ballsBySkill = { Маркетинг: 0, SPOTONE: 0, Личное: 0 };
    for (const t of tasks) {
      const skill = getSelect(t, 'Навык');
      if (skill && ballsBySkill[skill] !== undefined) ballsBySkill[skill]++;
    }

    // Get habit skills for logs
    const habitIds = [...new Set(doneLogs.flatMap(l => getRelationIds(l, 'Привычка')))];
    if (habitIds.length > 0) {
      const habits = await queryDB(DB.habits);
      const habitMap = Object.fromEntries(habits.map(h => [h.id, getSelect(h, 'Навык')]));
      for (const log of doneLogs) {
        const hId = getRelationIds(log, 'Привычка')[0];
        const skill = habitMap[hId];
        if (skill && ballsBySkill[skill] !== undefined) ballsBySkill[skill]++;
      }
    }

    const totalBalls = Object.values(ballsBySkill).reduce((a, b) => a + b, 0);
    const skillLines = Object.entries(ballsBySkill)
      .map(([s, b]) => `  • ${s}: +${b} баллов`)
      .join('\n');

    const taskNames = tasks.slice(0, 5).map(t => `  ✓ ${getTitle(t)}`).join('\n');
    const moreCount = tasks.length > 5 ? `\n  ...и ещё ${tasks.length - 5}` : '';

    const msg = [
      `⚔️ <b>Итог недели — ${weekName}</b>`,
      '',
      `📊 <b>Баллы за неделю: +${totalBalls}</b>`,
      skillLines,
      '',
      `✅ Задач выполнено: ${tasks.length}`,
      taskNames || '  (нет выполненных задач)',
      moreCount,
      '',
      `🔁 Привычек отмечено: ${doneLogs.length} из ${logs.length}`,
      '',
      '🎮 Открой трекер чтобы начать новую неделю!',
    ].filter(Boolean).join('\n');

    await sendMessage(msg);
    res.json({ ok: true, totalBalls, tasksCount: tasks.length });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
}
