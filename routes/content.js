import { Router } from 'express';
import db from '../database/Database.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { SocketManager } from '../sockets/SocketManager.js';

const router = Router();

function rowsToObject(rows) {
  const obj = {};
  for (const row of rows) {
    let val = row.value;
    if (row.type === 'boolean') val = val === '1' || val === 'true';
    else if (row.type === 'number') val = Number(val);
    obj[row.key] = val;
  }
  return obj;
}

router.get('/', (req, res) => {
  try {
    res.json(rowsToObject(db.all(`SELECT * FROM site_content ORDER BY key ASC`)));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch content' });
  }
});

router.put('/', authenticate, requireAdmin, (req, res) => {
  try {
    const upsert = `INSERT INTO site_content (key, value, type, updated_at)
      VALUES (?, ?, ?, unixepoch())
      ON CONFLICT(key) DO UPDATE SET value=excluded.value, type=COALESCE(excluded.type,type), updated_at=unixepoch()`;
    for (const [key, value] of Object.entries(req.body)) {
      let type = 'text';
      let strVal = String(value ?? '');
      if (typeof value === 'boolean') { type = 'boolean'; strVal = value ? '1' : '0'; }
      else if (typeof value === 'number') { type = 'number'; strVal = String(value); }
      db.run(upsert, [key, strVal, type]);
    }
    const result = rowsToObject(db.all(`SELECT * FROM site_content ORDER BY key ASC`));
    SocketManager.emitContentUpdate({ content: result });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save content' });
  }
});

export default router;
