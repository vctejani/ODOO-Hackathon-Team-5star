import express from 'express';
import prisma from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { buildVehicleReportPdf, getVehicleReportFilename } from '../lib/vehicleReportPdf.js';
import { buildFleetReportPdf, gatherFleetReportData, getFleetReportFilename } from '../lib/fleetReportPdf.js';

const router = express.Router();
router.use(authenticate);

async function getVehicleAnalytics() {
  const vehicles = await prisma.vehicle.findMany({
    include: {
      fuelLogs: true,
      expenses: true,
      trips: { where: { status: 'COMPLETED' } },
      maintenanceLogs: true,
    },
  });

  return vehicles.map((v) => {
    const fuelCost = v.fuelLogs.reduce((s, f) => s + f.cost, 0);
    const maintenanceCost = v.expenses
      .filter((e) => e.type === 'MAINTENANCE')
      .reduce((s, e) => s + e.amount, 0);
    const totalFuelLiters = v.fuelLogs.reduce((s, f) => s + f.liters, 0);
    const totalDistance = v.trips.reduce((s, t) => s + (t.actualDistance || t.plannedDistance || 0), 0);
    const revenue = v.trips.reduce((s, t) => s + t.revenue, 0);
    const operationalCost = fuelCost + maintenanceCost;
    const fuelEfficiency = totalFuelLiters > 0 ? totalDistance / totalFuelLiters : 0;
    const roi = v.acquisitionCost > 0
      ? ((revenue - operationalCost) / v.acquisitionCost) * 100
      : 0;

    return {
      id: v.id,
      registrationNumber: v.registrationNumber,
      name: v.name,
      type: v.type,
      status: v.status,
      acquisitionCost: v.acquisitionCost,
      fuelCost,
      maintenanceCost,
      operationalCost,
      totalFuelLiters,
      totalDistance,
      fuelEfficiency: Math.round(fuelEfficiency * 100) / 100,
      revenue,
      roi: Math.round(roi * 100) / 100,
      completedTrips: v.trips.length,
    };
  });
}

router.get('/analytics', authorize('FLEET_MANAGER', 'FINANCIAL_ANALYST'), async (req, res) => {
  try {
    const vehicleAnalytics = await getVehicleAnalytics();

    const totalVehicles = vehicleAnalytics.length;
    const nonRetired = vehicleAnalytics.filter((v) => v.status !== 'RETIRED');
    const onTrip = nonRetired.filter((v) => v.status === 'ON_TRIP').length;
    const fleetUtilization = nonRetired.length
      ? Math.round((onTrip / nonRetired.length) * 100)
      : 0;

    const totalOperationalCost = vehicleAnalytics.reduce((s, v) => s + v.operationalCost, 0);
    const avgFuelEfficiency =
      vehicleAnalytics.filter((v) => v.fuelEfficiency > 0).length > 0
        ? vehicleAnalytics
            .filter((v) => v.fuelEfficiency > 0)
            .reduce((s, v) => s + v.fuelEfficiency, 0) /
          vehicleAnalytics.filter((v) => v.fuelEfficiency > 0).length
        : 0;

    const monthlyExpenses = await prisma.expense.groupBy({
      by: ['type'],
      _sum: { amount: true },
    });

    res.json({
      fleetUtilization,
      totalOperationalCost,
      avgFuelEfficiency: Math.round(avgFuelEfficiency * 100) / 100,
      vehicleAnalytics,
      expenseBreakdown: monthlyExpenses.map((e) => ({
        type: e.type,
        total: e._sum.amount || 0,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/export/csv', authorize('FLEET_MANAGER', 'FINANCIAL_ANALYST'), async (req, res) => {
  try {
    const analytics = await getVehicleAnalytics();
    const headers = [
      'Registration', 'Name', 'Type', 'Status', 'Fuel Cost', 'Maintenance Cost',
      'Operational Cost', 'Distance (km)', 'Fuel (L)', 'Fuel Efficiency (km/L)',
      'Revenue', 'ROI (%)', 'Completed Trips',
    ];

    const rows = analytics.map((v) => [
      v.registrationNumber, v.name, v.type, v.status,
      v.fuelCost, v.maintenanceCost, v.operationalCost,
      v.totalDistance, v.totalFuelLiters, v.fuelEfficiency,
      v.revenue, v.roi, v.completedTrips,
    ]);

    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=transitops-report.csv');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/export/pdf/vehicle/:vehicleId', authorize('FLEET_MANAGER', 'FINANCIAL_ANALYST'), async (req, res) => {
  try {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: req.params.vehicleId },
      include: {
        trips: {
          include: { driver: true },
          orderBy: { createdAt: 'desc' },
        },
        maintenanceLogs: { orderBy: { startDate: 'desc' } },
        fuelLogs: {
          include: { trip: true },
          orderBy: { date: 'desc' },
        },
        expenses: { orderBy: { date: 'desc' } },
      },
    });

    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    const pdfBuffer = await buildVehicleReportPdf(vehicle);
    const filename = getVehicleReportFilename(vehicle.registrationNumber);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/export/pdf', authorize('FLEET_MANAGER', 'FINANCIAL_ANALYST'), async (req, res) => {
  try {
    const data = await gatherFleetReportData();
    const pdfBuffer = await buildFleetReportPdf(data);
    const filename = getFleetReportFilename();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
