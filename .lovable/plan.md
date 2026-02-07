
## Two Expense Report Types with Compressed Images

### Overview

Create two distinct PDF report options:
1. **Itemized Expense Report** - Text-only expense table (no images)
2. **Detailed Expense Report** - Includes compressed receipt images

Both reports will use the existing `compressImage` helper to ensure file sizes stay under 500KB.

---

### Changes to `src/pages/Reports.tsx`

#### 1. Add Two Download Buttons

Replace the single "Download PDF" button with two buttons:
- "Itemized Report" (no images, smaller file)
- "Detailed Report" (with receipt images)

```text
[Download Itemized Report]  [Download Detailed Report]
```

#### 2. Refactor `generatePDF` Function

Split into two functions or add a parameter to control behavior:

| Function | Title | Includes Receipts |
|----------|-------|-------------------|
| `generateItemizedPDF()` | "Itemized Expense Report" | No |
| `generateDetailedPDF()` | "Detailed Expense Report" | Yes (compressed) |

#### 3. Compress Receipt Images

Apply the existing `compressImage` helper to receipt images before embedding:

```typescript
// Current code (uncompressed - causes large files):
pdf.addImage(receiptDataUrl, imageFormat, xPos, yPos, receiptWidth, receiptHeight);

// Updated code (compressed):
const compressedReceipt = await compressImage(receiptDataUrl, 800, 0.7);
pdf.addImage(compressedReceipt, "JPEG", xPos, yPos, receiptWidth, receiptHeight);
```

**Compression settings for receipts:**
- Max width: 800px (sufficient for readability in PDF)
- JPEG quality: 0.7 (good balance of quality vs size)
- Always output as JPEG format for consistent compression

---

### UI Updates

#### Download Buttons Section

```text
┌────────────────────────────────────────────────────────┐
│  Expense Reports                                        │
│  Generate detailed expense reports for your trips       │
│                                                        │
│  [📄 Itemized Report]  [📷 Detailed Report]            │
└────────────────────────────────────────────────────────┘
```

- **Itemized Report**: Downloads quickly, very small file (~50-100KB)
- **Detailed Report**: Takes longer (fetching/compressing images), but still under 500KB

---

### File Size Expectations

| Report Type | Logo | Receipts | Expected Size |
|-------------|------|----------|---------------|
| Itemized | Compressed (200px, 0.7) | None | ~50-100KB |
| Detailed | Compressed (200px, 0.7) | Compressed (800px, 0.7) | ~200-500KB |

---

### Technical Implementation

**File**: `src/pages/Reports.tsx`

1. Create `generatePDF(includeReceipts: boolean)` function with parameter
2. Update title based on `includeReceipts`:
   - `false` → "Itemized Expense Report"
   - `true` → "Detailed Expense Report"
3. Conditionally include receipt images section only when `includeReceipts` is true
4. Apply `compressImage(receiptDataUrl, 800, 0.7)` to all receipt images
5. Update file naming:
   - `{TripName}_Itemized_Expense_Report.pdf`
   - `{TripName}_Detailed_Expense_Report.pdf`
6. Add two buttons in the UI that call the appropriate function

---

### Summary

| Feature | Itemized Report | Detailed Report |
|---------|-----------------|-----------------|
| Expense table | ✓ | ✓ |
| Descriptions (wrapped) | ✓ | ✓ |
| Company logo | ✓ (compressed) | ✓ (compressed) |
| Receipt images | ✗ | ✓ (compressed) |
| Expected file size | ~50-100KB | ~200-500KB |
