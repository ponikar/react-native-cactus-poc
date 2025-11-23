import ExpoModulesCore
import PDFKit

public class ExpoPDFDocument: SharedObject {
  private var pdfDocument: PDFKit.PDFDocument?
  
  func setPDFDocument(_ document: PDFKit.PDFDocument) {
    self.pdfDocument = document
  }
  
  func loadPage(_ pageNumber: Int) -> String? {
    guard let document = self.pdfDocument else {
      return nil
    }
    
    guard pageNumber > 0 && pageNumber <= document.pageCount else {
      return nil
    }
    
    guard let page = document.page(at: pageNumber - 1) else {
      return nil
    }
    
    return page.string
  }
  
  func getPageCount() -> Int {
    return self.pdfDocument?.pageCount ?? 0
  }
}

public class ExpoPdfParserModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ExpoPdfParser")
    
    Class(ExpoPDFDocument.self) {
      Constructor { () -> ExpoPDFDocument in
        return ExpoPDFDocument()
      }
      
      Function("loadPage") { (instance: ExpoPDFDocument, pageNumber: Int) -> String? in
        return instance.loadPage(pageNumber)
      }
      
      Function("getPageCount") { (instance: ExpoPDFDocument) -> Int in
        return instance.getPageCount()
      }
    }
    
    AsyncFunction("loadPDF") { (fileUri: String) -> ExpoPDFDocument? in
      var url: URL?
      
      if fileUri.hasPrefix("file://") {
        url = URL(string: fileUri)
      } else {
        url = URL(fileURLWithPath: fileUri)
      }
      
      guard let fileUrl = url,
            let document = PDFKit.PDFDocument(url: fileUrl) else {
        return nil
      }
      
      let pdfDoc = ExpoPDFDocument()
      pdfDoc.setPDFDocument(document)
      return pdfDoc
    }
  }
}
