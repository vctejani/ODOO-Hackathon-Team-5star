import express from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { isLicenseValid } from '../utils/rules.js';
import { notifyFleetManagers } from '../utils/notificationHelper.js';

const router = express.Router();
router.use(authenticate);

router.get('/', authorize('FLEET_MANAGER', 'SAFETY_OFFICER'), async (req, res) => {
  try {
    const { status, search } = req.query;
    const where = { deleted: false };
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

router.get('/available', authorize('FLEET_MANAGER', 'DRIVER'), async (req, res) => {
  try {
    const drivers = await prisma.driver.findMany({
      where: { status: 'AVAILABLE', deleted: false },
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
        deleted: false,
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

router.get('/:id', authorize('FLEET_MANAGER', 'SAFETY_OFFICER'), async (req, res) => {
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
    const existingUserLicense = await prisma.user.findUnique({ where: { licenseNumber } });
    if (existing || existingUserLicense) {
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

    // Create corresponding user record so that employees and drivers are in sync
    const email = `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}@transitops.com`;
    const existingUser = await prisma.user.findUnique({ where: { email } });
    let finalEmail = email;
    if (existingUser) {
      const cleanLicense = licenseNumber.toLowerCase().replace(/[^a-z0-9]/g, '');
      finalEmail = `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}.${cleanLicense}@transitops.com`;
    }

    const hashedPassword = await bcrypt.hash('password123', 10);
    const user = await prisma.user.create({
      data: {
        email: finalEmail,
        password: hashedPassword,
        name,
        role: 'DRIVER',
        contactNumber,
        licenseNumber,
        licenseCategory,
        licenseExpiry: new Date(licenseExpiry),
      },
    });

    // Link the driver record back to the user account
    await prisma.driver.update({
      where: { id: driver.id },
      data: { userId: user.id },
    });

    // Trigger notification
    await notifyFleetManagers(
      'Driver Registered',
      `Driver ${driver.name} (License: ${driver.licenseNumber}) was registered by ${req.user.name}.`,
      'DRIVER_CREATE'
    );

    res.status(201).json(driver);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authorize('FLEET_MANAGER', 'SAFETY_OFFICER'), async (req, res) => {
  try {
    const { name, licenseNumber, licenseCategory, licenseExpiry, contactNumber, safetyScore, status } = req.body;

    const oldDriver = await prisma.driver.findUnique({ where: { id: req.params.id } });
    if (!oldDriver) {
      return res.status(404).json({ error: 'Driver not found' });
    }

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

    if (oldDriver.licenseNumber) {
      const user = await prisma.user.findUnique({ where: { licenseNumber: oldDriver.licenseNumber } });
      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            ...(name && { name }),
            ...(licenseNumber && { licenseNumber }),
            ...(licenseCategory && { licenseCategory }),
            ...(licenseExpiry && { licenseExpiry: new Date(licenseExpiry) }),
            ...(contactNumber && { contactNumber }),
          },
        });
      }
    }

    res.json(driver);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authorize('FLEET_MANAGER'), async (req, res) => {
  try {
    const { id } = req.params;
    const driver = await prisma.driver.findUnique({ where: { id } });
    if (!driver || driver.deleted) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    await prisma.driver.update({
      where: { id },
      data: { deleted: true, status: 'SUSPENDED' }
    });

    if (driver.licenseNumber) {
      const user = await prisma.user.findUnique({ where: { licenseNumber: driver.licenseNumber } });
      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: { deleted: true }
        });
      }
    }

    // Trigger notification
    await notifyFleetManagers(
      'Driver Deleted',
      `Driver ${driver.name} was deleted by ${req.user.name}.`,
      'DRIVER_DELETE'
    );

    res.json({ message: 'Driver deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
