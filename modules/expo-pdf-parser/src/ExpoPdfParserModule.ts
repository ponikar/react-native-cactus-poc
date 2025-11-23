import { NativeModule, requireNativeModule } from 'expo';

export class PDFDocument {
  loadPage(pageNumber: number): string | null {
    throw new Error('Method not implemented');
  }
  
  getPageCount(): number {
    throw new Error('Method not implemented');
  }
}

declare class ExpoPdfParserModule extends NativeModule {
  loadPDF(fileUri: string): Promise<PDFDocument | null>;
}

export default requireNativeModule<ExpoPdfParserModule>('ExpoPdfParser');
