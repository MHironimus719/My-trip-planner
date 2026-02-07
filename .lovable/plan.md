

## Fix Receipt Image Storage for Detailed Reports

### Problem Identified

The AI Expense Assistant currently:
1. Accepts receipt images from users
2. Sends images to the AI for text extraction (merchant, amount, date, etc.)
3. **Discards the images after extraction** - they are never saved

The `receipt_url` column exists in the database but is never populated because the images aren't being uploaded to storage.

### Solution Overview

Create a storage bucket for receipts and modify the expense creation flow to:
1. Upload receipt images to storage when the expense is saved
2. Store the resulting URL in the `receipt_url` field

---

### Implementation Steps

#### 1. Create Storage Bucket

Create a new `expense-receipts` storage bucket with appropriate RLS policies:
- Users can upload receipts to their own folder
- Users can view their own receipts
- Users can delete their own receipts

#### 2. Modify ExpenseAssistant Component

Instead of clearing images after extraction, pass them to the parent form:
- Add an `onImagesReady` callback prop
- Keep images in state after extraction so they can be uploaded when the expense is saved

#### 3. Modify ExpenseForm Component

Add receipt image handling:
- Track pending receipt images in state
- When submitting the expense:
  1. Upload images to `expense-receipts/{user_id}/{expense_id}/` 
  2. Get the public/signed URL
  3. Save the URL in the `receipt_url` field with the expense

---

### Technical Details

#### Storage Bucket Structure

```text
expense-receipts/
  └── {user_id}/
      └── {expense_id}/
          └── receipt.jpg
```

#### Component Changes

**ExpenseAssistant.tsx**:
```typescript
interface ExpenseAssistantProps {
  onDataExtracted: (data: any) => void;
  onImagesReady?: (images: string[]) => void;  // NEW
}

// After extraction, pass images to parent instead of clearing
onImagesReady?.(images);
```

**ExpenseForm.tsx**:
```typescript
const [pendingImages, setPendingImages] = useState<string[]>([]);

const handleSubmit = async () => {
  // 1. Create expense first to get expense_id
  // 2. If pendingImages exist, upload to storage
  // 3. Update expense with receipt_url
};
```

#### Image Upload Flow

```text
1. User uploads receipt image
2. AI extracts expense details
3. User reviews and clicks "Save Expense"
4. System:
   a. Creates expense record (gets expense_id)
   b. Compresses image for storage
   c. Uploads to expense-receipts/{user_id}/{expense_id}/receipt.jpg
   d. Updates expense with receipt_url
```

---

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/ExpenseAssistant.tsx` | Add `onImagesReady` callback, don't clear images after extraction |
| `src/pages/ExpenseForm.tsx` | Track pending images, upload on save, store URL |

### Database Changes

| Change | Details |
|--------|---------|
| Create storage bucket | `expense-receipts` with user-scoped RLS |

---

### Summary

This fix ensures receipt images uploaded during expense creation are:
1. Preserved after AI extraction
2. Uploaded to secure storage when the expense is saved
3. Linked to the expense via `receipt_url` field
4. Available for the Detailed Expense Report PDF

