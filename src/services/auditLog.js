// Audit logging for tracking events (non-sensitive information)

const auditLogs = [];
const MAX_LOG_SIZE = 1000; // Keep last 1000 events

export const auditLog = (eventType, data = {}) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    eventType,
    data: {
      ...data,
      // Exclude sensitive data like actual payment info, full cart
    },
    userAgent: navigator.userAgent,
  };

  auditLogs.push(logEntry);

  // Keep log size manageable
  if (auditLogs.length > MAX_LOG_SIZE) {
    auditLogs.shift();
  }

  // Log to console in development
  if (import.meta.env.DEV) {
    console.log(`[AUDIT] ${eventType}`, data);
  }

  return logEntry;
};

export const getAuditLogs = () => {
  return [...auditLogs];
};

export const getAuditLogsByType = (eventType) => {
  return auditLogs.filter(log => log.eventType === eventType);
};

export const clearAuditLogs = () => {
  auditLogs.length = 0;
};

export const exportAuditLogs = () => {
  return JSON.stringify(auditLogs, null, 2);
};

export default auditLog;
