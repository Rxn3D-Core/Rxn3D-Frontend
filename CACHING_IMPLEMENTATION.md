# Caching and Restore Implementation Plan

This document outlines the changes needed to implement caching and restore functionality for the case design center.

## Changes Required:

1. **Update Dialog imports** - Add DialogHeader, DialogTitle, DialogDescription, DialogOverlay
2. **Add restore modal state** - `showRestoreModal` state variable
3. **Create saveWorkInProgress function** - Saves all current selections to localStorage
4. **Create restoreWorkInProgress function** - Restores cached data from localStorage
5. **Add auto-save useEffect** - Automatically saves work-in-progress on state changes
6. **Add beforeunload event listener** - Warns users before page refresh/close
7. **Add restore confirmation modal** - Shows when cached data is detected on page load
8. **Check for cached data on page load** - In the initial useEffect

## Data to Cache:
- Selected product
- Product details
- Maxillary teeth selections
- Mandibular teeth selections
- Retention types
- Form field values (material, shade, stage, etc.)
- Chart visibility states
- Selected impressions
- Selected shades
- Advance field values
