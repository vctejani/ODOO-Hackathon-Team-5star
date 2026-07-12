import express from 'express';
import prisma from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

router.get('/', authorize('FLEET_MANAGER', 'FINANCIAL_ANALYST'), async (req, res) => {
  try {
    const { status, vehicleId } = req.query;
    const where = {};
    if (status) where.status = status;
    if (vehicleId) where.vehicleId = vehicleId;

    const logs = await prisma.maintenanceLog.findMany({
      where,
      include: { vehicle: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authorize('FLEET_MANAGER'), async (req, res) => {
  try {
    const { vehicleId, description, cost } = req.body;

    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
    if (vehicle.status === 'RETIRED') {
      return res.status(400).json({ error: 'Cannot add maintenance to retired vehicle' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const log = await tx.maintenanceLog.create({
        data: {
          vehicleId,
          description,
          cost: parseFloat(cost || 0),
          status: 'ACTIVE',
        },
        include: { vehicle: true },
      });

      await tx.vehicle.update({
        where: { id: vehicleId },
        data: { status: 'IN_SHOP' },
      });

      if (cost && parseFloat(cost) > 0) {
        await tx.expense.create({
          data: {
            vehicleId,
            type: 'MAINTENANCE',
            amount: parseFloat(cost),
            description,
            date: new Date(),
          },
        });
      }

      return log;
    });

    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/close', authorize('FLEET_MANAGER'), async (req, res) => {
  try {
    const log = await prisma.maintenanceLog.findUnique({
      where: { id: req.params.id },
      include: { vehicle: true },
    });
    if (!log) return res.status(404).json({ error: 'Maintenance log not found' });
    if (log.status === 'CLOSED') {
      return res.status(400).json({ error: 'Maintenance already closed' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.maintenanceLog.update({
        where: { id: req.params.id },
        data: { status: 'CLOSED', endDate: new Date() },
        include: { vehicle: true },
      });

      if (log.vehicle.status !== 'RETIRED') {
        await tx.vehicle.update({
          where: { id: log.vehicleId },
          data: { status: 'AVAILABLE' },
        });
      }

      return updated;
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
