import ExpoPdfParserModule, { PDFDocument } from './src/ExpoPdfParserModule';

export async function loadPDF(fileUri: string): Promise<PDFDocument | null> {
  return await ExpoPdfParserModule.loadPDF(fileUri);
}

export { PDFDocument };


