export const ROLES = {
  FLEET_MANAGER: 'FLEET_MANAGER',
  DRIVER: 'DRIVER',
  SAFETY_OFFICER: 'SAFETY_OFFICER',
  FINANCIAL_ANALYST: 'FINANCIAL_ANALYST',
};

export const isFleetManager = (role) => role === ROLES.FLEET_MANAGER;

export const NAV_ITEMS = [
  { to: '/dashboard', icon: 'LayoutDashboard', label: 'Dashboard', roles: Object.values(ROLES) },
  { to: '/vehicles', icon: 'Truck', label: 'Vehicles', roles: [ROLES.FLEET_MANAGER, ROLES.FINANCIAL_ANALYST] },
  { to: '/drivers', icon: 'Users', label: 'Drivers', roles: [ROLES.FLEET_MANAGER, ROLES.SAFETY_OFFICER] },
  { to: '/trips', icon: 'Route', label: 'Trips', roles: [ROLES.FLEET_MANAGER, ROLES.DRIVER] },
  { to: '/maintenance', icon: 'Wrench', label: 'Maintenance', roles: [ROLES.FLEET_MANAGER, ROLES.FINANCIAL_ANALYST] },
  { to: '/expenses', icon: 'Fuel', label: 'Fuel & Expenses', roles: [ROLES.FLEET_MANAGER, ROLES.FINANCIAL_ANALYST] },
  { to: '/reports', icon: 'BarChart3', label: 'Reports', roles: [ROLES.FLEET_MANAGER, ROLES.FINANCIAL_ANALYST] },
  { to: '/employees', icon: 'UserPlus', label: 'Employees', roles: [ROLES.FLEET_MANAGER] },
];

export const ROUTE_ACCESS = {
  '/dashboard': Object.values(ROLES),
  '/vehicles': [ROLES.FLEET_MANAGER, ROLES.FINANCIAL_ANALYST],
  '/drivers': [ROLES.FLEET_MANAGER, ROLES.SAFETY_OFFICER],
  '/trips': [ROLES.FLEET_MANAGER, ROLES.DRIVER],
  '/maintenance': [ROLES.FLEET_MANAGER, ROLES.FINANCIAL_ANALYST],
  '/expenses': [ROLES.FLEET_MANAGER, ROLES.FINANCIAL_ANALYST],
  '/reports': [ROLES.FLEET_MANAGER, ROLES.FINANCIAL_ANALYST],
  '/employees': [ROLES.FLEET_MANAGER],
};

export const canAccessRoute = (path, role) =>
  isFleetManager(role) || (ROUTE_ACCESS[path]?.includes(role) ?? false);

export const getNavForRole = (role) =>
  isFleetManager(role) ? NAV_ITEMS : NAV_ITEMS.filter((item) => item.roles.includes(role));

export const canManageVehicles = (role) => isFleetManager(role);
export const canManageDrivers = (role) => isFleetManager(role) || role === ROLES.SAFETY_OFFICER;
export const canManageTrips = (role) => isFleetManager(role) || role === ROLES.DRIVER;
export const canViewTrips = (role) => isFleetManager(role) || role === ROLES.DRIVER;
export const canManageMaintenance = (role) => isFleetManager(role);
export const canManageExpenses = (role) => isFleetManager(role) || role === ROLES.FINANCIAL_ANALYST;
export const canExportReports = (role) => isFleetManager(role) || role === ROLES.FINANCIAL_ANALYST;

export const ROLE_HOME = {
  [ROLES.FLEET_MANAGER]: '/dashboard',
  [ROLES.DRIVER]: '/trips',
  [ROLES.SAFETY_OFFICER]: '/drivers',
  [ROLES.FINANCIAL_ANALYST]: '/reports',
};

export const ROLE_DESCRIPTION = {
  [ROLES.FLEET_MANAGER]: 'Full platform access — fleet, drivers, trips, maintenance, expenses & reports',
  [ROLES.DRIVER]: 'Create trips, assign vehicles & drivers, monitor deliveries',
  [ROLES.SAFETY_OFFICER]: 'Driver compliance, license validity & safety scores',
  [ROLES.FINANCIAL_ANALYST]: 'Expenses, fuel consumption, maintenance costs & profitability',
};
