import prisma from '../lib/prisma.js';

/**
 * Creates a persistent notification for a specific user.
 */
export async function createNotification(userId, title, message, type, options = {}) {
  if (!userId) return null;
  const { actionable = false, actionType = null, actionData = null } = options;
  try {
    return await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type,
        actionable,
        actionType,
        actionData: actionData ? JSON.stringify(actionData) : null,
      },
    });
  } catch (err) {
    console.error(`Failed to create notification for user ${userId}:`, err);
    return null;
  }
}

/**
 * Broadcasts a notification to all active Fleet Managers.
 */
export async function notifyFleetManagers(title, message, type, options = {}) {
  try {
    const managers = await prisma.user.findMany({
      where: { role: 'FLEET_MANAGER', deleted: false },
      select: { id: true },
    });

    const promises = managers.map((mgr) =>
      createNotification(mgr.id, title, message, type, options)
    );
    return await Promise.all(promises);
  } catch (err) {
    console.error('Failed to broadcast notification to fleet managers:', err);
    return [];
  }
}

/**
 * Checks for expired or expiring licenses and creates notifications if they don't already exist.
 */
export async function checkLicenseExpirations() {
  try {
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    // Find drivers whose licenses are expired or expiring in less than 30 days
    const expiringDrivers = await prisma.driver.findMany({
      where: {
        licenseExpiry: { lte: thirtyDaysFromNow },
        deleted: false,
        status: { not: 'SUSPENDED' },
      },
    });

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);

    for (const driver of expiringDrivers) {
      const expiryDate = new Date(driver.licenseExpiry);
      const isExpired = expiryDate < now;
      const daysLeft = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));

      const title = isExpired ? 'Driver License Expired' : 'Driver License Expiring Soon';
      const message = isExpired
        ? `Driver license (${driver.licenseNumber}) expired on ${expiryDate.toLocaleDateString()}.`
        : `Driver license (${driver.licenseNumber}) expires on ${expiryDate.toLocaleDateString()} (${daysLeft} days left).`;

      // 1. Find corresponding user account
      const driverUser = await prisma.user.findFirst({
        where: {
          OR: [
            { id: driver.userId || '' },
            { licenseNumber: driver.licenseNumber },
          ],
          deleted: false,
        },
        select: { id: true },
      });

      // 2. Prevent spam: check if they received a warning with the same title in the last 7 days
      if (driverUser) {
        const existingDriverNotif = await prisma.notification.findFirst({
          where: {
            userId: driverUser.id,
            type: 'LICENSE_EXPIRY',
            title,
            createdAt: { gte: sevenDaysAgo },
          },
        });

        if (!existingDriverNotif) {
          const userMessage = isExpired
            ? `Your driver license (${driver.licenseNumber}) expired on ${expiryDate.toLocaleDateString()}. Please renew it immediately.`
            : `Your driver license (${driver.licenseNumber}) expires on ${expiryDate.toLocaleDateString()} (${daysLeft} days left). Please renew it.`;

          await createNotification(driverUser.id, title, userMessage, 'LICENSE_EXPIRY');
        }
      }

      // 3. Notify fleet managers (prevent spam: check if a fleet manager received this warning recently)
      // Check for one manager first as a proxy for the broadcast
      const managerProxy = await prisma.user.findFirst({
        where: { role: 'FLEET_MANAGER', deleted: false },
        select: { id: true },
      });

      if (managerProxy) {
        const existingManagerNotif = await prisma.notification.findFirst({
          where: {
            userId: managerProxy.id,
            type: 'LICENSE_EXPIRY',
            title,
            message: `Driver ${driver.name}'s license (${driver.licenseNumber}) ${isExpired ? 'expired on' : 'expires on'} ${expiryDate.toLocaleDateString()}${isExpired ? '.' : ` (${daysLeft} days left).`}`,
            createdAt: { gte: sevenDaysAgo },
          },
        });

        if (!existingManagerNotif) {
          const mgrMessage = isExpired
            ? `Driver ${driver.name}'s license (${driver.licenseNumber}) expired on ${expiryDate.toLocaleDateString()}.`
            : `Driver ${driver.name}'s license (${driver.licenseNumber}) expires on ${expiryDate.toLocaleDateString()} (${daysLeft} days left).`;

          await notifyFleetManagers(title, mgrMessage, 'LICENSE_EXPIRY');
        }
      }
    }
  } catch (err) {
    console.error('Failed checking license expirations:', err);
  }
}
