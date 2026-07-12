import express from 'express';
import prisma from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

router.get('/fuel', authorize('FLEET_MANAGER', 'FINANCIAL_ANALYST'), async (req, res) => {
  try {
    const { vehicleId } = req.query;
    const where = vehicleId ? { vehicleId } : {};

    const logs = await prisma.fuelLog.findMany({
      where,
      include: { vehicle: true, trip: true },
      orderBy: { date: 'desc' },
    });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/expenses', authorize('FLEET_MANAGER', 'FINANCIAL_ANALYST'), async (req, res) => {
  try {
    const { vehicleId, type } = req.query;
    const where = {};
    if (vehicleId) where.vehicleId = vehicleId;
    if (type) where.type = type;

    const expenses = await prisma.expense.findMany({
      where,
      include: { vehicle: true, trip: true },
      orderBy: { date: 'desc' },
    });
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/fuel', authorize('FLEET_MANAGER', 'FINANCIAL_ANALYST'), async (req, res) => {
  try {
    const { vehicleId, tripId, liters, cost, date } = req.body;

    const log = await prisma.fuelLog.create({
      data: {
        vehicleId,
        tripId: tripId || null,
        liters: parseFloat(liters),
        cost: parseFloat(cost),
        date: date ? new Date(date) : new Date(),
      },
      include: { vehicle: true },
    });

    await prisma.expense.create({
      data: {
        vehicleId,
        tripId: tripId || null,
        type: 'FUEL',
        amount: parseFloat(cost),
        description: `Fuel log: ${liters}L`,
        date: date ? new Date(date) : new Date(),
      },
    });

    res.status(201).json(log);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/expenses', authorize('FLEET_MANAGER', 'FINANCIAL_ANALYST'), async (req, res) => {
  try {
    const { vehicleId, tripId, type, amount, description, date } = req.body;

    const expense = await prisma.expense.create({
      data: {
        vehicleId,
        tripId: tripId || null,
        type: type || 'OTHER',
        amount: parseFloat(amount),
        description,
        date: date ? new Date(date) : new Date(),
      },
      include: { vehicle: true },
    });
    res.status(201).json(expense);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
