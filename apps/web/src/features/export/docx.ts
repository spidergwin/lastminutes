import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import { Transcript, Summary } from "@prisma/client";
import { formatSummaryToText } from "../summarization/formatter";

export async function exportAsDocx(transcript: Transcript, summaries?: Summary[]): Promise<Buffer> {
  const children: any[] = [
    new Paragraph({
      text: transcript.title,
      heading: HeadingLevel.HEADING_1,
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `Date: ${transcript.createdAt.toDateString()}`, bold: true }),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `Duration: ${Math.round((transcript.duration || 0) / 60)} minutes`, bold: true }),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `Word Count: ${transcript.wordCount || 0}`, bold: true }),
      ],
    }),
    new Paragraph({ text: "" }), // Spacing
  ];

  if (summaries && summaries.length > 0) {
    children.push(
      new Paragraph({
        text: "AI Summaries & Insights",
        heading: HeadingLevel.HEADING_2,
      })
    );

    summaries.forEach((s) => {
      const formattedText = formatSummaryToText(s.metadata || s.content, s.type);
      const lines = formattedText.split('\n');
      
      lines.forEach((line, index) => {
        if (index === 0 && line.toUpperCase() === line && line.includes('SUMMARY')) {
          // It's the title line from formatter
           children.push(
            new Paragraph({
              text: line,
              heading: HeadingLevel.HEADING_3,
            })
          );
        } else if (line.trim()) {
          children.push(new Paragraph({ text: line }));
        } else if (line === "") {
          children.push(new Paragraph({ text: "" }));
        }
      });
      
      children.push(new Paragraph({ text: "---", alignment: "center" }));
      children.push(new Paragraph({ text: "" }));
    });
  }

  children.push(
    new Paragraph({
      text: "Transcript",
      heading: HeadingLevel.HEADING_2,
    })
  );

  const segments = (transcript as any).segments;
  if (segments && Array.isArray(segments) && segments.length > 0) {
    segments.forEach((seg) => {
      const speakerPrefix = seg.speaker ? `Speaker ${seg.speaker}: ` : "";
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: speakerPrefix, bold: true, color: "005599" }),
            new TextRun({ text: seg.text }),
          ],
        })
      );
    });
  } else {
    // Fallback if no segments
    const lines = transcript.originalText.split('\n');
    lines.forEach(line => {
      if (line.trim()) children.push(new Paragraph({ text: line }));
    });
  }

  if (transcript.translatedText) {
    children.push(new Paragraph({ text: "" }));
    children.push(
      new Paragraph({
        text: `Translation (${transcript.targetLanguage})`,
        heading: HeadingLevel.HEADING_2,
      })
    );
    const tLines = transcript.translatedText.split('\n');
    tLines.forEach(line => {
      if (line.trim()) children.push(new Paragraph({ text: line }));
    });
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: children,
      },
    ],
  });

  return await Packer.toBuffer(doc);
}
