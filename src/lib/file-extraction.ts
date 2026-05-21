type MammothModule = {
  extractRawText(input: { arrayBuffer: ArrayBuffer }): Promise<{ value: string; messages: unknown[] }>;
  convertToHtml?(input: { arrayBuffer: ArrayBuffer }): Promise<{ value: string; messages: unknown[] }>;
};

type PdfPageTextItem = {
  str?: string;
};

type PdfModule = {
  GlobalWorkerOptions?: {
    workerSrc?: string;
  };
  getDocument(input: {
    data: Uint8Array;
    disableWorker?: boolean;
    disableFontFace?: boolean;
    isEvalSupported?: boolean;
  }): {
    promise: Promise<{
      numPages: number;
      getPage(pageNumber: number): Promise<{
        getTextContent(): Promise<{ items: PdfPageTextItem[] }>;
        getAnnotations?: (params?: unknown) => Promise<unknown[]>;
      }>;
    }>;
  };
};

export type ExtractedResume = {
  text: string;
  links: string[];
};

export async function extractResumePayload(file: File): Promise<ExtractedResume> {
  const name = file.name.toLowerCase();
  const extension = name.split(".").pop() ?? "";

  if (["txt", "md", "csv", "rtf"].includes(extension) || file.type.startsWith("text/")) {
    return { text: await file.text(), links: [] };
  }

  if (extension === "pdf" || file.type === "application/pdf") {
    return extractPdf(file);
  }

  if (extension === "docx" || file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    return extractDocx(file);
  }

  if (extension === "doc" || file.type === "application/msword") {
    throw new Error("Legacy .doc files are not reliably parseable in-browser. Save/export the resume as .docx or PDF, then upload it again.");
  }

  throw new Error("Unsupported file type. Upload PDF, DOCX, TXT, MD, RTF, or paste the resume text.");
}

export async function extractResumeText(file: File) {
  const payload = await extractResumePayload(file);
  return payload.text;
}

async function extractPdf(file: File) {
  const pdfjs = (await import("pdfjs-dist/legacy/build/pdf.mjs")) as PdfModule;
  // pdfjs-dist requires a worker entrypoint in many builds; configuring it prevents runtime errors like:
  // "No GlobalWorkerOptions.workerSrc specified."
  if (pdfjs.GlobalWorkerOptions) {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
      import.meta.url,
    ).toString();
  }
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({
    data: new Uint8Array(arrayBuffer),
    disableFontFace: true,
    isEvalSupported: false,
  }).promise;

  const pages: string[] = [];
  const links: string[] = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const items = content.items as any[];
    
    // Layout-aware extraction: group and sort by Y (top to bottom) then X (left to right)
    // PDF origin (0,0) is bottom-left, so higher Y is higher on page.
    items.sort((a, b) => {
      // Bin Y coordinates to 5 points to group items on the same line
      const yA = Math.round((a.transform?.[5] || 0) / 5) * 5;
      const yB = Math.round((b.transform?.[5] || 0) / 5) * 5;
      if (yA !== yB) return yB - yA; // top to bottom
      return (a.transform?.[4] || 0) - (b.transform?.[4] || 0); // left to right
    });

    let pageText = "";
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const next = items[i + 1];
      const yItem = Math.round((item.transform?.[5] || 0) / 5) * 5;
      const yNext = next ? Math.round((next.transform?.[5] || 0) / 5) * 5 : null;
      const eol = yItem !== yNext || item.hasEOL ? "\n" : " ";
      pageText += (item.str || "") + eol;
    }
    pages.push(pageText);
    if (page.getAnnotations) {
      const annotations = await page.getAnnotations({ intent: "display" });
      links.push(...extractPdfLinks(annotations));
    }
  }

  const text = pages.join("\n\n").trim();
  if (!text) {
    throw new Error("This PDF did not expose selectable text. It may be scanned; paste OCR text or export a text-based PDF.");
  }
  return { text, links: uniqueLinks(links) };
}

async function extractDocx(file: File) {
  const mammoth = (await import("mammoth/mammoth.browser")) as MammothModule;
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  const text = result.value.trim();
  if (!text) {
    throw new Error("This DOCX did not expose readable text. Try exporting it again or paste the resume text.");
  }
  const links = mammoth.convertToHtml ? await extractDocxLinks(mammoth, arrayBuffer) : [];
  return { text, links: uniqueLinks(links) };
}

async function extractDocxLinks(mammoth: MammothModule, arrayBuffer: ArrayBuffer) {
  try {
    const html = (await mammoth.convertToHtml?.({ arrayBuffer }))?.value ?? "";
    if (!html) return [];
    if (typeof DOMParser !== "undefined") {
      const doc = new DOMParser().parseFromString(html, "text/html");
      return Array.from(doc.querySelectorAll("a[href]"))
        .map((a) => (a as HTMLAnchorElement).getAttribute("href") ?? "")
        .filter(Boolean);
    }
    const matches = Array.from(html.matchAll(/href="([^"]+)"/g));
    return matches.map((match) => match[1]).filter(Boolean);
  } catch {
    return [];
  }
}

function extractPdfLinks(annotations: unknown[]) {
  const links: string[] = [];
  for (const annotation of annotations) {
    if (!annotation || typeof annotation !== "object") continue;
    const anyAnn = annotation as Record<string, unknown>;
    const candidates: unknown[] = [
      anyAnn.url,
      anyAnn.unsafeUrl,
      anyAnn.URI,
      (anyAnn.action as Record<string, unknown> | undefined)?.URI,
      (anyAnn.action as Record<string, unknown> | undefined)?.url,
    ];
    for (const candidate of candidates) {
      if (typeof candidate === "string" && looksLikeUrl(candidate)) links.push(candidate);
    }
    // Some builds place the URL as a string somewhere shallow on the annotation.
    for (const value of Object.values(anyAnn)) {
      if (typeof value === "string" && looksLikeUrl(value)) links.push(value);
    }
  }
  return links;
}

function looksLikeUrl(value: string) {
  const v = value.trim();
  return (
    /^https?:\/\//i.test(v) ||
    /^www\./i.test(v) ||
    /^mailto:/i.test(v) ||
    /\blinkedin\.com\b/i.test(v) ||
    /\bgithub\.com\b/i.test(v)
  );
}

function uniqueLinks(values: string[]) {
  const seen = new Set<string>();
  return values
    .map((value) => value.replace(/[)\].,;:]+$/, "").trim())
    .filter(Boolean)
    .filter((value) => {
      const key = value
        .replace(/^mailto:/i, "")
        .replace(/^https?:\/\//i, "")
        .replace(/^www\./i, "")
        .replace(/\/$/, "")
        .toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}
