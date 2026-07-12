import express from 'express';
import prisma from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

// GET /api/off-duty - List requests
router.get('/', async (req, res) => {
  try {
    const isManager = req.user.role === 'FLEET_MANAGER';
    const where = {};
    if (!isManager) {
      where.userId = req.user.id;
    }

    const requests = await prisma.offDutyRequest.findMany({
      where,
      include: {
        user: {
          select: {
            name: true,
            email: true,
            role: true,
            licenseNumber: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/off-duty - Submit request
router.post('/', async (req, res) => {
  try {
    const { startDate, endDate, reason } = req.body;
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required.' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ error: 'Invalid dates provided.' });
    }

    if (start >= end) {
      return res.status(400).json({ error: 'Start date/time must be before end date/time.' });
    }

    const request = await prisma.offDutyRequest.create({
      data: {
        userId: req.user.id,
        startDate: start,
        endDate: end,
        reason: reason || '',
        status: 'PENDING',
      },
    });

    res.status(201).json(request);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/off-duty/:id/status - Approve or decline (Fleet Manager only)
router.put('/:id/status', authorize('FLEET_MANAGER'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['ACCEPTED', 'DECLINED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be ACCEPTED or DECLINED.' });
    }

    const request = await prisma.offDutyRequest.findUnique({ where: { id } });
    if (!request) {
      return res.status(404).json({ error: 'Request not found.' });
    }

    const updated = await prisma.offDutyRequest.update({
      where: { id },
      data: { status },
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
