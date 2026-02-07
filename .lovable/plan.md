
## Fix PDF Expense Report Issues

### Problem Analysis

1. **Column Cutoff**: "Business Card" shows as "Business Car" because payment method is truncated to 12 characters (line 219)

2. **Logo Too Large**: Currently 40x30mm positioned above the title

3. **125MB File Size**: The company logo is embedded at its original full resolution. Even though it displays at 40x30mm, if the source image is 5000x5000 pixels, all those pixels are embedded as base64 in the PDF. jsPDF does not automatically resize source images.

---

### Solution

#### 1. Fix Column Layout
- Increase payment method character limit from 12 to 15 characters
- Adjust column X positions for better spacing:

| Column | Old X | New X |
|--------|-------|-------|
| Date | 15 | 15 |
| Merchant | 45 | 40 |
| Category | 95 | 85 |
| Payment | 130 | 120 |
| Amount | 170 | 165 |

#### 2. Smaller Logo, Inline with Title
- Reduce logo max size from 40x30mm to 15x12mm
- Position logo at left (x=15, y=20)
- Position title to the right of logo on same line

**New layout**:
```text
[small logo] Detailed Expense Report
```

#### 3. Compress Logo Before Embedding
Add a `compressImage` helper function that:
- Uses HTML Canvas to resize the image
- Limits maximum width to 200 pixels (plenty for a small PDF logo)
- Converts to JPEG at 0.7 quality
- Dramatically reduces file size (from megabytes to kilobytes)

```typescript
const compressImage = (dataUrl: string, maxWidth: number, quality: number): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.src = dataUrl;
  });
};
```

---

### Files Changed

**`src/pages/Reports.tsx`**:
- Add `compressImage` helper function
- Compress logo to max 200px width at 0.7 quality before adding to PDF
- Reduce logo display size to 15x12mm
- Position logo inline with title on the same Y position
- Adjust column X positions for better spacing
- Increase payment method truncation from 12 to 15 characters

---

### Expected Results

| Issue | Before | After |
|-------|--------|-------|
| Payment column | "Business Car" | "Business Card" |
| Logo size | 40x30mm, above title | 15x12mm, inline with title |
| File size | ~125MB | Under 100KB |
