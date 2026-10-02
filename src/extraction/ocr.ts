import { fromPath } from "pdf2pic";
import { createWorker } from "tesseract.js";
import { withTimeout } from "../shared/withTimeout.js";

// OCR on a multi-page scan can be slow, so give it a generous timeout
// rather than letting a stuck job hang forever.
const DEFAULT_OCR_TIMEOUT_MS = 120_000;

/**
 * Turns a scanned PDF into plain text: rasterizes every page to an image,
 * then runs OCR on each page image and joins the results together.
 *
 * Requires GraphicsMagick or ImageMagick (plus Ghostscript) installed on
 * the machine, since pdf2pic shells out to them to render pages.
 */
export async function ocrPdf(filePath: string, timeoutMs = DEFAULT_OCR_TIMEOUT_MS): Promise<string> {
  return withTimeout(runOcr(filePath), timeoutMs, `OCR timed out after ${timeoutMs}ms`);
}

async function runOcr(filePath: string): Promise<string> {
  const convertPdfToImages = fromPath(filePath, {
    density: 200, // dots per inch - more detail for OCR to work with
    format: "png",
    width: 1654,
    height: 2339,
  });

  // -1 means "convert every page", not just one.
  const pages = await convertPdfToImages.bulk(-1, { responseType: "buffer" });

  const worker = await createWorker("eng");
  const pageTexts: string[] = [];

  for (const page of pages) {
    if (!page.buffer) {
      continue; // skip a page pdf2pic couldn't render
    }
    const { data } = await worker.recognize(page.buffer);
    pageTexts.push(data.text);
  }

  await worker.terminate();

  return pageTexts.join("\n\n");
}
