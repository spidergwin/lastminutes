import { Transcript, Summary } from "@prisma/client";
import { exportAsTxt } from "./txt";
import { exportAsSrt } from "./srt";
import { exportAsVtt } from "./vtt";
import { exportAsJson } from "./json";
import { exportAsDocx } from "./docx";
import { exportAsPdf } from "./pdf";

export type ExportFormat = "txt" | "srt" | "vtt" | "json" | "docx" | "pdf";

export async function generateExport(
  format: ExportFormat,
  transcript: Transcript,
  summaries?: Summary[]
): Promise<{ data: string | Buffer | Uint8Array; mimeType: string; extension: string }> {
  switch (format) {
    case "txt":
      return {
        data: exportAsTxt(transcript, summaries),
        mimeType: "text/plain; charset=utf-8",
        extension: "txt"
      };
    case "srt":
      return {
        data: exportAsSrt(transcript),
        mimeType: "text/srt; charset=utf-8",
        extension: "srt"
      };
    case "vtt":
      return {
        data: exportAsVtt(transcript),
        mimeType: "text/vtt; charset=utf-8",
        extension: "vtt"
      };
    case "json":
      return {
        data: exportAsJson(transcript, summaries),
        mimeType: "application/json; charset=utf-8",
        extension: "json"
      };
    case "docx":
      return {
        data: await exportAsDocx(transcript, summaries),
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        extension: "docx"
      };
    case "pdf":
      return {
        data: await exportAsPdf(transcript, summaries),
        mimeType: "application/pdf",
        extension: "pdf"
      };
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}
