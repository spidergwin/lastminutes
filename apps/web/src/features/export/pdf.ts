import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { Transcript, Summary } from "@prisma/client";
import { formatSummaryToText } from "../summarization/formatter";

export async function exportAsPdf(transcript: Transcript, summaries?: Summary[]): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const timesRomanBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

  let page = pdfDoc.addPage();
  const { width, height } = page.getSize();
  let y = height - 50;
  const margin = 50;
  const maxWidth = width - 2 * margin;

  const drawText = (text: string, font: any, size: number, color = rgb(0, 0, 0)) => {
    // Very simple text wrapping
    const words = text.split(' ');
    let line = '';
    
    for (const word of words) {
      const testLine = line + word + ' ';
      const textWidth = font.widthOfTextAtSize(testLine, size);
      
      if (textWidth > maxWidth && line !== '') {
        page.drawText(line, { x: margin, y, size, font, color });
        y -= size + 5;
        line = word + ' ';
        
        // Add new page if we run out of space
        if (y < margin) {
          page = pdfDoc.addPage();
          y = height - 50;
        }
      } else {
        line = testLine;
      }
    }
    
    if (line.trim()) {
      page.drawText(line, { x: margin, y, size, font, color });
      y -= size + 10;
    } else if (text === "") {
        y -= size; // Handle empty lines
    }
  };

  // Title
  drawText(transcript.title, timesRomanBoldFont, 24);
  y -= 10;

  // Metadata
  drawText(`Date: ${transcript.createdAt.toDateString()}`, timesRomanFont, 12);
  drawText(`Duration: ${Math.round((transcript.duration || 0) / 60)} minutes`, timesRomanFont, 12);
  drawText(`Word Count: ${transcript.wordCount || 0}`, timesRomanFont, 12);
  y -= 20;

  // Summaries
  if (summaries && summaries.length > 0) {
    drawText('AI Summaries & Insights', timesRomanBoldFont, 18);
    y -= 10;
    
    for (const s of summaries) {
      const formattedText = formatSummaryToText(s.metadata || s.content, s.type);
      const lines = formattedText.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (i === 0 && line.toUpperCase() === line && line.includes('SUMMARY')) {
           drawText(line, timesRomanBoldFont, 14);
        } else if (line.trim()) {
          drawText(line, timesRomanFont, 12);
        } else if (line === "") {
            y -= 5;
        }
      }
      y -= 15;
      
      // Draw a divider
      page.drawLine({
          start: { x: margin, y: y + 10 },
          end: { x: width - margin, y: y + 10 },
          thickness: 0.5,
          color: rgb(0.8, 0.8, 0.8)
      });
    }
  }

  // Transcript
  drawText('Transcript', timesRomanBoldFont, 18);
  y -= 5;

  const segments = (transcript as any).segments;
  if (segments && Array.isArray(segments) && segments.length > 0) {
    for (const seg of segments) {
      const speakerPrefix = seg.speaker ? `Speaker ${seg.speaker}: ` : "";
      if (speakerPrefix) {
        drawText(speakerPrefix, timesRomanBoldFont, 12, rgb(0, 0.3, 0.6));
      }
      drawText(seg.text, timesRomanFont, 12);
    }
  } else {
    const lines = transcript.originalText.split('\n');
    for (const line of lines) {
      if (line.trim()) {
        drawText(line.trim(), timesRomanFont, 12);
      }
    }
  }

  return await pdfDoc.save();
}
