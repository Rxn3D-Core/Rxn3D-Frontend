# API Service Usage Guide

## Overview

The new API service provides centralized authentication, error handling, and automatic 401 redirects to login.

## Features

- ✅ **Automatic Authentication** - All requests include Bearer token from localStorage
- ✅ **401 Handling** - Automatic redirect to login on unauthorized responses
- ✅ **Error Handling** - Centralized error handling for all API calls
- ✅ **Type Safety** - Full TypeScript support with proper typing
- ✅ **Global Interceptor** - Automatically handles 401 responses across the entire app

## Usage Examples

### Using ProductApi (Recommended)

```typescript
import { ProductApi } from '@/lib/api-service'

// Get product grades
const grades = await ProductApi.getGrades(customerId, productId)

// Get product stages
const stages = await ProductApi.getStages(customerId, productId)

// Get product teeth shades
const teethShades = await ProductApi.getTeethShades(customerId, productId)

// Get product gum shades
const gumShades = await ProductApi.getGumShades(customerId, productId)

// Get product impressions
const impressions = await ProductApi.getImpressions(customerId, productId)

// Calculate delivery date
const deliveryData = await ProductApi.calculateDelivery(productId, stageId)
```

### Using Base ApiService

```typescript
import ApiService from '@/lib/api-service'

// GET request
const data = await ApiService.get('/api/endpoint')

// POST request
const result = await ApiService.post('/api/endpoint', { key: 'value' })

// PUT request
const updated = await ApiService.put('/api/endpoint', { key: 'value' })

// DELETE request
await ApiService.delete('/api/endpoint')

// PATCH request
const patched = await ApiService.patch('/api/endpoint', { key: 'value' })
```

### Using with TanStack Query

```typescript
import { useQuery } from '@tanstack/react-query'
import { ProductApi } from '@/lib/api-service'

export function useProductGrades(productId: number | null) {
  return useQuery({
    queryKey: ['product-grades', productId],
    queryFn: async () => {
      if (!productId) return []
      
      const customerId = localStorage.getItem('customerId')
      if (!customerId) return []
      
      return ProductApi.getGrades(customerId, productId)
    },
    enabled: !!productId,
  })
}
```

## Automatic 401 Handling

The service automatically:

1. **Detects 401 responses** from any API call
2. **Clears authentication data** (token, user, customerId)
3. **Redirects to login page** (`/login`)
4. **Prevents further processing** by throwing an error

## Error Handling

All API calls include proper error handling:

- **401 Unauthorized** → Automatic redirect to login
- **Network errors** → User-friendly error messages
- **Server errors** → Proper error propagation
- **Validation errors** → Structured error responses

## Benefits

- 🚀 **No more manual auth handling** - Automatic token inclusion
- 🔒 **Secure by default** - All requests authenticated
- 🎯 **Consistent error handling** - Centralized 401 management
- 📱 **Better UX** - Automatic redirects on auth failures
- 🛠️ **Easy maintenance** - Single place to update auth logic
- 🔄 **Global coverage** - Works across entire application

## Migration from Old Code

### Before (Manual fetch)
```typescript
const response = await fetch('/api/endpoint', {
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('token')}`
  }
})
if (!response.ok) throw new Error('Request failed')
return response.json()
```

### After (Using ApiService)
```typescript
const data = await ApiService.get('/api/endpoint')
```

The new approach is much cleaner and handles all edge cases automatically! 