export const ROLES = {
  FLEET_MANAGER: 'FLEET_MANAGER',
  DRIVER: 'DRIVER',
  SAFETY_OFFICER: 'SAFETY_OFFICER',
  FINANCIAL_ANALYST: 'FINANCIAL_ANALYST',
};

export const isFleetManager = (role) => role === ROLES.FLEET_MANAGER;

export const PERMISSIONS = {
  dashboard: Object.values(ROLES),
  vehicles: {
    read: [ROLES.FLEET_MANAGER, ROLES.FINANCIAL_ANALYST],
    readAvailable: [ROLES.FLEET_MANAGER, ROLES.DRIVER],
    write: [ROLES.FLEET_MANAGER],
  },
  drivers: {
    read: [ROLES.FLEET_MANAGER, ROLES.SAFETY_OFFICER],
    readAvailable: [ROLES.FLEET_MANAGER, ROLES.DRIVER],
    write: [ROLES.FLEET_MANAGER, ROLES.SAFETY_OFFICER],
  },
  trips: {
    read: [ROLES.FLEET_MANAGER, ROLES.DRIVER],
    write: [ROLES.FLEET_MANAGER, ROLES.DRIVER],
  },
  maintenance: {
    read: [ROLES.FLEET_MANAGER, ROLES.FINANCIAL_ANALYST],
    write: [ROLES.FLEET_MANAGER],
  },
  expenses: {
    read: [ROLES.FLEET_MANAGER, ROLES.FINANCIAL_ANALYST],
    write: [ROLES.FLEET_MANAGER, ROLES.FINANCIAL_ANALYST],
  },
  reports: [ROLES.FLEET_MANAGER, ROLES.FINANCIAL_ANALYST],
};

export const canAccess = (permission, role) => {
  if (isFleetManager(role)) return true;
  const entry = PERMISSIONS[permission];
  if (Array.isArray(entry)) return entry.includes(role);
  return false;
};

export const canDo = (resource, action, role) => {
  if (isFleetManager(role)) return true;
  const entry = PERMISSIONS[resource];
  if (!entry || !entry[action]) return false;
  return entry[action].includes(role);
};
