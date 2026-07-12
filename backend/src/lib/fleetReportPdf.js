import prisma from './prisma.js';
import { ensureFuelPrice } from './fuelPrice.js';
import {
  MARGIN,
  ROLE_LABELS,
  fmt,
  fmtDate,
  fmtStatus,
  resetTextStyle,
  ensureSpace,
  drawReportHeader,
  drawSectionTitle,
  drawMetricsGrid,
  drawKeyValueRows,
  drawTable,
  drawBulletList,
  createPdfDocument,
  finalizePdf,
  drawReportTitle,
} from './pdfHelpers.js';

function computeVehicleMetrics(vehicle) {
  const fuelCost = vehicle.fuelLogs.reduce((s, f) => s + f.cost, 0);
  const maintenanceCost = vehicle.expenses.filter((e) => e.type === 'MAINTENANCE').reduce((s, e) => s + e.amount, 0);
  const tollCost = vehicle.expenses.filter((e) => e.type === 'TOLL').reduce((s, e) => s + e.amount, 0);
  const otherCost = vehicle.expenses.filter((e) => e.type === 'OTHER').reduce((s, e) => s + e.amount, 0);
  const totalFuelLiters = vehicle.fuelLogs.reduce((s, f) => s + f.liters, 0);
  const completedTrips = vehicle.trips.filter((t) => t.status === 'COMPLETED');
  const totalDistance = completedTrips.reduce((s, t) => s + (t.actualDistance || t.plannedDistance || 0), 0);
  const revenue = vehicle.trips.reduce((s, t) => s + t.revenue, 0);
  const operationalCost = fuelCost + maintenanceCost;
  const fuelEfficiency = totalFuelLiters > 0 ? totalDistance / totalFuelLiters : 0;
  const roi = vehicle.acquisitionCost > 0 ? ((revenue - operationalCost) / vehicle.acquisitionCost) * 100 : 0;
  const netProfit = revenue - operationalCost;

  return {
    fuelCost,
    maintenanceCost,
    tollCost,
    otherCost,
    totalFuelLiters,
    completedTrips,
    totalDistance,
    revenue,
    operationalCost,
    fuelEfficiency,
    roi,
    netProfit,
  };
}

