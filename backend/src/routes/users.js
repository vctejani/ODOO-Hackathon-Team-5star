import express from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Protect all routes under this router - only admins (FLEET_MANAGER) can manage employees
router.use(authenticate);
router.use(authorize('FLEET_MANAGER'));

// GET /api/users - List all users with details
router.get('/', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        contactNumber: true,
        licenseNumber: true,
        licenseCategory: true,
        licenseExpiry: true,
        certificationNumber: true,
        safetyRegion: true,
        employeeId: true,
        department: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/users - Create new employee user with role-specific details
router.post('/', async (req, res) => {
  try {
    const {
      email,
      password,
      name,
      role,
      contactNumber,
      // Driver specific
      licenseNumber,
      licenseCategory,
      licenseExpiry,
      // Safety Officer specific
      certificationNumber,
      safetyRegion,
      // Financial Analyst specific
      employeeId,
      department,
    } = req.body;

    // Common validations
    if (!email || !password || !name || !role) {
      return res.status(400).json({ error: 'Name, email, password, and role are required.' });
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email is already registered.' });
    }

    // Role-specific validations
    if (role === 'DRIVER') {
      if (!licenseNumber || !licenseCategory || !licenseExpiry) {
        return res.status(400).json({ error: 'License number, category, and expiry date are required for Drivers.' });
      }
      // Check if license number is unique in User and Driver tables
      const existingLicenseUser = await prisma.user.findUnique({ where: { licenseNumber } });
      const existingDriver = await prisma.driver.findUnique({ where: { licenseNumber } });
      if (existingLicenseUser || existingDriver) {
        return res.status(400).json({ error: 'License number must be unique.' });
      }
    } else if (role === 'SAFETY_OFFICER') {
      if (!certificationNumber || !safetyRegion) {
        return res.status(400).json({ error: 'Certification number and safety region are required for Safety Officers.' });
      }
    } else if (role === 'FINANCIAL_ANALYST') {
      if (!employeeId || !department) {
        return res.status(400).json({ error: 'Employee ID and department are required for Financial Analysts.' });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the User record
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role,
        contactNumber,
        ...(role === 'DRIVER' && {
          licenseNumber,
          licenseCategory,
          licenseExpiry: new Date(licenseExpiry),
        }),
        ...(role === 'SAFETY_OFFICER' && {
          certificationNumber,
          safetyRegion,
        }),
        ...(role === 'FINANCIAL_ANALYST' && {
          employeeId,
          department,
        }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    // If driver, also create matching entry in Driver table so they are assignable to trips
    if (role === 'DRIVER') {
      await prisma.driver.create({
        data: {
          name,
          licenseNumber,
          licenseCategory,
          licenseExpiry: new Date(licenseExpiry),
          contactNumber: contactNumber || '',
          safetyScore: 100,
          status: 'AVAILABLE',
        },
      });
    }

    res.status(201).json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/users/:id - Delete an employee user
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Protect against self-deletion
    if (user.email === req.user.email) {
      return res.status(400).json({ error: 'Admins cannot delete their own account.' });
    }

    // Handle Driver table synchronization if the deleted user is a DRIVER
    if (user.role === 'DRIVER' && user.licenseNumber) {
      const driver = await prisma.driver.findUnique({ where: { licenseNumber: user.licenseNumber } });
      if (driver) {
        // Check if driver has active or past trips
        const tripCount = await prisma.trip.count({ where: { driverId: driver.id } });
        if (tripCount > 0) {
          // Trips exist, so suspend driver instead of deletion to preserve historical data
          await prisma.driver.update({
            where: { id: driver.id },
            data: { status: 'SUSPENDED' },
          });
        } else {
          // No trips, safe to delete from Driver table
          await prisma.driver.delete({ where: { id: driver.id } });
        }
      }
    }

    await prisma.user.delete({ where: { id } });
    res.json({ message: 'User deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
