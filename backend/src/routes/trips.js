import express from 'express';
import prisma from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validateTripDispatch } from '../utils/rules.js';

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    const where = status ? { status } : {};

    const trips = await prisma.trip.findMany({
      where,
      include: { vehicle: true, driver: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(trips);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const trip = await prisma.trip.findUnique({
      where: { id: req.params.id },
      include: { vehicle: true, driver: true, fuelLogs: true, expenses: true },
    });
    if (!trip) return res.status(404).json({ error: 'Trip not found' });
    res.json(trip);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authorize('FLEET_MANAGER', 'DRIVER'), async (req, res) => {
  try {
    const { source, destination, vehicleId, driverId, cargoWeight, plannedDistance, revenue } = req.body;

    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    const driver = await prisma.driver.findUnique({ where: { id: driverId } });

    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
    if (!driver) return res.status(404).json({ error: 'Driver not found' });

    const weight = parseFloat(cargoWeight);
    if (weight > vehicle.maxLoadCapacity) {
      return res.status(400).json({
        error: `Cargo weight (${weight} kg) exceeds vehicle capacity (${vehicle.maxLoadCapacity} kg)`,
      });
    }

    const trip = await prisma.trip.create({
      data: {
        source,
        destination,
        vehicleId,
        driverId,
        cargoWeight: weight,
        plannedDistance: parseFloat(plannedDistance),
        revenue: parseFloat(revenue || 0),
        status: 'DRAFT',
      },
      include: { vehicle: true, driver: true },
    });
    res.status(201).json(trip);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/dispatch', authorize('FLEET_MANAGER', 'DRIVER'), async (req, res) => {
  try {
    const trip = await prisma.trip.findUnique({
      where: { id: req.params.id },
      include: { vehicle: true, driver: true },
    });
    if (!trip) return res.status(404).json({ error: 'Trip not found' });

    const errors = validateTripDispatch(trip, trip.vehicle, trip.driver);
    if (errors.length) return res.status(400).json({ error: errors.join('. ') });

    const result = await prisma.$transaction(async (tx) => {
      const updatedTrip = await tx.trip.update({
        where: { id: req.params.id },
        data: { status: 'DISPATCHED', dispatchedAt: new Date() },
        include: { vehicle: true, driver: true },
      });

      await tx.vehicle.update({
        where: { id: trip.vehicleId },
        data: { status: 'ON_TRIP' },
      });

      await tx.driver.update({
        where: { id: trip.driverId },
        data: { status: 'ON_TRIP' },
      });

      return updatedTrip;
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/complete', authorize('FLEET_MANAGER', 'DRIVER'), async (req, res) => {
  try {
    const { finalOdometer, fuelConsumed, actualDistance } = req.body;

    const trip = await prisma.trip.findUnique({ where: { id: req.params.id } });
    if (!trip) return res.status(404).json({ error: 'Trip not found' });
    if (trip.status !== 'DISPATCHED') {
      return res.status(400).json({ error: 'Only dispatched trips can be completed' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedTrip = await tx.trip.update({
        where: { id: req.params.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          finalOdometer: parseFloat(finalOdometer),
          fuelConsumed: parseFloat(fuelConsumed || 0),
          actualDistance: parseFloat(actualDistance || trip.plannedDistance),
        },
        include: { vehicle: true, driver: true },
      });

      await tx.vehicle.update({
        where: { id: trip.vehicleId },
        data: {
          status: 'AVAILABLE',
          odometer: parseFloat(finalOdometer),
        },
      });

      await tx.driver.update({
        where: { id: trip.driverId },
        data: { status: 'AVAILABLE' },
      });

      if (fuelConsumed && parseFloat(fuelConsumed) > 0) {
        await tx.fuelLog.create({
          data: {
            vehicleId: trip.vehicleId,
            tripId: trip.id,
            liters: parseFloat(fuelConsumed),
            cost: 0,
            date: new Date(),
          },
        });
      }

      return updatedTrip;
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/cancel', authorize('FLEET_MANAGER', 'DRIVER'), async (req, res) => {
  try {
    const trip = await prisma.trip.findUnique({ where: { id: req.params.id } });
    if (!trip) return res.status(404).json({ error: 'Trip not found' });
    if (trip.status !== 'DISPATCHED' && trip.status !== 'DRAFT') {
      return res.status(400).json({ error: 'Only draft or dispatched trips can be cancelled' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedTrip = await tx.trip.update({
        where: { id: req.params.id },
        data: { status: 'CANCELLED' },
        include: { vehicle: true, driver: true },
      });

      if (trip.status === 'DISPATCHED') {
        await tx.vehicle.update({
          where: { id: trip.vehicleId },
          data: { status: 'AVAILABLE' },
        });
        await tx.driver.update({
          where: { id: trip.driverId },
          data: { status: 'AVAILABLE' },
        });
      }

      return updatedTrip;
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
