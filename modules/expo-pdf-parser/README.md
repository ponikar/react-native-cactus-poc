# Expo PDF Parser Module

A native Swift module for parsing PDF files in Expo apps on iOS.

## Features

- Load PDF files from local file paths
- Extract text content from PDF pages
- Get page count
- Minimal, efficient implementation using PDFKit

## API

### `loadPDF(fileUri: string): Promise<PDFDocument | null>`

Loads a PDF file from the given file URI and returns a PDFDocument instance.

**Parameters:**
- `fileUri`: File URI from expo-document-picker (e.g., `file:///path/to/file.pdf`) or absolute file path

**Returns:**
- `PDFDocument` instance if successful
- `null` if the PDF could not be loaded

**Example:**
```typescript
import { loadPDF } from './modules/expo-pdf-parser';
import * as DocumentPicker from 'expo-document-picker';

const result = await DocumentPicker.getDocumentAsync({
  type: 'application/pdf',
});

if (!result.canceled) {
  const pdf = await loadPDF(result.assets[0].uri);
  if (pdf) {
    console.log('PDF loaded successfully');
  }
}
```

### `PDFDocument` Class

#### `loadPage(pageNumber: number): string | null`

Extracts text content from a specific page.

**Parameters:**
- `pageNumber`: Page number (1-indexed)

**Returns:**
- Text content of the page as a string
- `null` if the page doesn't exist or has no text

**Example:**
```typescript
const pageText = pdf.loadPage(1);
console.log('Page 1 text:', pageText);
```

#### `getPageCount(): number`

Returns the total number of pages in the PDF.

**Returns:**
- Number of pages in the PDF

**Example:**
```typescript
const totalPages = pdf.getPageCount();
console.log('Total pages:', totalPages);
```

## Complete Usage Example

```typescript
import { loadPDF } from './modules/expo-pdf-parser';
import * as DocumentPicker from 'expo-document-picker';

async function extractPDFText() {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/pdf',
    copyToCacheDirectory: true,
  });
  
  if (result.canceled) {
    return null;
  }
  
  const pdf = await loadPDF(result.assets[0].uri);
  
  if (!pdf) {
    throw new Error('Failed to load PDF');
  }
  
  const pageCount = pdf.getPageCount();
  let fullText = '';
  
  for (let i = 1; i <= pageCount; i++) {
    const pageText = pdf.loadPage(i);
    if (pageText) {
      fullText += pageText + '\n';
    }
  }
  
  return {
    text: fullText.trim(),
    numPages: pageCount,
  };
}
```

## Using with Utility Functions

The `utils/pdfUtils.ts` file provides higher-level functions:

```typescript
import { pickPDFFile, parsePDF } from './utils/pdfUtils';

const file = await pickPDFFile();
if (file) {
  const result = await parsePDF(file.uri);
  console.log('Extracted text:', result.text);
  console.log('Number of pages:', result.numPages);
}
```

## Platform Support

- ✅ iOS (native Swift implementation using PDFKit)
- ✅ Android (native Kotlin implementation using PdfBox-Android)
- ❌ Web (not supported)

## Implementation Details

### iOS
- Uses Swift's native PDFKit framework
- No external dependencies required
- Implements SharedObject pattern for object-oriented API

### Android
- Uses PdfBox-Android library (Apache PDFBox port for Android)
- Automatically initializes PDFBox resources on module creation
- Implements SharedObject pattern matching iOS behavior

### Common Features
- Page numbers are 1-indexed (first page is 1, not 0)
- Returns `null` for invalid pages or failed operations
- Text extraction preserves the original PDF text layout
- Handles both `file://` URIs and absolute file paths