export async function gatherFleetReportData() {
  const [
    vehicles,
    drivers,
    users,
    trips,
    maintenanceLogs,
    fuelLogs,
    expenses,
    fuelPriceSetting,
    expenseBreakdown,
  ] = await Promise.all([
    prisma.vehicle.findMany({
      include: {
        trips: { include: { driver: true }, orderBy: { createdAt: 'desc' } },
        maintenanceLogs: { orderBy: { startDate: 'desc' } },
        fuelLogs: { include: { trip: true }, orderBy: { date: 'desc' } },
        expenses: { orderBy: { date: 'desc' } },
      },
      orderBy: { registrationNumber: 'asc' },
    }),
    prisma.driver.findMany({ orderBy: { name: 'asc' } }),
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        contactNumber: true,
        licenseNumber: true,
        licenseCategory: true,
        licenseExpiry: true,
        certificationNumber: true,
        safetyRegion: true,
        employeeId: true,
        department: true,
        createdAt: true,
      },
      orderBy: { name: 'asc' },
    }),
    prisma.trip.findMany({
      include: { vehicle: true, driver: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.maintenanceLog.findMany({
      include: { vehicle: true },
      orderBy: { startDate: 'desc' },
    }),
    prisma.fuelLog.findMany({
      include: { vehicle: true, trip: true },
      orderBy: { date: 'desc' },
    }),
    prisma.expense.findMany({
      include: { vehicle: true },
      orderBy: { date: 'desc' },
    }),
    ensureFuelPrice(prisma),
    prisma.expense.groupBy({ by: ['type'], _sum: { amount: true } }),
  ]);

  const vehicleAnalytics = vehicles.map((v) => {
    const m = computeVehicleMetrics(v);
    return {
      id: v.id,
      registrationNumber: v.registrationNumber,
      name: v.name,
      type: v.type,
      status: v.status,
      region: v.region,
      acquisitionCost: v.acquisitionCost,
      ...m,
      fuelEfficiency: Math.round(m.fuelEfficiency * 100) / 100,
      roi: Math.round(m.roi * 100) / 100,
      completedTripsCount: m.completedTrips.length,
      totalTrips: v.trips.length,
    };
  });

  const nonRetired = vehicleAnalytics.filter((v) => v.status !== 'RETIRED');
  const onTrip = nonRetired.filter((v) => v.status === 'ON_TRIP').length;
  const fleetUtilization = nonRetired.length ? Math.round((onTrip / nonRetired.length) * 100) : 0;

  const totalRevenue = vehicleAnalytics.reduce((s, v) => s + v.revenue, 0);
  const totalOperationalCost = vehicleAnalytics.reduce((s, v) => s + v.operationalCost, 0);
  const totalFuelCost = vehicleAnalytics.reduce((s, v) => s + v.fuelCost, 0);
  const totalMaintenanceCost = vehicleAnalytics.reduce((s, v) => s + v.maintenanceCost, 0);
  const totalFuelLiters = vehicleAnalytics.reduce((s, v) => s + v.totalFuelLiters, 0);
  const totalDistance = vehicleAnalytics.reduce((s, v) => s + v.totalDistance, 0);
  const totalNetProfit = totalRevenue - totalOperationalCost;
  const avgFuelEfficiency = vehicleAnalytics.filter((v) => v.fuelEfficiency > 0).length
    ? vehicleAnalytics.filter((v) => v.fuelEfficiency > 0).reduce((s, v) => s + v.fuelEfficiency, 0)
      / vehicleAnalytics.filter((v) => v.fuelEfficiency > 0).length
    : 0;

  const tripStats = {
    total: trips.length,
    completed: trips.filter((t) => t.status === 'COMPLETED').length,
    dispatched: trips.filter((t) => t.status === 'DISPATCHED').length,
    draft: trips.filter((t) => t.status === 'DRAFT').length,
    cancelled: trips.filter((t) => t.status === 'CANCELLED').length,
  };

  const driverStats = {
    total: drivers.length,
    available: drivers.filter((d) => d.status === 'AVAILABLE').length,
    onTrip: drivers.filter((d) => d.status === 'ON_TRIP').length,
    offDuty: drivers.filter((d) => d.status === 'OFF_DUTY').length,
    suspended: drivers.filter((d) => d.status === 'SUSPENDED').length,
    avgSafetyScore: drivers.length
      ? Math.round(drivers.reduce((s, d) => s + d.safetyScore, 0) / drivers.length)
      : 0,
  };

  const vehicleStats = {
    total: vehicles.length,
    available: vehicles.filter((v) => v.status === 'AVAILABLE').length,
    onTrip: vehicles.filter((v) => v.status === 'ON_TRIP').length,
    inShop: vehicles.filter((v) => v.status === 'IN_SHOP').length,
    retired: vehicles.filter((v) => v.status === 'RETIRED').length,
    names: vehicles.map((v) => `${v.name} (${v.registrationNumber})`),
  };

  return {
    vehicles,
    drivers,
    users,
    trips,
    maintenanceLogs,
    fuelLogs,
    expenses,
    fuelPrice: fuelPriceSetting.pricePerLiter,
    expenseBreakdown: expenseBreakdown.map((e) => ({
      type: e.type,
      total: e._sum.amount || 0,
    })),
    vehicleAnalytics,
    fleetSummary: {
      fleetUtilization,
      totalRevenue,
      totalOperationalCost,
      totalFuelCost,
      totalMaintenanceCost,
      totalFuelLiters,
      totalDistance,
      totalNetProfit,
      avgFuelEfficiency: Math.round(avgFuelEfficiency * 100) / 100,
      totalAcquisitionCost: vehicles.reduce((s, v) => s + v.acquisitionCost, 0),
      tripStats,
      driverStats,
      vehicleStats,
      employeeCount: users.length,
      totalExpenses: expenses.reduce((s, e) => s + e.amount, 0),
    },
  };
}

