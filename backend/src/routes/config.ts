import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs/promises';
import JSON5 from 'json5';

const router = Router();

function candidatePaths(): string[] {
  // Prefer cwd so running via npm scripts from backend works in dev/prod
  const fromCwd = path.resolve(process.cwd(), 'customization.json');
  // Fallbacks for uncommon invocations (e.g., executing built files directly)
  const fromDist = path.resolve(__dirname, '..', '..', 'customization.json');
  const fromSrc = path.resolve(__dirname, '..', 'customization.json');
  return [fromCwd, fromDist, fromSrc];
}

router.get('/', async (req: Request, res: Response) => {
  const paths = candidatePaths();
  for (const filePath of paths) {
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      const json = JSON5.parse(data);
      return res.json(json);
    } catch (_) {
      // try next candidate
    }
  }
  return res.status(404).json({ error: 'customization.json not found or invalid' });
});

export default router;
