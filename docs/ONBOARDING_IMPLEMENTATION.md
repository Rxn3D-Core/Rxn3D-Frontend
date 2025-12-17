# Enhanced Onboarding System Implementation

This document describes the implementation of the enhanced onboarding system that relies on API data instead of localStorage for tracking onboarding completion status.

## Overview

The new onboarding system provides:
- API-based onboarding status tracking
- Real-time onboarding completion checks
- Business hours setup completion tracking
- Centralized onboarding status management

## Key Components

### 1. API Service (`lib/api-onboarding.ts`)

The `OnboardingApiService` class provides methods to interact with the onboarding APIs:

```typescript
import { OnboardingApiService } from '@/lib/api-onboarding'

// Check if onboarding is complete
const isComplete = await OnboardingApiService.isOnboardingComplete(customerId)

// Get detailed onboarding status
const status = await OnboardingApiService.getOnboardingStatus(customerId)

// Mark business hours setup as complete
await OnboardingApiService.markBusinessHoursSetupCompleted(customerId)
```

### 2. Custom Hook (`hooks/use-onboarding-status.ts`)

The `useOnboardingStatus` hook provides a React-friendly interface for onboarding status:

```typescript
import { useOnboardingStatus } from '@/hooks/use-onboarding-status'

function MyComponent() {
  const { 
    onboardingStatus, 
    isOnboardingComplete, 
    isLoading, 
    error,
    refetch,
    markBusinessHoursComplete 
  } = useOnboardingStatus()

  // Use the onboarding data
}
```

### 3. Onboarding Check Component (`components/onboarding-check.tsx`)

The `OnboardingCheck` component automatically redirects users to onboarding if needed:

```typescript
import { OnboardingCheck } from '@/components/onboarding-check'

// Include in your app layout
<OnboardingCheck />
```

### 4. Status Display Component (`components/onboarding-status-display.tsx`)

A UI component to display onboarding status:

```typescript
import { OnboardingStatusDisplay } from '@/components/onboarding-status-display'

// Use in admin panels or user dashboards
<OnboardingStatusDisplay />
```

## API Endpoints

The system uses the following API endpoints:

### Get Onboarding Status
- **Endpoint**: `GET /v1/business-hours/setup-status/{customerId}`
- **Description**: Get comprehensive onboarding status including both initial onboarding and business hours setup
- **Response**: Includes `onboarding_completed` and `business_hours_setup_completed` flags

### Mark Business Hours Complete
- **Endpoint**: `POST /v1/business-hours/setup-completed`
- **Description**: Mark business hours setup as completed
- **Body**: `{ "customer_id": number }`

## Integration Points

### 1. Auth Context Updates

The `User` type has been updated to include customer onboarding information:

```typescript
type User = {
  // ... existing fields
  customer?: {
    id: number
    name: string
    type: 'lab' | 'office'
    onboarding_completed?: boolean
    onboarding_completed_at?: string | null
    business_hours_setup_completed?: boolean
    business_hours_setup_completed_at?: string | null
  }
}
```

### 2. Business Settings Integration

The business settings context automatically marks business hours as complete when settings are saved:

```typescript
// In BusinessSettingsProvider
const result = await submitBusinessSettings(customerId, customerType)

// Automatically marks business hours as complete
await OnboardingApiService.markBusinessHoursSetupCompleted(customerId)
```

## Usage Examples

### Basic Onboarding Check

```typescript
import { useOnboardingStatus } from '@/hooks/use-onboarding-status'

function Dashboard() {
  const { isOnboardingComplete, isLoading } = useOnboardingStatus()

  if (isLoading) return <div>Loading...</div>
  
  if (!isOnboardingComplete) {
    return <div>Please complete your onboarding</div>
  }

  return <div>Welcome to your dashboard!</div>
}
```

### Manual Status Check

```typescript
import { OnboardingApiService } from '@/lib/api-onboarding'

async function checkOnboarding(customerId: number) {
  try {
    const isComplete = await OnboardingApiService.isOnboardingComplete(customerId)
    console.log('Onboarding complete:', isComplete)
  } catch (error) {
    console.error('Error checking onboarding:', error)
  }
}
```

### Display Onboarding Status

```typescript
import { OnboardingStatusDisplay } from '@/components/onboarding-status-display'

function AdminPanel() {
  return (
    <div>
      <h1>Customer Management</h1>
      <OnboardingStatusDisplay />
    </div>
  )
}
```

## Migration from localStorage

The system has been updated to remove localStorage dependency for onboarding status:

### Before (localStorage-based)
```typescript
const onboardingComplete = localStorage.getItem("onboardingComplete") === "true"
```

### After (API-based)
```typescript
const { isOnboardingComplete } = useOnboardingStatus()
```

## Error Handling

The system includes comprehensive error handling:

- Network errors are caught and logged
- API errors are displayed to users
- Fallback behavior when API is unavailable
- Loading states during API calls

## Performance Considerations

- Onboarding status is cached in React state
- API calls are made only when necessary
- Loading states prevent unnecessary re-renders
- Error states provide user feedback

## Testing

To test the onboarding system:

1. **Complete Onboarding**: Use the lab/office onboarding APIs
2. **Check Status**: Verify the status is correctly returned
3. **Business Hours**: Complete business hours setup
4. **Final Check**: Ensure overall onboarding is marked complete

## Troubleshooting

### Common Issues

1. **API Not Available**: Check API endpoint configuration
2. **Authentication**: Ensure valid JWT token
3. **Customer ID**: Verify customer ID is available
4. **Network Errors**: Check network connectivity

### Debug Information

Enable debug logging by checking browser console for:
- API request/response details
- Error messages
- Loading state changes

## Future Enhancements

Potential improvements to consider:

1. **Real-time Updates**: WebSocket integration for live status updates
2. **Progress Tracking**: Step-by-step onboarding progress
3. **Analytics**: Track onboarding completion rates
4. **Notifications**: Alert users about incomplete onboarding
5. **Customization**: Per-customer onboarding requirements