function drawVehicleDetailSection(doc, vehicle, index) {
  const m = computeVehicleMetrics(vehicle);

  ensureSpace(doc, 40);
  resetTextStyle(doc, '#1d4ed8', 12, 'Helvetica-Bold');
  doc.text(`Vehicle ${index + 1}: ${vehicle.name} (${vehicle.registrationNumber})`, MARGIN, doc.y);
  doc.y += 18;

  drawKeyValueRows(doc, [
    ['Type', vehicle.type],
    ['Region', vehicle.region],
    ['Status', fmtStatus(vehicle.status)],
    ['Odometer', `${vehicle.odometer.toLocaleString()} km`],
    ['Max Load', `${vehicle.maxLoadCapacity} kg`],
    ['Acquisition Cost', fmt(vehicle.acquisitionCost)],
  ]);

  drawMetricsGrid(doc, [
    { label: 'Revenue', value: fmt(m.revenue) },
    { label: 'Op. Cost', value: fmt(m.operationalCost) },
    { label: 'Net Profit', value: fmt(m.netProfit) },
    { label: 'ROI', value: `${m.roi.toFixed(2)}%` },
    { label: 'Fuel Used', value: `${m.totalFuelLiters.toFixed(1)} L` },
    { label: 'Fuel Cost', value: fmt(m.fuelCost) },
    { label: 'Mileage', value: `${m.totalDistance} km` },
    { label: 'Efficiency', value: `${m.fuelEfficiency.toFixed(2)} km/L` },
    { label: 'Trips Done', value: String(m.completedTrips.length) },
  ]);

  if (vehicle.trips.length) {
    resetTextStyle(doc, '#64748b', 8, 'Helvetica-Bold');
    doc.text('Trip History', MARGIN, doc.y);
    doc.y += 12;
    drawTable(doc, [
      { label: 'Route', width: 100 },
      { label: 'Driver', width: 55 },
      { label: 'Status', width: 50 },
      { label: 'Dist.', width: 35 },
      { label: 'Fuel', width: 30 },
      { label: 'Revenue', width: 45 },
      { label: 'Date', width: 60 },
    ], vehicle.trips.map((t) => [
      `${t.source} -> ${t.destination}`.slice(0, 30),
      t.driver?.name?.slice(0, 10) || '-',
      fmtStatus(t.status),
      `${t.actualDistance || t.plannedDistance || 0}km`,
      t.fuelConsumed ? `${t.fuelConsumed}L` : '-',
      fmt(t.revenue),
      fmtDate(t.completedAt || t.dispatchedAt || t.createdAt),
    ]));
  }

  if (vehicle.maintenanceLogs.length) {
    resetTextStyle(doc, '#64748b', 8, 'Helvetica-Bold');
    doc.text('Maintenance Records', MARGIN, doc.y);
    doc.y += 12;
    drawTable(doc, [
      { label: 'Description', width: 130 },
      { label: 'Status', width: 55 },
      { label: 'Cost', width: 50 },
      { label: 'Started', width: 65 },
      { label: 'Closed', width: 65 },
    ], vehicle.maintenanceLogs.map((log) => [
      log.description.slice(0, 32),
      fmtStatus(log.status),
      fmt(log.cost),
      fmtDate(log.startDate),
      fmtDate(log.endDate),
    ]));
  }

  if (vehicle.fuelLogs.length) {
    resetTextStyle(doc, '#64748b', 8, 'Helvetica-Bold');
    doc.text('Fuel Logs', MARGIN, doc.y);
    doc.y += 12;
    drawTable(doc, [
      { label: 'Date', width: 70 },
      { label: 'Liters', width: 50 },
      { label: 'Cost', width: 50 },
      { label: 'Trip', width: 120 },
    ], vehicle.fuelLogs.map((f) => [
      fmtDate(f.date),
      `${f.liters} L`,
      fmt(f.cost),
      f.trip ? `${f.trip.source} -> ${f.trip.destination}`.slice(0, 28) : 'Manual',
    ]));
  }

  doc.y += 8;
}

