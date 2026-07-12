import express from 'express';
import prisma from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { checkLicenseExpirations, createNotification, notifyFleetManagers } from '../utils/notificationHelper.js';
import { validateTripDispatch } from '../utils/rules.js';

const router = express.Router();
router.use(authenticate);

// GET /api/notifications - Get all notifications for user (triggers license check first)
router.get('/', async (req, res) => {
  try {
    // Run automated check for expiring licenses
    await checkLicenseExpirations();

    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/notifications/read-all - Mark all as read
router.post('/read-all', async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, read: false },
      data: { read: true },
    });
    res.json({ message: 'All notifications marked as read.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/notifications/:id/read - Mark one as read
router.post('/:id/read', async (req, res) => {
  try {
    const notification = await prisma.notification.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found.' });
    }

    const updated = await prisma.notification.update({
      where: { id: req.params.id },
      data: { read: true },
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/notifications/:id/action - Perform action (Approve/Cancel) on trip
router.post('/:id/action', async (req, res) => {
  try {
    const { action } = req.body; // 'APPROVE' or 'CANCEL'
    if (!action || !['APPROVE', 'CANCEL'].includes(action)) {
      return res.status(400).json({ error: "Invalid action. Must be 'APPROVE' or 'CANCEL'." });
    }

    const notification = await prisma.notification.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found.' });
    }

    if (!notification.actionable || notification.actionDone) {
      return res.status(400).json({ error: 'Notification is not actionable or action has already been completed.' });
    }

    // Decode actionData
    let actionData;
    try {
      actionData = JSON.parse(notification.actionData);
    } catch {
      return res.status(400).json({ error: 'Invalid action metadata.' });
    }

    const { tripId } = actionData;
    if (!tripId) {
      return res.status(400).json({ error: 'Trip ID is missing in action data.' });
    }

    // Retrieve trip
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: { vehicle: true, driver: true },
    });

    if (!trip) {
      return res.status(404).json({ error: 'Trip not found.' });
    }

    // Action Execution
    if (action === 'APPROVE') {
      // Validate dispatch rules
      const errors = validateTripDispatch(trip, trip.vehicle, trip.driver);
      if (errors.length) {
        return res.status(400).json({ error: errors.join('. ') });
      }

      await prisma.$transaction(async (tx) => {
        // 1. Mark trip as DISPATCHED
        await tx.trip.update({
          where: { id: tripId },
          data: { status: 'DISPATCHED', dispatchedAt: new Date() },
        });

        // 2. Mark vehicle as ON_TRIP
        await tx.vehicle.update({
          where: { id: trip.vehicleId },
          data: { status: 'ON_TRIP' },
        });

        // 3. Mark driver as ON_TRIP
        await tx.driver.update({
          where: { id: trip.driverId },
          data: { status: 'ON_TRIP' },
        });

        // 4. Mark notification action as completed
        await tx.notification.update({
          where: { id: notification.id },
          data: { actionDone: true, read: true },
        });
      });

      // Spawn notifications
      const tripSummary = `${trip.source} to ${trip.destination}`;
      await notifyFleetManagers(
        'Trip Approved & Dispatched',
        `Driver ${trip.driver.name} approved the assigned trip (${tripSummary}) and is now dispatching.`,
        'TRIP_STATUS'
      );
      await createNotification(
        req.user.id,
        'Trip Dispatched',
        `You approved and dispatched the trip (${tripSummary}). Drive safe!`,
        'TRIP_STATUS'
      );

    } else if (action === 'CANCEL') {
      await prisma.$transaction(async (tx) => {
        // 1. Mark trip as CANCELLED
        await tx.trip.update({
          where: { id: tripId },
          data: { status: 'CANCELLED' },
        });

        // 2. If it was somehow dispatched, free the assets
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

        // 3. Mark notification action as completed
        await tx.notification.update({
          where: { id: notification.id },
          data: { actionDone: true, read: true },
        });
      });

      // Spawn notifications
      const tripSummary = `${trip.source} to ${trip.destination}`;
      await notifyFleetManagers(
        'Trip Rejected',
        `Driver ${trip.driver.name} rejected/cancelled the assigned trip (${tripSummary}).`,
        'TRIP_STATUS'
      );
      await createNotification(
        req.user.id,
        'Trip Cancelled',
        `You cancelled the assigned trip (${tripSummary}).`,
        'TRIP_STATUS'
      );
    }

    // Return the updated notification
    const finalNotif = await prisma.notification.findUnique({ where: { id: notification.id } });
    res.json(finalNotif);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
