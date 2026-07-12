import express from 'express';
import prisma from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { isLicenseValid } from '../utils/rules.js';

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const { status, search } = req.query;
    const where = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { licenseNumber: { contains: search } },
      ];
    }

    const drivers = await prisma.driver.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    const enriched = drivers.map((d) => ({
      ...d,
      licenseValid: isLicenseValid(d.licenseExpiry),
      licenseExpiringSoon:
        isLicenseValid(d.licenseExpiry) &&
        new Date(d.licenseExpiry) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    }));

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/available', async (req, res) => {
  try {
    const drivers = await prisma.driver.findMany({
      where: { status: 'AVAILABLE' },
      orderBy: { name: 'asc' },
    });
    const available = drivers.filter((d) => isLicenseValid(d.licenseExpiry));
    res.json(available);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/expiring-licenses', authorize('SAFETY_OFFICER', 'FLEET_MANAGER'), async (req, res) => {
  try {
    const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const drivers = await prisma.driver.findMany({
      where: {
        licenseExpiry: { lte: thirtyDays },
        status: { not: 'SUSPENDED' },
      },
      orderBy: { licenseExpiry: 'asc' },
    });
    res.json(drivers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const driver = await prisma.driver.findUnique({
      where: { id: req.params.id },
      include: { trips: { orderBy: { createdAt: 'desc' }, take: 10, include: { vehicle: true } } },
    });
    if (!driver) return res.status(404).json({ error: 'Driver not found' });
    res.json({ ...driver, licenseValid: isLicenseValid(driver.licenseExpiry) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authorize('FLEET_MANAGER', 'SAFETY_OFFICER'), async (req, res) => {
  try {
    const { name, licenseNumber, licenseCategory, licenseExpiry, contactNumber, safetyScore } = req.body;

    const existing = await prisma.driver.findUnique({ where: { licenseNumber } });
    if (existing) {
      return res.status(400).json({ error: 'License number must be unique' });
    }

    const driver = await prisma.driver.create({
      data: {
        name,
        licenseNumber,
        licenseCategory,
        licenseExpiry: new Date(licenseExpiry),
        contactNumber,
        safetyScore: parseFloat(safetyScore || 100),
      },
    });
    res.status(201).json(driver);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authorize('FLEET_MANAGER', 'SAFETY_OFFICER'), async (req, res) => {
  try {
    const { name, licenseNumber, licenseCategory, licenseExpiry, contactNumber, safetyScore, status } = req.body;

    const driver = await prisma.driver.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(licenseNumber && { licenseNumber }),
        ...(licenseCategory && { licenseCategory }),
        ...(licenseExpiry && { licenseExpiry: new Date(licenseExpiry) }),
        ...(contactNumber && { contactNumber }),
        ...(safetyScore !== undefined && { safetyScore: parseFloat(safetyScore) }),
        ...(status && { status }),
      },
    });
    res.json(driver);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