export async function buildFleetReportPdf(data) {
  const { vehicles, drivers, users, trips, maintenanceLogs, fuelLogs, expenses, fuelPrice, expenseBreakdown, vehicleAnalytics, fleetSummary } = data;
  const { doc, toBuffer } = createPdfDocument();
  const reportDate = new Date().toISOString().slice(0, 10);

  drawReportHeader(doc, { reportId: `FR-${reportDate}` });
  drawReportTitle(doc, 'Comprehensive Fleet Operations Report', 'Full platform overview — vehicles, drivers, employees, trips, fuel & expenses');

  drawSectionTitle(doc, 'Executive Summary');
  drawMetricsGrid(doc, [
    { label: 'Total Vehicles', value: String(fleetSummary.vehicleStats.total) },
    { label: 'Total Drivers', value: String(fleetSummary.driverStats.total) },
    { label: 'Total Employees', value: String(fleetSummary.employeeCount) },
    { label: 'Total Trips', value: String(fleetSummary.tripStats.total) },
    { label: 'Fleet Utilization', value: `${fleetSummary.fleetUtilization}%` },
    { label: 'Total Revenue', value: fmt(fleetSummary.totalRevenue) },
    { label: 'Operational Cost', value: fmt(fleetSummary.totalOperationalCost) },
    { label: 'Net Profit / Loss', value: fmt(fleetSummary.totalNetProfit) },
    { label: 'Total Fuel Used', value: `${fleetSummary.totalFuelLiters.toFixed(1)} L` },
    { label: 'Total Fuel Cost', value: fmt(fleetSummary.totalFuelCost) },
    { label: 'Total Mileage', value: `${fleetSummary.totalDistance.toLocaleString()} km` },
    { label: 'Avg Fuel Efficiency', value: `${fleetSummary.avgFuelEfficiency} km/L` },
    { label: 'Fuel Price / Liter', value: fmt(fuelPrice) },
    { label: 'Maintenance Cost', value: fmt(fleetSummary.totalMaintenanceCost) },
    { label: 'Fleet Acquisition', value: fmt(fleetSummary.totalAcquisitionCost) },
    { label: 'Completed Trips', value: String(fleetSummary.tripStats.completed) },
  ]);

  drawSectionTitle(doc, 'Employee Directory');
  drawKeyValueRows(doc, [
    ['Total Employees', fleetSummary.employeeCount],
    ['Fleet Managers', users.filter((u) => u.role === 'FLEET_MANAGER').length],
    ['Drivers (User Accounts)', users.filter((u) => u.role === 'DRIVER').length],
    ['Safety Officers', users.filter((u) => u.role === 'SAFETY_OFFICER').length],
    ['Financial Analysts', users.filter((u) => u.role === 'FINANCIAL_ANALYST').length],
  ]);
  drawTable(doc, [
    { label: 'Name', width: 85 },
    { label: 'Designation', width: 75 },
    { label: 'Email', width: 110 },
    { label: 'Contact', width: 65 },
    { label: 'Details', width: 80 },
  ], users.map((u) => {
    const details = [];
    if (u.employeeId) details.push(`ID: ${u.employeeId}`);
    if (u.department) details.push(u.department);
    if (u.licenseNumber) details.push(`Lic: ${u.licenseNumber}`);
    if (u.certificationNumber) details.push(`Cert: ${u.certificationNumber}`);
    if (u.safetyRegion) details.push(u.safetyRegion);
    return [
      u.name,
      ROLE_LABELS[u.role] || u.role,
      u.email,
      u.contactNumber || '-',
      details.join(', ').slice(0, 35) || '-',
    ];
  }));

  drawSectionTitle(doc, 'Driver Registry');
  drawKeyValueRows(doc, [
    ['Total Drivers', fleetSummary.driverStats.total],
    ['Available', fleetSummary.driverStats.available],
    ['On Trip', fleetSummary.driverStats.onTrip],
    ['Off Duty', fleetSummary.driverStats.offDuty],
    ['Suspended', fleetSummary.driverStats.suspended],
    ['Avg Safety Score', `${fleetSummary.driverStats.avgSafetyScore}%`],
    ['All Driver Names', drivers.map((d) => d.name).join(', ') || '-'],
  ]);
  drawTable(doc, [
    { label: 'Name', width: 75 },
    { label: 'License', width: 70 },
    { label: 'Category', width: 55 },
    { label: 'Expiry', width: 60 },
    { label: 'Contact', width: 65 },
    { label: 'Safety', width: 35 },
    { label: 'Status', width: 55 },
  ], drivers.map((d) => [
    d.name,
    d.licenseNumber,
    d.licenseCategory,
    fmtDate(d.licenseExpiry),
    d.contactNumber,
    `${d.safetyScore}%`,
    fmtStatus(d.status),
  ]));

  drawSectionTitle(doc, 'Vehicle Fleet Overview');
  drawKeyValueRows(doc, [
    ['Total Vehicles', fleetSummary.vehicleStats.total],
    ['Available', fleetSummary.vehicleStats.available],
    ['On Trip', fleetSummary.vehicleStats.onTrip],
    ['In Maintenance', fleetSummary.vehicleStats.inShop],
    ['Retired', fleetSummary.vehicleStats.retired],
    ['All Vehicle Names', fleetSummary.vehicleStats.names.join(', ') || '-'],
  ]);
  drawTable(doc, [
    { label: 'Registration', width: 65 },
    { label: 'Name / Model', width: 80 },
    { label: 'Type', width: 50 },
    { label: 'Region', width: 45 },
    { label: 'Status', width: 50 },
    { label: 'Odometer', width: 50 },
    { label: 'Capacity', width: 45 },
    { label: 'Acq. Cost', width: 50 },
  ], vehicles.map((v) => [
    v.registrationNumber,
    v.name.slice(0, 18),
    v.type,
    v.region,
    fmtStatus(v.status),
    `${v.odometer.toLocaleString()} km`,
    `${v.maxLoadCapacity} kg`,
    fmt(v.acquisitionCost),
  ]));

  drawSectionTitle(doc, 'Vehicle ROI & Performance Analysis');
  drawTable(doc, [
    { label: 'Vehicle', width: 75 },
    { label: 'Status', width: 45 },
    { label: 'Revenue', width: 48 },
    { label: 'Op. Cost', width: 48 },
    { label: 'Profit', width: 48 },
    { label: 'ROI', width: 35 },
    { label: 'Fuel (L)', width: 40 },
    { label: 'Mileage', width: 42 },
    { label: 'km/L', width: 35 },
    { label: 'Trips', width: 30 },
  ], vehicleAnalytics.map((v) => [
    `${v.name}`.slice(0, 14),
    fmtStatus(v.status),
    fmt(v.revenue),
    fmt(v.operationalCost),
    fmt(v.netProfit),
    `${v.roi}%`,
    v.totalFuelLiters.toFixed(1),
    `${v.totalDistance}`,
    v.fuelEfficiency,
    v.completedTripsCount,
  ]));

  drawSectionTitle(doc, 'Individual Vehicle Reports');
  vehicles.forEach((vehicle, i) => drawVehicleDetailSection(doc, vehicle, i));

  drawSectionTitle(doc, 'Complete Fleet Trip Log');
  drawKeyValueRows(doc, [
    ['Total Trips', fleetSummary.tripStats.total],
    ['Completed', fleetSummary.tripStats.completed],
    ['Dispatched', fleetSummary.tripStats.dispatched],
    ['Draft', fleetSummary.tripStats.draft],
    ['Cancelled', fleetSummary.tripStats.cancelled],
  ]);
  drawTable(doc, [
    { label: 'Route', width: 90 },
    { label: 'Vehicle', width: 55 },
    { label: 'Driver', width: 55 },
    { label: 'Status', width: 48 },
    { label: 'Cargo', width: 35 },
    { label: 'Dist.', width: 35 },
    { label: 'Fuel', width: 30 },
    { label: 'Revenue', width: 42 },
    { label: 'Date', width: 56 },
  ], trips.map((t) => [
    `${t.source} -> ${t.destination}`.slice(0, 26),
    t.vehicle?.registrationNumber?.slice(0, 10) || '-',
    t.driver?.name?.slice(0, 10) || '-',
    fmtStatus(t.status),
    `${t.cargoWeight}kg`,
    `${t.actualDistance || t.plannedDistance || 0}km`,
    t.fuelConsumed ? `${t.fuelConsumed}L` : '-',
    fmt(t.revenue),
    fmtDate(t.completedAt || t.dispatchedAt || t.createdAt),
  ]));

  drawSectionTitle(doc, 'Fleet Maintenance Records');
  drawTable(doc, [
    { label: 'Vehicle', width: 60 },
    { label: 'Description', width: 120 },
    { label: 'Status', width: 50 },
    { label: 'Cost', width: 45 },
    { label: 'Started', width: 60 },
    { label: 'Closed', width: 60 },
  ], maintenanceLogs.map((m) => [
    m.vehicle?.registrationNumber || '-',
    m.description.slice(0, 30),
    fmtStatus(m.status),
    fmt(m.cost),
    fmtDate(m.startDate),
    fmtDate(m.endDate),
  ]));

  drawSectionTitle(doc, 'Fleet Fuel Usage Log');
  drawKeyValueRows(doc, [
    ['Total Fuel Consumed', `${fleetSummary.totalFuelLiters.toFixed(1)} L`],
    ['Total Fuel Expenditure', fmt(fleetSummary.totalFuelCost)],
    ['Current Fuel Price', `${fmt(fuelPrice)} per liter`],
    ['Average Fleet Efficiency', `${fleetSummary.avgFuelEfficiency} km/L`],
  ]);
  drawTable(doc, [
    { label: 'Date', width: 65 },
    { label: 'Vehicle', width: 60 },
    { label: 'Liters', width: 45 },
    { label: 'Cost', width: 45 },
    { label: 'Linked Trip', width: 120 },
  ], fuelLogs.map((f) => [
    fmtDate(f.date),
    f.vehicle?.registrationNumber || '-',
    `${f.liters} L`,
    fmt(f.cost),
    f.trip ? `${f.trip.source} -> ${f.trip.destination}`.slice(0, 28) : 'Manual entry',
  ]));

  drawSectionTitle(doc, 'Expense Records & Breakdown');
  drawKeyValueRows(doc, [
    ['Total Expenses Recorded', fmt(fleetSummary.totalExpenses)],
    ...expenseBreakdown.map((e) => [`${e.type} Expenses`, fmt(e.total)]),
  ]);
  drawTable(doc, [
    { label: 'Date', width: 65 },
    { label: 'Vehicle', width: 55 },
    { label: 'Type', width: 55 },
    { label: 'Amount', width: 45 },
    { label: 'Description', width: 130 },
  ], expenses.map((e) => [
    fmtDate(e.date),
    e.vehicle?.registrationNumber || '-',
    e.type,
    fmt(e.amount),
    (e.description || '-').slice(0, 35),
  ]));

  drawSectionTitle(doc, 'Fleet Analysis & Strategic Recommendations');
  const topPerformer = [...vehicleAnalytics].sort((a, b) => b.roi - a.roi)[0];
  const lowPerformer = [...vehicleAnalytics].sort((a, b) => a.roi - b.roi)[0];
  const analysis = [
    `Fleet comprises ${fleetSummary.vehicleStats.total} vehicles, ${fleetSummary.driverStats.total} drivers, and ${fleetSummary.employeeCount} employees across ${users.filter((u) => u.role === 'SAFETY_OFFICER').map((u) => u.safetyRegion).filter(Boolean).length || 'multiple'} operational regions.`,
    `Total revenue of ${fmt(fleetSummary.totalRevenue)} against operational costs of ${fmt(fleetSummary.totalOperationalCost)} results in a fleet-wide net ${fleetSummary.totalNetProfit >= 0 ? 'profit' : 'loss'} of ${fmt(Math.abs(fleetSummary.totalNetProfit))}.`,
    `Fleet has traveled ${fleetSummary.totalDistance.toLocaleString()} km consuming ${fleetSummary.totalFuelLiters.toFixed(1)} L of fuel at a total cost of ${fmt(fleetSummary.totalFuelCost)} (current rate: ${fmt(fuelPrice)}/L). Average efficiency: ${fleetSummary.avgFuelEfficiency} km/L.`,
    `${fleetSummary.tripStats.completed} of ${fleetSummary.tripStats.total} trips completed. Fleet utilization is ${fleetSummary.fleetUtilization}% with ${fleetSummary.vehicleStats.onTrip} vehicles currently on trip.`,
    topPerformer ? `Top ROI performer: ${topPerformer.name} (${topPerformer.registrationNumber}) at ${topPerformer.roi}% ROI.` : 'No ROI data available yet.',
    lowPerformer && lowPerformer.roi < 0 ? `Underperforming asset: ${lowPerformer.name} (${lowPerformer.registrationNumber}) with ${lowPerformer.roi}% ROI — review operational costs.` : null,
    fleetSummary.driverStats.suspended > 0 ? `${fleetSummary.driverStats.suspended} driver(s) suspended — verify compliance before reassignment.` : 'All drivers are in good standing.',
    fleetSummary.vehicleStats.inShop > 0 ? `${fleetSummary.vehicleStats.inShop} vehicle(s) in maintenance — monitor downtime impact on fleet utilization.` : 'No vehicles currently in maintenance.',
  ].filter(Boolean);

  drawBulletList(doc, analysis);

  return finalizePdf(doc, toBuffer);
}

export function getFleetReportFilename() {
  const date = new Date().toISOString().slice(0, 10);
  return `TransitOps-Fleet-Report-${date}.pdf`;
}
