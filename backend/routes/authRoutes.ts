import { Router, Request, Response } from 'express';
import { registerUser, loginUser, loginWithGoogle, signToken, verifyToken, getUserByUid } from '../services/authService.js';

const router = Router();

router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, displayName } = req.body;
    if (!email || !password || !displayName) {
      return res.status(400).json({ error: 'Email, password, and name are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }
    const user = await registerUser(email, password, displayName);
    const token = signToken(user.uid, user.email);
    return res.json({ token, user: { uid: user.uid, email: user.email, displayName: user.display_name, photoURL: user.photo_url } });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    const user = await loginUser(email, password);
    const token = signToken(user.uid, user.email);
    return res.json({ token, user: { uid: user.uid, email: user.email, displayName: user.display_name, photoURL: user.photo_url } });
  } catch (err: any) {
    return res.status(401).json({ error: err.message });
  }
});

router.post('/google', async (req: Request, res: Response) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ error: 'Google ID token is required.' });
    }
    const user = await loginWithGoogle(idToken);
    const token = signToken(user.uid, user.email);
    return res.json({ token, user: { uid: user.uid, email: user.email, displayName: user.display_name, photoURL: user.photo_url } });
  } catch (err: any) {
    return res.status(401).json({ error: err.message });
  }
});

router.get('/me', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided.' });
    }
    const token = authHeader.slice(7);
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid or expired token.' });
    }
    const user = await getUserByUid(decoded.uid);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    return res.json({ uid: user.uid, email: user.email, displayName: user.display_name, photoURL: user.photo_url });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
