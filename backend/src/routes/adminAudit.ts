import { Router } from 'express';
import { promises as fs } from 'fs';
import { asyncHandler } from '../middleware/errorHandler';
import { ensureAuditLoggerReady, getAuditLogPath } from '../utils/auditLogger';
import { setAuditContext } from '../middleware/audit';

const router = Router();

router.get('/logs', asyncHandler(async (req, res) => {
  await ensureAuditLoggerReady();
  const filePath = getAuditLogPath();
  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, '', 'utf-8');
  }

  setAuditContext(res, {
    action: 'audit_log_download',
    resource: 'audit_log',
    status: 'success',
    force: true,
  });

  const filename = `audit-log-${new Date().toISOString().replace(/[:.]/g, '-')}.log`;

  await new Promise<void>((resolve, reject) => {
    res.download(filePath, filename, (error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}));

router.delete('/logs', asyncHandler(async (req, res) => {
  await ensureAuditLoggerReady();
  const filePath = getAuditLogPath();
  await fs.writeFile(filePath, '', 'utf-8');
  setAuditContext(res, {
    action: 'audit_log_clear',
    resource: 'audit_log',
    status: 'success',
    force: true,
  });
  res.json({ message: '审计日志已清空' });
}));

export default router;
