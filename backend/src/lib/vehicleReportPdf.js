import {
  MARGIN,
  fmt,
  fmtDate,
  fmtDateTime,
  fmtStatus,
  resetTextStyle,
  ensureSpace,
  drawReportHeader,
  drawSectionTitle,
  drawMetricsGrid,
  drawKeyValueRows,
  drawTable,
  createPdfDocument,
  finalizePdf,
  drawReportTitle,
} from './pdfHelpers.js';

function computeVehicleMetrics(vehicle) {
  const fuelCost = vehicle.fuelLogs.reduce((s, f) => s + f.cost, 0);
  const maintenanceCost = vehicle.expenses.filter((e) => e.type === 'MAINTENANCE').reduce((s, e) => s + e.amount, 0);
  const tollCost = vehicle.expenses.filter((e) => e.type === 'TOLL').reduce((s, e) => s + e.amount, 0);
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

export async function buildVehicleReportPdf(vehicle) {
  const m = computeVehicleMetrics(vehicle);
  const { doc, toBuffer } = createPdfDocument();

  drawReportHeader(doc, { reportId: `VR-${vehicle.registrationNumber}` });
  drawReportTitle(doc, 'Vehicle Performance Report', `${vehicle.name}  •  ${vehicle.registrationNumber}`);

  drawSectionTitle(doc, 'Vehicle Profile');
  drawKeyValueRows(doc, [
    ['Registration Number', vehicle.registrationNumber],
    ['Vehicle Name / Model', vehicle.name],
    ['Type', vehicle.type],
    ['Region', vehicle.region],
    ['Current Status', fmtStatus(vehicle.status)],
    ['Max Load Capacity', `${vehicle.maxLoadCapacity} kg`],
    ['Current Odometer', `${vehicle.odometer.toLocaleString()} km`],
    ['Acquisition Cost', fmt(vehicle.acquisitionCost)],
  ]);

  drawSectionTitle(doc, 'Financial & Performance Summary');
  drawMetricsGrid(doc, [
    { label: 'Total Revenue', value: fmt(m.revenue) },
    { label: 'Operational Cost', value: fmt(m.operationalCost) },
    { label: 'Net Profit / Loss', value: fmt(m.netProfit) },
    { label: 'ROI', value: `${m.roi.toFixed(2)}%` },
    { label: 'Fuel Efficiency', value: `${m.fuelEfficiency.toFixed(2)} km/L` },
    { label: 'Total Distance', value: `${m.totalDistance} km` },
    { label: 'Fuel Cost', value: fmt(m.fuelCost) },
    { label: 'Maintenance Cost', value: fmt(m.maintenanceCost) },
    { label: 'Fuel Consumed', value: `${m.totalFuelLiters.toFixed(1)} L` },
    { label: 'Completed Trips', value: String(m.completedTrips.length) },
    { label: 'Total Trips', value: String(vehicle.trips.length) },
    { label: 'Toll Expenses', value: fmt(m.tollCost) },
  ]);

  drawSectionTitle(doc, 'Complete Trip History');
  drawTable(doc, [
    { label: 'Route', width: 95 },
    { label: 'Driver', width: 58 },
    { label: 'Status', width: 52 },
    { label: 'Cargo', width: 38 },
    { label: 'Dist.', width: 38 },
    { label: 'Fuel', width: 32 },
    { label: 'Revenue', width: 48 },
    { label: 'Date', width: 62 },
  ], vehicle.trips.map((t) => [
    `${t.source} -> ${t.destination}`.slice(0, 28),
    t.driver?.name?.slice(0, 12) || '-',
    fmtStatus(t.status),
    `${t.cargoWeight}kg`,
    `${t.actualDistance || t.plannedDistance || 0}km`,
    t.fuelConsumed ? `${t.fuelConsumed}L` : '-',
    fmt(t.revenue),
    fmtDate(t.completedAt || t.dispatchedAt || t.createdAt),
  ]));

  drawSectionTitle(doc, 'Trip Details');
  vehicle.trips.forEach((t, i) => {
    ensureSpace(doc, 80);
    resetTextStyle(doc, '#1d4ed8', 10, 'Helvetica-Bold');
    doc.text(`Trip ${i + 1}: ${t.source} -> ${t.destination}`, MARGIN, doc.y);
    doc.y += 16;
    drawKeyValueRows(doc, [
      ['Trip ID', t.id],
      ['Driver', t.driver?.name || '-'],
      ['Driver License', t.driver?.licenseNumber || '-'],
      ['Status', fmtStatus(t.status)],
      ['Cargo Weight', `${t.cargoWeight} kg`],
      ['Planned Distance', `${t.plannedDistance} km`],
      ['Actual Distance', t.actualDistance ? `${t.actualDistance} km` : '-'],
      ['Fuel Consumed', t.fuelConsumed ? `${t.fuelConsumed} L` : '-'],
      ['Final Odometer', t.finalOdometer ? `${t.finalOdometer} km` : '-'],
      ['Revenue', fmt(t.revenue)],
      ['Created', fmtDateTime(t.createdAt)],
      ['Dispatched', fmtDateTime(t.dispatchedAt)],
      ['Completed', fmtDateTime(t.completedAt)],
    ]);
  });

  drawSectionTitle(doc, 'Maintenance History');
  drawTable(doc, [
    { label: 'Description', width: 140 },
    { label: 'Status', width: 60 },
    { label: 'Cost', width: 55 },
    { label: 'Started', width: 70 },
    { label: 'Closed', width: 70 },
  ], vehicle.maintenanceLogs.map((log) => [
    log.description.slice(0, 35),
    fmtStatus(log.status),
    fmt(log.cost),
    fmtDate(log.startDate),
    fmtDate(log.endDate),
  ]));

  drawSectionTitle(doc, 'Fuel Log History');
  drawTable(doc, [
    { label: 'Date', width: 75 },
    { label: 'Liters', width: 55 },
    { label: 'Cost', width: 55 },
    { label: 'Linked Trip', width: 120 },
  ], vehicle.fuelLogs.map((f) => [
    fmtDate(f.date),
    `${f.liters} L`,
    fmt(f.cost),
    f.trip ? `${f.trip.source} -> ${f.trip.destination}`.slice(0, 30) : 'Manual entry',
  ]));

  drawSectionTitle(doc, 'Expense Breakdown');
  drawTable(doc, [
    { label: 'Date', width: 75 },
    { label: 'Type', width: 70 },
    { label: 'Amount', width: 55 },
    { label: 'Description', width: 155 },
  ], vehicle.expenses.map((e) => [
    fmtDate(e.date),
    e.type,
    fmt(e.amount),
    (e.description || '-').slice(0, 40),
  ]));

  drawSectionTitle(doc, 'Analysis & Recommendations');
  const analysis = [
    `This vehicle has completed ${m.completedTrips.length} of ${vehicle.trips.length} total trips, covering ${m.totalDistance} km.`,
    `Fuel efficiency stands at ${m.fuelEfficiency.toFixed(2)} km/L with a total fuel expenditure of ${fmt(m.fuelCost)}.`,
    `Operational costs (${fmt(m.operationalCost)}) vs revenue (${fmt(m.revenue)}) yield a net ${m.netProfit >= 0 ? 'profit' : 'loss'} of ${fmt(Math.abs(m.netProfit))}.`,
    `Return on investment (ROI) is ${m.roi.toFixed(2)}% based on acquisition cost of ${fmt(vehicle.acquisitionCost)}.`,
    vehicle.status === 'IN_SHOP'
      ? 'Vehicle is currently in maintenance - review maintenance logs before next dispatch.'
      : vehicle.status === 'ON_TRIP'
        ? 'Vehicle is currently on an active trip.'
        : 'Vehicle is available for dispatch operations.',
  ];

  analysis.forEach((line) => {
    ensureSpace(doc, 24);
    resetTextStyle(doc, '#0f172a', 9);
    doc.text(`- ${line}`, MARGIN, doc.y, { width: 495 });
    doc.y += doc.heightOfString(`- ${line}`, { width: 495 }) + 4;
  });

  return finalizePdf(doc, toBuffer);
}

export function getVehicleReportFilename(registrationNumber) {
  return `TransitOps-${registrationNumber}-Report.pdf`;
}
