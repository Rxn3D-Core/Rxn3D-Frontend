# Add Slip Modal Optimization Guide

## Problem Analysis

The "Add Slip" modal was making **140-238 requests** on initial open, causing:
- ❌ Slow modal opening (1-2 seconds)
- ❌ High bandwidth usage (31.4 MB transferred)
- ❌ Repeated API calls for the same data
- ❌ No caching between modal opens

---

## Root Causes Identified

### 1. **Repeated Shade API Calls**
```
teeth-shades - Called 6-8 times (600-650ms each)
gum-shades   - Called 6-8 times (600-650ms each)
```
**Problem:** Fetched every time user changes product, not cached

### 2. **Multiple Office/Lab Fetches**
```
connected-offices - Called 2-3 times
```
**Problem:** No caching between renders

### 3. **Individual Product Fetches**
```
If 100 products: 100 individual requests
```
**Problem:** No batching or bulk fetching

### 4. **No Lazy Loading**
**Problem:** All data fetched immediately, even data needed later (shades, materials, etc.)

---

## Solution Implemented

### ✅ **Cached Hooks for Slip Data**

New file: `hooks/use-slip-data.ts`

#### **Features:**
1. ✅ In-session caching with in-flight request dedupe
2. ✅ Refetch on remount so reopen shows API updates
3. ✅ Lazy loading for shades (only fetch when needed)
4. ✅ Prefetching capability
5. ✅ Role-based data fetching

---

## How to Use the New Hooks

### **1. Replace fetchConnectedLabs/Offices**

#### Before (No Caching):
```typescript
import { useSlipCreation } from '@/contexts/slip-creation-context'

const { connectedOffices, fetchConnectedOffices } = useSlipCreation()

useEffect(() => {
  fetchConnectedOffices() // ❌ Fetches every time
}, [])
```

#### After (With Caching):
```typescript
import { useConnectedOfficesOrLabs } from '@/hooks/use-slip-data'

const { data: offices, isLoading } = useConnectedOfficesOrLabs()
// ✅ Dedupes in-flight requests during the same screen
// ✅ Refetches from the API when the screen is opened again
```

---

### **2. Replace fetchOfficeDoctors**

#### Before (No Caching):
```typescript
const { officeDoctors, fetchOfficeDoctors } = useSlipCreation()

useEffect(() => {
  if (selectedOfficeId) {
    fetchOfficeDoctors(selectedOfficeId) // ❌ No cache
  }
}, [selectedOfficeId])
```

#### After (With Caching):
```typescript
import { useOfficeDoctors } from '@/hooks/use-slip-data'

const { data: doctors, isLoading } = useOfficeDoctors(selectedOfficeId)
// ✅ Cached per officeId
// ✅ Only fetches when officeId changes
```

---

### **3. Replace Shade Fetching (LAZY LOADING)**

#### Before (Fetches Immediately):
```typescript
const { productTeethShades, productGumShades, fetchShades } = useSlipCreation()

useEffect(() => {
  fetchShades() // ❌ Fetches on modal open (not needed yet!)
}, [])
```

#### After (Lazy Load on Demand):
```typescript
import { useTeethShades, useGumShades } from '@/hooks/use-slip-data'

// Only enable when user reaches shade selection step
const isShadeStep = step === 5 // Example: step 5 is shade selection

const { data: teethShades, isLoading: loadingTeeth } = useTeethShades(isShadeStep)
const { data: gumShades, isLoading: loadingGum } = useGumShades(isShadeStep)

// ✅ Only fetches when isShadeStep = true
// ✅ Cached for 30 minutes
```

---

### **4. Prefetch Shades in Background (Optional)**

If you want shades ready before user needs them:

```typescript
import { usePrefetchShades } from '@/hooks/use-slip-data'

const prefetchShades = usePrefetchShades()

// Call when modal opens (prefetches in background)
useEffect(() => {
  if (modalOpen) {
    prefetchShades() // ✅ Loads shades silently in background
  }
}, [modalOpen, prefetchShades])
```

---

## Migration Example for dental-slip-page.tsx

### Step 1: Update Imports

```diff
- import { useSlipCreation } from '@/contexts/slip-creation-context'
+ import {
+   useConnectedOfficesOrLabs,
+   useOfficeDoctors,
+   useLabProducts,
+   useTeethShades,
+   useGumShades,
+ } from '@/hooks/use-slip-data'
```

### Step 2: Replace Context Calls

```diff
- const {
-   connectedLabs,
-   connectedOffices,
-   fetchConnectedLabs,
-   fetchConnectedOffices,
-   fetchOfficeDoctors,
- } = useSlipCreation()
+ const { data: offices, isLoading: loadingOffices } = useConnectedOfficesOrLabs()
+ const { data: doctors, isLoading: loadingDoctors } = useOfficeDoctors(selectedOfficeId)
```

### Step 3: Remove Manual useEffect Fetching

```diff
- useEffect(() => {
-   fetchConnectedLabs()
- }, [fetchConnectedLabs])
-
- useEffect(() => {
-   if (selectedOfficeId) {
-     fetchOfficeDoctors(selectedOfficeId)
-   }
- }, [selectedOfficeId, fetchOfficeDoctors])

// ✅ Delete all these useEffects - hooks fetch automatically!
```

### Step 4: Implement Lazy Loading for Shades

```diff
- const { productTeethShades, productGumShades } = useSlipCreation()
+ // Only fetch shades when user reaches shade selection step
+ const isShadeStep = step >= 5 // Adjust based on your step logic
+ const { data: teethShades } = useTeethShades(isShadeStep)
+ const { data: gumShades } = useGumShades(isShadeStep)
```

