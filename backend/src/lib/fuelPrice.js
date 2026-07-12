const DEFAULT_FUEL_PRICE = 1.5;

export function calcFuelCost(liters, pricePerLiter) {
  return Math.round(parseFloat(liters) * parseFloat(pricePerLiter) * 100) / 100;
}

export async function getFuelPricePerLiter(tx) {
  const setting = await tx.fuelPrice.findUnique({ where: { id: 'current' } });
  return setting?.pricePerLiter ?? DEFAULT_FUEL_PRICE;
}

export async function ensureFuelPrice(tx) {
  return tx.fuelPrice.upsert({
    where: { id: 'current' },
    update: {},
    create: { id: 'current', pricePerLiter: DEFAULT_FUEL_PRICE },
  });
}
