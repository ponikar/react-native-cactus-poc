package expo.modules.pdfparser

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.sharedobjects.SharedObject
import com.tom_roush.pdfbox.android.PDFBoxResourceLoader
import com.tom_roush.pdfbox.pdmodel.PDDocument
import com.tom_roush.pdfbox.text.PDFTextStripper
import java.io.File
import java.net.URI

class ExpoPDFDocument : SharedObject() {
  private var pdfDocument: PDDocument? = null
  
  fun setPDFDocument(document: PDDocument) {
    this.pdfDocument = document
  }
  
  fun loadPage(pageNumber: Int): String? {
    val document = pdfDocument ?: return null
    
    if (pageNumber <= 0 || pageNumber > document.numberOfPages) {
      return null
    }
    
    return try {
      val stripper = PDFTextStripper()
      stripper.startPage = pageNumber
      stripper.endPage = pageNumber
      stripper.getText(document)
    } catch (e: Exception) {
      null
    }
  }
  
  fun getPageCount(): Int {
    return pdfDocument?.numberOfPages ?: 0
  }
  
  fun close() {
    pdfDocument?.close()
    pdfDocument = null
  }
}

class ExpoPdfParserModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ExpoPdfParser")
    
    OnCreate {
      PDFBoxResourceLoader.init(appContext.reactContext)
    }
    
    Class(ExpoPDFDocument::class) {
      Constructor {
        ExpoPDFDocument()
      }
      
      Function("loadPage") { instance: ExpoPDFDocument, pageNumber: Int ->
        instance.loadPage(pageNumber)
      }
      
      Function("getPageCount") { instance: ExpoPDFDocument ->
        instance.getPageCount()
      }
    }
    
    AsyncFunction("loadPDF") { fileUri: String ->
      try {
        val uri = URI(fileUri)
        val file = File(uri.path)
        
        if (!file.exists()) {
          null
        } else {
          val document = PDDocument.load(file)
          val pdfDoc = ExpoPDFDocument()
          pdfDoc.setPDFDocument(document)
          pdfDoc
        }
      } catch (e: Exception) {
        null
      }
    }
  }
}
