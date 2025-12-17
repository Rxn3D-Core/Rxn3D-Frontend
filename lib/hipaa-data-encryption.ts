/**
 * HIPAA Data Encryption Utility
 * Provides encryption/decryption for sensitive data to meet HIPAA requirements
 */

// Note: In production, use a proper encryption library like crypto-js or the Web Crypto API
// This is a simplified implementation for demonstration purposes

export interface EncryptionConfig {
  algorithm: string
  keySize: number
  ivSize: number
  saltSize: number
}

export interface EncryptedData {
  data: string
  iv: string
  salt: string
  version: string
}

class HIPAAEncryption {
  private config: EncryptionConfig
  private readonly VERSION = '1.0'

  constructor(config: Partial<EncryptionConfig> = {}) {
    this.config = {
      algorithm: 'AES-GCM',
      keySize: 256,
      ivSize: 12,
      saltSize: 16,
      ...config
    }
  }

  /**
   * Generate a secure encryption key
   */
  private async generateKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    )

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: this.config.keySize },
      false,
      ['encrypt', 'decrypt']
    )
  }

  /**
   * Encrypt sensitive data
   */
  async encrypt(data: string, password: string): Promise<EncryptedData> {
    try {
      // Generate salt and IV
      const salt = crypto.getRandomValues(new Uint8Array(this.config.saltSize))
      const iv = crypto.getRandomValues(new Uint8Array(this.config.ivSize))

      // Generate key
      const key = await this.generateKey(password, salt)

      // Encrypt data
      const encodedData = new TextEncoder().encode(data)
      const encryptedBuffer = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        encodedData
      )

      // Convert to base64 strings
      const encryptedData = btoa(String.fromCharCode(...new Uint8Array(encryptedBuffer)))
      const saltString = btoa(String.fromCharCode(...salt))
      const ivString = btoa(String.fromCharCode(...iv))

      return {
        data: encryptedData,
        iv: ivString,
        salt: saltString,
        version: this.VERSION
      }
    } catch (error) {
      console.error('Encryption failed:', error)
      throw new Error('Failed to encrypt data')
    }
  }

  /**
   * Decrypt sensitive data
   */
  async decrypt(encryptedData: EncryptedData, password: string): Promise<string> {
    try {
      // Convert base64 strings back to Uint8Arrays
      const salt = new Uint8Array(atob(encryptedData.salt).split('').map(char => char.charCodeAt(0)))
      const iv = new Uint8Array(atob(encryptedData.iv).split('').map(char => char.charCodeAt(0)))
      const data = new Uint8Array(atob(encryptedData.data).split('').map(char => char.charCodeAt(0)))

      // Generate key
      const key = await this.generateKey(password, salt)

      // Decrypt data
      const decryptedBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        data
      )

      return new TextDecoder().decode(decryptedBuffer)
    } catch (error) {
      console.error('Decryption failed:', error)
      throw new Error('Failed to decrypt data')
    }
  }

  /**
   * Hash sensitive data (one-way encryption)
   */
  async hash(data: string, salt?: string): Promise<{ hash: string; salt: string }> {
    const saltBytes = salt ? new Uint8Array(atob(salt).split('').map(char => char.charCodeAt(0))) 
                          : crypto.getRandomValues(new Uint8Array(16))
    
    const encoder = new TextEncoder()
    const dataBuffer = encoder.encode(data)
    
    const hashBuffer = await crypto.subtle.digest('SHA-256', new Uint8Array([...saltBytes, ...dataBuffer]))
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    const saltString = btoa(String.fromCharCode(...saltBytes))

    return { hash, salt: saltString }
  }

  /**
   * Verify hashed data
   */
  async verifyHash(data: string, hash: string, salt: string): Promise<boolean> {
    const { hash: computedHash } = await this.hash(data, salt)
    return computedHash === hash
  }

  /**
   * Generate a secure random token
   */
  generateSecureToken(length: number = 32): string {
    const array = new Uint8Array(length)
    crypto.getRandomValues(array)
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
  }

  /**
   * Encrypt patient data specifically
   */
  async encryptPatientData(patientData: any, encryptionKey: string): Promise<EncryptedData> {
    const dataString = JSON.stringify(patientData)
    return this.encrypt(dataString, encryptionKey)
  }

  /**
   * Decrypt patient data specifically
   */
  async decryptPatientData(encryptedData: EncryptedData, encryptionKey: string): Promise<any> {
    const decryptedString = await this.decrypt(encryptedData, encryptionKey)
    return JSON.parse(decryptedString)
  }

  /**
   * Secure data storage wrapper
   */
  async secureStore(key: string, data: any, password: string): Promise<void> {
    if (typeof window === 'undefined') return

    try {
      const encryptedData = await this.encrypt(JSON.stringify(data), password)
      localStorage.setItem(key, JSON.stringify(encryptedData))
    } catch (error) {
      console.error('Failed to securely store data:', error)
      throw new Error('Failed to store data securely')
    }
  }

  /**
   * Secure data retrieval wrapper
   */
  async secureRetrieve(key: string, password: string): Promise<any> {
    if (typeof window === 'undefined') return null

    try {
      const storedData = localStorage.getItem(key)
      if (!storedData) return null

      const encryptedData: EncryptedData = JSON.parse(storedData)
      const decryptedString = await this.decrypt(encryptedData, password)
      return JSON.parse(decryptedString)
    } catch (error) {
      console.error('Failed to securely retrieve data:', error)
      throw new Error('Failed to retrieve data securely')
    }
  }

  /**
   * Secure data removal
   */
  secureRemove(key: string): void {
    if (typeof window === 'undefined') return
    localStorage.removeItem(key)
  }

  /**
   * Check if data is encrypted
   */
  isEncrypted(data: any): boolean {
    if (typeof data !== 'object' || data === null) return false
    return data.hasOwnProperty('data') && 
           data.hasOwnProperty('iv') && 
           data.hasOwnProperty('salt') && 
           data.hasOwnProperty('version')
  }
}

// Create a singleton instance
export const hipaaEncryption = new HIPAAEncryption()

// Export convenience functions
export const encryptData = hipaaEncryption.encrypt.bind(hipaaEncryption)
export const decryptData = hipaaEncryption.decrypt.bind(hipaaEncryption)
export const hashData = hipaaEncryption.hash.bind(hipaaEncryption)
export const verifyHash = hipaaEncryption.verifyHash.bind(hipaaEncryption)
export const generateSecureToken = hipaaEncryption.generateSecureToken.bind(hipaaEncryption)
export const encryptPatientData = hipaaEncryption.encryptPatientData.bind(hipaaEncryption)
export const decryptPatientData = hipaaEncryption.decryptPatientData.bind(hipaaEncryption)
export const secureStore = hipaaEncryption.secureStore.bind(hipaaEncryption)
export const secureRetrieve = hipaaEncryption.secureRetrieve.bind(hipaaEncryption)
export const secureRemove = hipaaEncryption.secureRemove.bind(hipaaEncryption) 