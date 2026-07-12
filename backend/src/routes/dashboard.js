import express from 'express';
import prisma from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const { type, status, region } = req.query;

    const vehicleWhere = {};
    if (type) vehicleWhere.type = type;
    if (status) vehicleWhere.status = status;
    if (region) vehicleWhere.region = region;

    const [
      vehicles,
      drivers,
      trips,
      activeMaintenance,
    ] = await Promise.all([
      prisma.vehicle.findMany({ where: vehicleWhere }),
      prisma.driver.findMany({ where: { deleted: false } }),
      prisma.trip.findMany({ include: { vehicle: true, driver: true } }),
      prisma.maintenanceLog.count({ where: { status: 'ACTIVE' } }),
    ]);

    const activeVehicles = vehicles.filter((v) => v.status !== 'RETIRED').length;
    const availableVehicles = vehicles.filter((v) => v.status === 'AVAILABLE').length;
    const inMaintenance = vehicles.filter((v) => v.status === 'IN_SHOP').length;
    const onTripVehicles = vehicles.filter((v) => v.status === 'ON_TRIP').length;

    const activeTrips = trips.filter((t) => t.status === 'DISPATCHED').length;
    const pendingTrips = trips.filter((t) => t.status === 'DRAFT').length;
    const driversOnDuty = drivers.filter((d) => d.status === 'ON_TRIP').length;

    const nonRetired = vehicles.filter((v) => v.status !== 'RETIRED');
    const fleetUtilization = nonRetired.length
      ? Math.round((onTripVehicles / nonRetired.length) * 100)
      : 0;

    const recentTrips = trips
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);

    const expiringLicenses = drivers.filter((d) => {
      const expiry = new Date(d.licenseExpiry);
      const now = new Date();
      const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      return expiry >= now && expiry <= thirtyDays;
    }).length;

    res.json({
      kpis: {
        activeVehicles,
        availableVehicles,
        vehiclesInMaintenance: inMaintenance,
        activeTrips,
        pendingTrips,
        driversOnDuty,
        fleetUtilization,
        totalDrivers: drivers.length,
        expiringLicenses,
        activeMaintenanceRecords: activeMaintenance,
      },
      recentTrips,
      vehicleStatusBreakdown: {
        AVAILABLE: availableVehicles,
        ON_TRIP: onTripVehicles,
        IN_SHOP: inMaintenance,
        RETIRED: vehicles.filter((v) => v.status === 'RETIRED').length,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
