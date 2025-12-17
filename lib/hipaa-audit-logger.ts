/**
 * HIPAA Audit Logger
 * Tracks access to Protected Health Information (PHI) for compliance
 */

export interface AuditLogEntry {
  id: string
  timestamp: Date
  userId: string
  userRole: string
  action: string
  resource: string
  resourceId?: string
  patientId?: string
  ipAddress?: string
  userAgent?: string
  success: boolean
  details?: string
  sessionId?: string
}

export interface AuditLogConfig {
  enabled: boolean
  logLevel: 'basic' | 'detailed' | 'verbose'
  retentionDays: number
  encryptLogs: boolean
}

class HIPAAAuditLogger {
  private config: AuditLogConfig
  private logs: AuditLogEntry[] = []

  constructor(config: Partial<AuditLogConfig> = {}) {
    this.config = {
      enabled: true,
      logLevel: 'detailed',
      retentionDays: 2555, // 7 years for HIPAA compliance
      encryptLogs: true,
      ...config
    }
  }

  /**
   * Log access to PHI
   */
  logPHIAccess(
    userId: string,
    userRole: string,
    action: string,
    resource: string,
    resourceId?: string,
    patientId?: string,
    details?: string
  ): void {
    if (!this.config.enabled) return

    const entry: AuditLogEntry = {
      id: this.generateId(),
      timestamp: new Date(),
      userId,
      userRole,
      action,
      resource,
      resourceId,
      patientId,
      ipAddress: this.getClientIP(),
      userAgent: this.getUserAgent(),
      success: true,
      details,
      sessionId: this.getSessionId()
    }

    this.addLogEntry(entry)
  }

  /**
   * Log failed access attempts
   */
  logFailedAccess(
    userId: string,
    userRole: string,
    action: string,
    resource: string,
    reason: string,
    resourceId?: string,
    patientId?: string
  ): void {
    if (!this.config.enabled) return

    const entry: AuditLogEntry = {
      id: this.generateId(),
      timestamp: new Date(),
      userId,
      userRole,
      action,
      resource,
      resourceId,
      patientId,
      ipAddress: this.getClientIP(),
      userAgent: this.getUserAgent(),
      success: false,
      details: `Access denied: ${reason}`,
      sessionId: this.getSessionId()
    }

    this.addLogEntry(entry)
  }

  /**
   * Log data modifications
   */
  logDataModification(
    userId: string,
    userRole: string,
    action: string,
    resource: string,
    resourceId: string,
    patientId?: string,
    changes?: Record<string, any>
  ): void {
    if (!this.config.enabled) return

    const entry: AuditLogEntry = {
      id: this.generateId(),
      timestamp: new Date(),
      userId,
      userRole,
      action,
      resource,
      resourceId,
      patientId,
      ipAddress: this.getClientIP(),
      userAgent: this.getUserAgent(),
      success: true,
      details: changes ? `Changes: ${JSON.stringify(changes)}` : undefined,
      sessionId: this.getSessionId()
    }

    this.addLogEntry(entry)
  }

  /**
   * Log data exports
   */
  logDataExport(
    userId: string,
    userRole: string,
    resource: string,
    format: string,
    recordCount: number,
    patientIds?: string[]
  ): void {
    if (!this.config.enabled) return

    const entry: AuditLogEntry = {
      id: this.generateId(),
      timestamp: new Date(),
      userId,
      userRole,
      action: 'EXPORT',
      resource,
      ipAddress: this.getClientIP(),
      userAgent: this.getUserAgent(),
      success: true,
      details: `Exported ${recordCount} records in ${format} format`,
      sessionId: this.getSessionId()
    }

    this.addLogEntry(entry)
  }

  /**
   * Log login/logout events
   */
  logAuthentication(
    userId: string,
    userRole: string,
    action: 'LOGIN' | 'LOGOUT' | 'LOGIN_FAILED',
    success: boolean,
    details?: string
  ): void {
    if (!this.config.enabled) return

    const entry: AuditLogEntry = {
      id: this.generateId(),
      timestamp: new Date(),
      userId,
      userRole,
      action,
      resource: 'AUTHENTICATION',
      ipAddress: this.getClientIP(),
      userAgent: this.getUserAgent(),
      success,
      details,
      sessionId: this.getSessionId()
    }

    this.addLogEntry(entry)
  }

  /**
   * Get audit logs for a specific patient
   */
  getPatientAuditLogs(patientId: string, startDate?: Date, endDate?: Date): AuditLogEntry[] {
    return this.logs.filter(log => {
      if (log.patientId !== patientId) return false
      if (startDate && log.timestamp < startDate) return false
      if (endDate && log.timestamp > endDate) return false
      return true
    })
  }

  /**
   * Get audit logs for a specific user
   */
  getUserAuditLogs(userId: string, startDate?: Date, endDate?: Date): AuditLogEntry[] {
    return this.logs.filter(log => {
      if (log.userId !== userId) return false
      if (startDate && log.timestamp < startDate) return false
      if (endDate && log.timestamp > endDate) return false
      return true
    })
  }

  /**
   * Get all audit logs within a date range
   */
  getAuditLogs(startDate?: Date, endDate?: Date): AuditLogEntry[] {
    return this.logs.filter(log => {
      if (startDate && log.timestamp < startDate) return false
      if (endDate && log.timestamp > endDate) return false
      return true
    })
  }

  /**
   * Export audit logs for compliance reporting
   */
  exportAuditLogs(startDate?: Date, endDate?: Date): string {
    const logs = this.getAuditLogs(startDate, endDate)
    return JSON.stringify(logs, null, 2)
  }

  /**
   * Clean up old logs based on retention policy
   */
  cleanupOldLogs(): void {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays)

    this.logs = this.logs.filter(log => log.timestamp > cutoffDate)
  }

  /**
   * Private helper methods
   */
  private addLogEntry(entry: AuditLogEntry): void {
    this.logs.push(entry)
    
    // Store in localStorage for persistence (in production, this would go to a secure database)
    if (typeof window !== 'undefined') {
      try {
        const storedLogs = localStorage.getItem('hipaa_audit_logs') || '[]'
        const allLogs = JSON.parse(storedLogs)
        allLogs.push(entry)
        
        // Keep only the last 1000 entries to prevent localStorage overflow
        if (allLogs.length > 1000) {
          allLogs.splice(0, allLogs.length - 1000)
        }
        
        localStorage.setItem('hipaa_audit_logs', JSON.stringify(allLogs))
      } catch (error) {
        console.error('Failed to store audit log:', error)
      }
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  private getClientIP(): string {
    // In a real implementation, this would get the actual client IP
    // For now, return a placeholder
    return '127.0.0.1'
  }

  private getUserAgent(): string {
    if (typeof window !== 'undefined') {
      return window.navigator.userAgent
    }
    return 'Unknown'
  }

  private getSessionId(): string {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('session_id') || 'unknown'
    }
    return 'unknown'
  }
}

// Create a singleton instance
export const hipaaAuditLogger = new HIPAAAuditLogger()

// Export convenience functions
export const logPHIAccess = hipaaAuditLogger.logPHIAccess.bind(hipaaAuditLogger)
export const logFailedAccess = hipaaAuditLogger.logFailedAccess.bind(hipaaAuditLogger)
export const logDataModification = hipaaAuditLogger.logDataModification.bind(hipaaAuditLogger)
export const logDataExport = hipaaAuditLogger.logDataExport.bind(hipaaAuditLogger)
export const logAuthentication = hipaaAuditLogger.logAuthentication.bind(hipaaAuditLogger) 