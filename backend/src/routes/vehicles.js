import express from 'express';
import prisma from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

router.get('/', authorize('FLEET_MANAGER', 'FINANCIAL_ANALYST'), async (req, res) => {
  try {
    const { type, status, region } = req.query;
    const where = {};
    if (type) where.type = type;
    if (status) where.status = status;
    if (region) where.region = region;

    const vehicles = await prisma.vehicle.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    res.json(vehicles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/available', authorize('FLEET_MANAGER', 'DRIVER'), async (req, res) => {
  try {
    const vehicles = await prisma.vehicle.findMany({
      where: { status: 'AVAILABLE' },
      orderBy: { name: 'asc' },
    });
    res.json(vehicles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', authorize('FLEET_MANAGER', 'FINANCIAL_ANALYST'), async (req, res) => {
  try {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: req.params.id },
      include: {
        maintenanceLogs: { orderBy: { createdAt: 'desc' }, take: 5 },
        fuelLogs: { orderBy: { date: 'desc' }, take: 5 },
      },
    });
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
    res.json(vehicle);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authorize('FLEET_MANAGER'), async (req, res) => {
  try {
    const { registrationNumber, name, type, maxLoadCapacity, odometer, acquisitionCost, region } = req.body;

    const existing = await prisma.vehicle.findUnique({ where: { registrationNumber } });
    if (existing) {
      return res.status(400).json({ error: 'Registration number must be unique' });
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        registrationNumber,
        name,
        type,
        maxLoadCapacity: parseFloat(maxLoadCapacity),
        odometer: parseFloat(odometer || 0),
        acquisitionCost: parseFloat(acquisitionCost),
        region: region || 'North',
      },
    });
    res.status(201).json(vehicle);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authorize('FLEET_MANAGER'), async (req, res) => {
  try {
    const { registrationNumber, name, type, maxLoadCapacity, odometer, acquisitionCost, status, region } = req.body;

    if (registrationNumber) {
      const existing = await prisma.vehicle.findFirst({
        where: { registrationNumber, NOT: { id: req.params.id } },
      });
      if (existing) {
        return res.status(400).json({ error: 'Registration number must be unique' });
      }
    }

    const vehicle = await prisma.vehicle.update({
      where: { id: req.params.id },
      data: {
        ...(registrationNumber && { registrationNumber }),
        ...(name && { name }),
        ...(type && { type }),
        ...(maxLoadCapacity !== undefined && { maxLoadCapacity: parseFloat(maxLoadCapacity) }),
        ...(odometer !== undefined && { odometer: parseFloat(odometer) }),
        ...(acquisitionCost !== undefined && { acquisitionCost: parseFloat(acquisitionCost) }),
        ...(status && { status }),
        ...(region && { region }),
      },
    });
    res.json(vehicle);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authorize('FLEET_MANAGER'), async (req, res) => {
  try {
    await prisma.vehicle.update({
      where: { id: req.params.id },
      data: { status: 'RETIRED' },
    });
    res.json({ message: 'Vehicle retired successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
