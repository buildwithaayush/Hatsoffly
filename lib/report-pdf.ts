import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { ReportSummary } from "@/lib/reports";

export async function buildReportPdf(opts: {
  businessName: string;
  ownerEmail: string;
  cycleLabel: string;
  summary: ReportSummary;
}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]); // A4
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let y = 800;
  const left = 40;
  const line = (text: string, size = 11, weight: "normal" | "bold" = "normal", color = rgb(0.15, 0.17, 0.2)) => {
    page.drawText(text, {
      x: left,
      y,
      size,
      font: weight === "bold" ? bold : font,
      color,
    });
    y -= size + 6;
  };

  line("Hatsoffly Reports", 20, "bold");
  line(`${opts.businessName}  •  ${opts.cycleLabel}`, 12, "bold");
  line(`Owner: ${opts.ownerEmail}`);
  line(`Generated: ${new Date(opts.summary.generatedAt).toLocaleString()}`);
  y -= 8;
  line(`Sessions: ${opts.summary.totalSessions}`, 12, "bold");
  line(`Avg rating: ${opts.summary.avgRating ?? "—"}`);
  line(`Private feedback (<=3★): ${opts.summary.privateFeedbackCount}`);
  line(`Happy path (>=4★): ${opts.summary.happyCount}`);
  line(
    `Breakdown: 1★ ${opts.summary.starBreakdown["1"]} | 2★ ${opts.summary.starBreakdown["2"]} | 3★ ${opts.summary.starBreakdown["3"]} | 4★ ${opts.summary.starBreakdown["4"]} | 5★ ${opts.summary.starBreakdown["5"]}`,
  );

  y -= 10;
  line("Recent feedback", 13, "bold");
  for (const row of opts.summary.recentItems.slice(0, 18)) {
    const when = new Date(row.createdAt).toLocaleDateString();
    const msg = row.privateMessage?.trim()
      ? row.privateMessage.trim().replace(/\s+/g, " ").slice(0, 90)
      : "—";
    line(`${when}  •  ${row.rating}★  •  ${msg}`);
    if (y < 70) break;
  }

  return pdf.save();
}
