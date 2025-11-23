import * as DocumentPicker from 'expo-document-picker';
import { loadPDF } from '../modules/expo-pdf-parser';

export interface PDFPickResult {
  uri: string;
  name: string;
  size: number;
  mimeType: string;
}

export async function pickPDFFile(): Promise<PDFPickResult | null> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (result.canceled) {
      return null;
    }

    const file = result.assets[0];
    return {
      uri: file.uri,
      name: file.name,
      size: file.size ?? 0,
      mimeType: file.mimeType || 'application/pdf',
    };
  } catch (error) {
    console.error('Error picking PDF file:', error);
    throw error;
  }
}

export interface PDFParseResult {
  text: string;
  numPages?: number;
  metadata?: Record<string, any>;
}

export async function parsePDF(fileUri: string): Promise<PDFParseResult> {
  try {
    const pdf = await loadPDF(fileUri);
    
    if (!pdf) {
      throw new Error('Failed to load PDF file');
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
  } catch (error) {
    console.error('Error parsing PDF:', error);
    throw error;
  }
}

