import express from 'express';
import PDFDocument from 'pdfkit';
import prisma from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';

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

router.get('/analytics', async (req, res) => {
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

router.get('/export/csv', async (req, res) => {
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

router.get('/export/pdf', async (req, res) => {
  try {
    const analytics = await getVehicleAnalytics();
    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=transitops-report.pdf');
    doc.pipe(res);

    doc.fontSize(20).text('TransitOps Fleet Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.moveDown(2);

    const totalCost = analytics.reduce((s, v) => s + v.operationalCost, 0);
    doc.fontSize(12).text(`Total Operational Cost: $${totalCost.toFixed(2)}`);
    doc.text(`Vehicles: ${analytics.length}`);
    doc.moveDown();

    analytics.forEach((v) => {
      doc.fontSize(11).text(`${v.registrationNumber} - ${v.name}`, { underline: true });
      doc.fontSize(9)
        .text(`Status: ${v.status} | Op. Cost: $${v.operationalCost.toFixed(2)} | ROI: ${v.roi}%`)
        .text(`Fuel Efficiency: ${v.fuelEfficiency} km/L | Trips: ${v.completedTrips}`);
      doc.moveDown(0.5);
    });

    doc.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
