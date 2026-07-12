import express from 'express';
import prisma from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { calcFuelCost, ensureFuelPrice, getFuelPricePerLiter } from '../lib/fuelPrice.js';

const router = express.Router();
router.use(authenticate);

router.get('/fuel-price', authorize('FLEET_MANAGER', 'FINANCIAL_ANALYST', 'DRIVER'), async (req, res) => {
  try {
    const setting = await ensureFuelPrice(prisma);
    res.json(setting);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/fuel-price', authorize('FLEET_MANAGER', 'FINANCIAL_ANALYST'), async (req, res) => {
  try {
    const { pricePerLiter } = req.body;
    const price = parseFloat(pricePerLiter);
    if (!price || price <= 0) {
      return res.status(400).json({ error: 'Fuel price must be greater than 0' });
    }

    const setting = await prisma.fuelPrice.upsert({
      where: { id: 'current' },
      update: { pricePerLiter: price },
      create: { id: 'current', pricePerLiter: price },
    });
    res.json(setting);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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
    const litersNum = parseFloat(liters);
    const pricePerLiter = await getFuelPricePerLiter(prisma);
    const fuelCost = cost !== undefined && cost !== '' && cost !== null
      ? parseFloat(cost)
      : calcFuelCost(litersNum, pricePerLiter);

    const log = await prisma.fuelLog.create({
      data: {
        vehicleId,
        tripId: tripId || null,
        liters: litersNum,
        cost: fuelCost,
        date: date ? new Date(date) : new Date(),
      },
      include: { vehicle: true },
    });

    await prisma.expense.create({
      data: {
        vehicleId,
        tripId: tripId || null,
        type: 'FUEL',
        amount: fuelCost,
        description: `Fuel log: ${litersNum}L @ $${pricePerLiter}/L`,
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
