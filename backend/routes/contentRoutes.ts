import { Router, Request, Response, NextFunction } from 'express';
import pool from '../db.js';
import { verifyToken } from '../services/authService.js';

const router = Router();

function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  const token = authHeader.slice(7);
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
  (req as any).userUid = decoded.uid;
  next();
}

router.get('/articles', requireAuth, async (req: Request, res: Response) => {
  const uid = (req as any).userUid;
  const result = await pool.query(
    'SELECT id, title, topic, category, content, image_url, created_at FROM articles WHERE user_uid = $1 ORDER BY created_at DESC',
    [uid]
  );
  return res.json(result.rows);
});

router.post('/articles', requireAuth, async (req: Request, res: Response) => {
  const uid = (req as any).userUid;
  const { title, topic, category, content, imageUrl } = req.body;
  const result = await pool.query(
    'INSERT INTO articles (user_uid, title, topic, category, content, image_url) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
    [uid, title, topic, category, content, imageUrl]
  );
  return res.json(result.rows[0]);
});

router.delete('/articles/:id', requireAuth, async (req: Request, res: Response) => {
  const uid = (req as any).userUid;
  const { id } = req.params;
  await pool.query('DELETE FROM articles WHERE id = $1 AND user_uid = $2', [id, uid]);
  return res.json({ success: true });
});

router.get('/ebooks', requireAuth, async (req: Request, res: Response) => {
  const uid = (req as any).userUid;
  const result = await pool.query(
    'SELECT id, title, author_name, publisher, type, content, created_at FROM ebooks WHERE user_uid = $1 ORDER BY created_at DESC',
    [uid]
  );
  return res.json(result.rows);
});

router.post('/ebooks', requireAuth, async (req: Request, res: Response) => {
  const uid = (req as any).userUid;
  const { title, authorName, publisher, type, content } = req.body;
  const result = await pool.query(
    'INSERT INTO ebooks (user_uid, title, author_name, publisher, type, content) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
    [uid, title, authorName, publisher, type, content]
  );
  return res.json(result.rows[0]);
});

router.delete('/ebooks/:id', requireAuth, async (req: Request, res: Response) => {
  const uid = (req as any).userUid;
  const { id } = req.params;
  await pool.query('DELETE FROM ebooks WHERE id = $1 AND user_uid = $2', [id, uid]);
  return res.json({ success: true });
});

export default router;
