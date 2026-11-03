/**
 * Formats AI-generated summary JSON objects into human-readable strings
 * suitable for clipboard, TXT, or PDF/Word exports.
 */

export function formatSummaryToText(content: any, type: string): string {
  if (!content) return "";
  
  // Handle string content (either already formatted or CUSTOM type)
  if (typeof content === "string") {
    // Try to parse it if it looks like JSON
    try {
      if (content.trim().startsWith("{") || content.trim().startsWith("[")) {
        const parsed = JSON.parse(content);
        return formatSummaryToText(parsed, type);
      }
    } catch (e) {
      // Not JSON, return as is
    }
    return content;
  }

  // Handle parsed JSON objects based on their type
  switch (type) {
    case "EXECUTIVE_SUMMARY":
      return formatExecutiveSummary(content);
    case "ACTION_ITEMS":
      return formatActionItems(content);
    case "KEY_DECISIONS":
      return formatKeyDecisions(content);
    case "MEETING_NOTES":
      return formatMeetingNotes(content);
    default:
      // Fallback for custom or unknown types
      if (content.raw) return String(content.raw);
      return typeof content === "object" ? JSON.stringify(content, null, 2) : String(content);
  }
}

function formatExecutiveSummary(content: any): string {
  if (content.raw) return String(content.raw);
  let text = "EXECUTIVE SUMMARY\n";
  text += "=================\n\n";
  
  if (content.overview) {
    text += `OVERVIEW:\n${content.overview}\n\n`;
  }
  
  if (content.keyTakeaways && Array.isArray(content.keyTakeaways) && content.keyTakeaways.length > 0) {
    text += "KEY TAKEAWAYS:\n";
    content.keyTakeaways.forEach((t: string) => {
      text += `• ${t}\n`;
    });
    text += "\n";
  }
  
  if (content.nextSteps && Array.isArray(content.nextSteps) && content.nextSteps.length > 0) {
    text += "NEXT STEPS:\n";
    content.nextSteps.forEach((s: string) => {
      text += `• ${s}\n`;
    });
    text += "\n";
  }
  
  return text.trim();
}

function formatActionItems(content: any): string {
  if (content.raw) return String(content.raw);
  let text = "ACTION ITEMS\n";
  text += "============\n\n";
  
  const items = Array.isArray(content) ? content : (content.items || []);
  
  if (items.length === 0) return text + "No action items identified.";
  
  items.forEach((item: any) => {
    const task = item.task || "Untitled Task";
    const assignee = item.assignee ? ` [Assignee: ${item.assignee}]` : "";
    const deadline = item.deadline ? ` [Due: ${item.deadline}]` : "";
    text += `[ ] ${task}${assignee}${deadline}\n`;
  });
  
  return text.trim();
}

function formatKeyDecisions(content: any): string {
  if (content.raw) return String(content.raw);
  let text = "KEY DECISIONS\n";
  text += "=============\n\n";
  
  const decisions = Array.isArray(content) ? content : (content.decisions || []);
  
  if (decisions.length === 0) return text + "No key decisions identified.";
  
  decisions.forEach((item: any) => {
    text += `DECISION: ${item.decision || "N/A"}\n`;
    if (item.proposedBy) text += `Proposed by: ${item.proposedBy}\n`;
    if (item.rationale) text += `Rationale: ${item.rationale}\n`;
    if (item.impact) text += `Impact: ${item.impact}\n`;
    text += "\n";
  });
  
  return text.trim();
}

function formatMeetingNotes(content: any): string {
  if (content.raw) return String(content.raw);
  let text = `${content.title || "MEETING NOTES"}\n`;
  text += "=".repeat((content.title || "MEETING NOTES").length) + "\n\n";
  
  if (content.date) text += `Date: ${content.date}\n`;
  
  if (content.attendees && Array.isArray(content.attendees) && content.attendees.length > 0) {
    text += `ATTENDEES: ${content.attendees.join(", ")}\n`;
  }
  
  text += "\n";
  
  if (content.topics && Array.isArray(content.topics) && content.topics.length > 0) {
    text += "DISCUSSION TOPICS:\n";
    content.topics.forEach((t: any) => {
      text += `\n${t.topic?.toUpperCase() || "UNTITLED TOPIC"}\n`;
      if (t.discussionPoints && Array.isArray(t.discussionPoints)) {
        t.discussionPoints.forEach((p: string) => {
          text += `- ${p}\n`;
        });
      }
    });
  }
  
  return text.trim();
}
