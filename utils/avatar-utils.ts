/**
 * Generate a hash from a string to use as a consistent seed
 * 
 * @param str - String to hash
 * @returns Numeric hash value
 */
function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash)
}

/**
 * Generate a random real human avatar URL for a user
 * Uses Pravatar service which provides real human photos
 * 
 * @param seed - A unique identifier for the user (email, id, or name)
 * @param size - Avatar size in pixels (default: 200)
 * @returns Avatar URL string
 */

// Cache for avatar URLs by seed to ensure consistency
const avatarCache = new Map<string, string>()

// Debounce state for random avatars (when no seed is provided)
let debounceTimer: NodeJS.Timeout | null = null
let lastRandomAvatarId: number | null = null
let lastCallTime: number = 0

// Debounce interval (ms) - wait for this long before generating a new random avatar
const debounceInterval = 300

export function getRandomAvatar(seed?: string | number, size: number = 200): string {
  // If seed is provided, use it to generate a consistent avatar
  if (seed !== undefined && seed !== null) {
    const seedKey = `${seed}-${size}`
    
    // Return cached avatar if available
    if (avatarCache.has(seedKey)) {
      return avatarCache.get(seedKey)!
    }
    
    // Generate consistent avatar ID based on seed
    const seedString = String(seed)
    const hash = hashString(seedString)
    const avatarId = (hash % 70) + 1
    
    const avatarUrl = `https://i.pravatar.cc/${size}?img=${avatarId}`
    avatarCache.set(seedKey, avatarUrl)
    
    return avatarUrl
  }
  
  // If no seed provided, use debounced random avatar
  const now = Date.now()
  
  // If we have a cached random avatar and it's been less than debounceInterval since last call,
  // return the cached one (throttle behavior)
  if (lastRandomAvatarId !== null && (now - lastCallTime) < debounceInterval) {
    return `https://i.pravatar.cc/${size}?img=${lastRandomAvatarId}`
  }
  
  // Clear any existing debounce timer
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }
  
  // Generate new random avatar ID
  const newAvatarId = Math.floor(Math.random() * 70) + 1
  
  // Debounce: only set the avatar ID after the debounce interval has passed
  debounceTimer = setTimeout(() => {
    lastRandomAvatarId = newAvatarId
    lastCallTime = Date.now()
    debounceTimer = null
  }, debounceInterval)
  
  // For the first call, set immediately
  if (lastRandomAvatarId === null) {
    lastRandomAvatarId = newAvatarId
    lastCallTime = now
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
  }
  
  return `https://i.pravatar.cc/${size}?img=${lastRandomAvatarId}`
}

/**
 * Alternative: Use Unsplash Source for real human avatars
 * 
 * @param seed - A unique identifier for the user
 * @param size - Avatar size in pixels (default: 200)
 * @returns Avatar URL string
 */
export function getRandomAvatarUnsplash(seed?: string | number, size: number = 200): string {
  let avatarSeed: number
  
  if (seed) {
    const seedString = String(seed)
    avatarSeed = hashString(seedString)
  } else {
    avatarSeed = Math.floor(Math.random() * 1000) + 1
  }
  
  // Use Unsplash Source with people photos
  // w=width, h=height, fit=crop ensures square images
  return `https://source.unsplash.com/${size}x${size}/?person&sig=${avatarSeed}`
}

/**
 * Get user avatar URL with fallback to random real human avatar
 * 
 * @param userImage - User's custom image URL (if exists)
 * @param fallbackSeed - Seed for random avatar generation (user email, id, or name)
 * @param size - Avatar size in pixels (default: 200)
 * @returns Avatar URL string
 */
export function getUserAvatar(userImage?: string | null, fallbackSeed?: string | number, size: number = 200): string {
  if (userImage) {
    return userImage
  }
  
  // Use random real human avatar as fallback
  return getRandomAvatar(fallbackSeed, size)
}

