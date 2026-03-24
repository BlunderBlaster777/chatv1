import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import { authenticate, AuthRequest } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { config } from '../config/config';

const router = Router();
const prisma = new PrismaClient();

router.post('/upload', authenticate, upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) { res.status(400).json({ error: 'No file uploaded' }); return; }
    const fileRecord = await prisma.file.create({
      data: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        url: `/api/files/${req.file.filename}`,
        uploadedById: req.userId!,
        messageId: req.body.messageId || null,
      },
    });
    res.status(201).json(fileRecord);
  } catch { res.status(500).json({ error: 'Upload failed' }); }
});

router.get('/:filename', (req, res) => {
  const filename = path.basename(req.params.filename);
  res.sendFile(filename, { root: path.resolve(config.uploadDir) }, (err) => {
    if (err) res.status(404).json({ error: 'File not found' });
  });
});

export default router;
