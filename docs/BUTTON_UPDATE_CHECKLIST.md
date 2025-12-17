# Add Slip Button Update Checklist

## Quick Reference: Update All "Add Slip" Buttons

### Find and Replace

Use your IDE's "Find in Files" (Cmd+Shift+F / Ctrl+Shift+F) to locate all instances:

**Search for:**
```
/case-design
```

**In files matching:**
```
*.tsx
*.ts
```

**Look for patterns like:**
```typescript
router.push("/case-design")
router.push('/case-design')
onClick={() => router.push("/case-design")}
href="/case-design"
```

---

## Common Locations to Update

### 1. **Dashboard Components**

**File:** `app/dashboard/page.tsx` or `components/dashboard/*.tsx`

```diff
- <Button onClick={() => router.push("/case-design")}>
+ <Button onClick={() => router.push("/add-slip")}>
  Add Slip
</Button>
```

---

### 2. **Lab Management / Case Management**

**File:** `app/lab-case-management/page.tsx`

```diff
- <Button onClick={() => router.push("/case-design?openModal=true")}>
+ <Button onClick={() => router.push("/add-slip")}>
  Create New Slip
</Button>
```

---

### 3. **Sidebar / Navigation Menu**

**File:** `components/sidebar.tsx` or `components/navigation.tsx`

```diff
- <Link href="/case-design">
+ <Link href="/add-slip">
  Add Slip
</Link>
```

---

### 4. **Floating Action Button (FAB)**

**File:** `components/fab.tsx` or similar

```diff
- onClick={() => router.push("/case-design")}
+ onClick={() => router.push("/add-slip")}
```

---

### 5. **Case List "Add New" Button**

**File:** `app/cases/page.tsx` or `components/case-list.tsx`

```diff
- <Button onClick={() => router.push("/case-design")}>
+ <Button onClick={() => router.push("/add-slip")}>
  + Add New Case
</Button>
```

---

## Automated Find & Replace

### Using VS Code / Cursor

1. Press `Cmd+Shift+F` (Mac) or `Ctrl+Shift+F` (Windows/Linux)
2. In "Find" field: `/case-design`
3. In "Files to include": `app/**/*.tsx, components/**/*.tsx`
4. Review each match
5. For "Add Slip" / "Create Slip" buttons, replace with `/add-slip`

**Important:** Do NOT replace:
- Routes that navigate TO case-design after slip creation
- Links that should go directly to case-design for editing existing cases

---

## Specific Changes by File

### ✅ Dashboard

```typescript
// File: app/dashboard/page.tsx

// OLD
<Button
  onClick={() => router.push("/case-design?openAddSlip=true")}
  className="..."
>
  <Plus className="w-4 h-4 mr-2" />
  Add Slip
</Button>

// NEW
<Button
  onClick={() => router.push("/add-slip")}
  className="..."
>
  <Plus className="w-4 h-4 mr-2" />
  Add Slip
</Button>
```

---

### ✅ Lab Admin Dashboard

```typescript
// File: components/dashboard/lab-admin-dashboard.tsx

// OLD
const handleAddSlip = () => {
  router.push("/case-design")
}

// NEW
const handleAddSlip = () => {
  router.push("/add-slip")
}
```

---

### ✅ Navigation Bar / Header

```typescript
// File: components/header.tsx or components/navbar.tsx

// OLD
<NavigationMenuItem>
  <Link href="/case-design" className="...">
    Add Slip
  </Link>
</NavigationMenuItem>

// NEW
<NavigationMenuItem>
  <Link href="/add-slip" className="...">
    Add Slip
  </Link>
</NavigationMenuItem>
```

---

### ✅ AddSlipModalProvider

```typescript
// File: components/add-slip-modal-provider.tsx

export function AddSlipModalProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  const openAddSlip = () => {
    // OLD: Open modal
    // setShowModal(true)

    // NEW: Navigate to standalone page
    router.push('/add-slip')
  }

  return (
    <AddSlipModalContext.Provider value={{ openAddSlip }}>
      {children}
    </AddSlipModalContext.Provider>
  )
}
```

---

## Testing Each Update

After updating each button:

```bash
✅ Click the button
✅ Verify navigates to /add-slip (NOT /case-design)
✅ Slip form loads in full screen
✅ Network tab shows 20-30 requests (NOT 200+)
✅ Complete the slip form
✅ Select arch
✅ Verify navigates to /case-design
✅ Case design loads correctly
```

---

## Keep These Routes Unchanged

**Do NOT change these:**

```typescript
// Editing existing cases
<Link href={`/case-design?caseId=${case.id}`}>Edit</Link>

// Direct access to case design
<Link href="/case-design">Case Design</Link> // In main navigation

// After slip completion (in add-slip/page.tsx)
router.push("/case-design") // ← Keep this!
```

---

## Search Patterns to Use

### Pattern 1: Find router.push to case-design
```regex
router\.push\(["|']/case-design
```

### Pattern 2: Find Link href to case-design
```regex
href=["|']/case-design["|']
```

### Pattern 3: Find onClick handlers
```regex
onClick.*case-design
```

---

## Rollback Plan

If you need to revert:

```typescript
// Find all instances of /add-slip
// Replace back with /case-design

// Search:
/add-slip

// Replace with:
/case-design
```

---

## Summary

### Changes to Make:

| Component | Old Route | New Route |
|-----------|-----------|-----------|
| Dashboard "Add Slip" | `/case-design` | `/add-slip` |
| Lab Management "Create" | `/case-design` | `/add-slip` |
| Navigation Menu | `/case-design` | `/add-slip` |
| FAB Button | `/case-design` | `/add-slip` |
| Case List "Add New" | `/case-design` | `/add-slip` |
| AddSlipModal Provider | Modal | `/add-slip` |

### Do NOT Change:

- Edit existing case links
- Direct case-design access
- Post-completion navigation (in add-slip/page.tsx)

---

## Verification

After all updates:

1. **Test each button location:**
   ```
   ✅ Dashboard
   ✅ Lab Management
   ✅ Navigation menu
   ✅ FAB
   ✅ Case list
   ```

2. **Verify network requests:**
   ```
   ✅ /add-slip loads: 20-30 requests
   ✅ NOT loading: /case-design
   ```

3. **Test full flow:**
   ```
   ✅ Click "Add Slip"
   ✅ Fill form
   ✅ Select arch
   ✅ Navigates to /case-design
   ✅ 3D editor works
   ```

---

## Quick Command

Run this in your terminal to find all instances:

```bash
grep -r "/case-design" app/ components/ --include="*.tsx" --include="*.ts" -n
```

Then manually review each match to determine if it should be changed to `/add-slip`.

---

## Next Steps

1. ✅ Find all "Add Slip" buttons
2. ✅ Update to `/add-slip`
3. ✅ Test each button
4. ✅ Verify network requests reduced
5. ✅ Test end-to-end flow

Done! 🚀