---

## Expected Performance Improvements

### Initial Modal Open (First Time)

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **Total Requests** | 140-238 | 140-238 | Same (expected) |
| **Data Cached** | No | Yes | ✅ |
| **Load Time** | 1-2 seconds | 1-2 seconds | Same |

### Reopening Modal (Within 10 min)

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **Total Requests** | 140-238 | **2-5** | **-98%** ⚡ |
| **Load Time** | 1-2 seconds | **50-100ms** | **-95%** ⚡ |
| **From Cache** | No | Yes | ✅ |

### Shade Loading (Lazy)

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **Fetched on modal open** | Yes | **No** | Deferred |
| **Fetched on shade step** | N/A | **Yes (once)** | On-demand |
| **Subsequent opens** | Fetches again | **From cache** | 0 requests |

---

## Cache Behavior

### Query Keys Structure

```typescript
slipDataKeys = {
  'slip-data', 'connected-offices'   // Offices list
  'slip-data', 'connected-labs'      // Labs list
  'slip-data', 'office-doctors', 123 // Doctors for office 123
  'slip-data', 'lab-products', 456   // Products for lab 456
  'slip-data', 'teeth-shades'        // Teeth shades (shared)
  'slip-data', 'gum-shades'          // Gum shades (shared)
}
```

### Cache Durations

| Data Type | Stale Time | Cache Time | Rationale |
|-----------|------------|------------|-----------|
| **Offices/Labs** | 10 min | 24 hours | Moderate change frequency |
| **Doctors** | 10 min | 24 hours | Moderate change frequency |
| **Products** | 10 min | 24 hours | Moderate change frequency |
| **Shades** | 30 min | 24 hours | Rarely changes |

---

## Testing Checklist

### Test 1: Initial Load
```
✅ Open modal - should see API requests
✅ Check localStorage - "rxn3d-query-cache" should contain data
✅ Modal loads with data
```

### Test 2: Reopen Modal (Caching)
```
✅ Close modal
✅ Reopen modal (within 10 min)
✅ Check Network tab - should see 0-2 requests (not 140+)
✅ Modal loads instantly (50-100ms)
```

### Test 3: Lazy Loading Shades
```
✅ Open modal - shades NOT fetched yet
✅ Navigate to shade selection step
✅ Shades fetch at this point (first time)
✅ Reopen modal & navigate to shades - loads from cache
```

### Test 4: Cache Expiration
```
✅ Wait 10+ minutes
✅ Reopen modal
✅ Shows cached data immediately
✅ Background refetch updates data
```

---

## Debugging

### View Cached Data

```typescript
import { useQueryClient } from '@tanstack/react-query'

const queryClient = useQueryClient()

// Log all cached queries
console.log('Cache:', queryClient.getQueryCache().getAll())

// Get specific cache
const offices = queryClient.getQueryData(['slip-data', 'connected-offices'])
console.log('Cached offices:', offices)
```

### Clear Cache Manually

```typescript
// Clear specific query
queryClient.removeQueries({ queryKey: ['slip-data', 'teeth-shades'] })

// Clear all slip data
queryClient.removeQueries({ queryKey: ['slip-data'] })

// Clear localStorage
localStorage.removeItem('rxn3d-query-cache')
```

---

## Advanced: Optimistic Updates

If you want immediate UI updates before API responds:

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { slipDataKeys } from '@/hooks/use-slip-data'

const queryClient = useQueryClient()

const addOfficeMutation = useMutation({
  mutationFn: addOffice,
  onMutate: async (newOffice) => {
    // Cancel outgoing queries
    await queryClient.cancelQueries({ queryKey: slipDataKeys.connectedOffices() })

    // Snapshot previous value
    const previous = queryClient.getQueryData(slipDataKeys.connectedOffices())

    // Optimistically update
    queryClient.setQueryData(slipDataKeys.connectedOffices(), (old: any) => [
      ...old,
      newOffice,
    ])

    return { previous }
  },
  onError: (err, variables, context) => {
    // Rollback on error
    queryClient.setQueryData(slipDataKeys.connectedOffices(), context.previous)
  },
  onSettled: () => {
    // Refetch after mutation
    queryClient.invalidateQueries({ queryKey: slipDataKeys.connectedOffices() })
  },
})
```

---

## Summary

### Before:
- ❌ 140-238 requests on every modal open
- ❌ 1-2 second load time
- ❌ No caching
- ❌ Repeated shade fetches (6-8 times)
- ❌ Fetches everything immediately

### After:
- ✅ Cached data paints immediately, then lists refetch on reopen
- ✅ In-flight requests are still deduped during the same screen
- ✅ Shades fetched once per session (30-minute stale time)
- ✅ Lazy loading for non-critical data
- ✅ New Slip / cancel clears list + product-detail caches

### **Performance Gain: duplicate in-screen requests are still avoided; reopen now stays in sync with the API**

---

## Next Steps

1. **Migrate dental-slip-page.tsx** to use new hooks
2. **Test caching** by opening/closing modal
3. **Verify request reduction** in Network tab
4. **Adjust staleTime** if needed based on data volatility
5. **Consider prefetching** for smoother UX

For questions or issues, refer to:
- [CACHING_GUIDE.md](./CACHING_GUIDE.md) - General caching documentation
- [MIGRATION_EXAMPLE.md](./MIGRATION_EXAMPLE.md) - Dashboard migration example
