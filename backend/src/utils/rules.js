export const isLicenseValid = (licenseExpiry) => new Date(licenseExpiry) >= new Date();

export const isVehicleDispatchable = (vehicle) =>
  vehicle.status === 'AVAILABLE';

export const isDriverAssignable = (driver) =>
  driver.status === 'AVAILABLE' && isLicenseValid(driver.licenseExpiry);

export const validateTripDispatch = (trip, vehicle, driver) => {
  const errors = [];

  if (!isVehicleDispatchable(vehicle)) {
    errors.push('Vehicle is not available for dispatch');
  }
  if (vehicle.status === 'RETIRED' || vehicle.status === 'IN_SHOP') {
    errors.push('Retired or in-shop vehicles cannot be dispatched');
  }
  if (!isDriverAssignable(driver)) {
    if (driver.status === 'SUSPENDED') {
      errors.push('Suspended drivers cannot be assigned');
    } else if (!isLicenseValid(driver.licenseExpiry)) {
      errors.push('Driver license has expired');
    } else {
      errors.push('Driver is not available');
    }
  }
  if (trip.cargoWeight > vehicle.maxLoadCapacity) {
    errors.push(`Cargo weight (${trip.cargoWeight} kg) exceeds vehicle capacity (${vehicle.maxLoadCapacity} kg)`);
  }
  if (trip.status !== 'DRAFT') {
    errors.push('Only draft trips can be dispatched');
  }

  return errors;
};

export const formatStatus = (status) =>
  status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
