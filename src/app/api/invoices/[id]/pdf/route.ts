import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getCurrentProfile } from "@/lib/data/profile";
import { getInvoicePdfData } from "@/lib/pdf/build-invoice-pdf-data";
import { InvoiceDocument } from "@/lib/pdf/invoice-document";
import { DateTime } from "luxon";

// renderToBuffer + the logo file read need Node APIs, not the Edge runtime.
export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const profile = await getCurrentProfile();
  if (profile.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const data = await getInvoicePdfData(id);
  if (!data) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const buffer = await renderToBuffer(InvoiceDocument({ data }));

  const primaryName = data.siblings[0]?.studentName.replace(/[^a-z0-9]+/gi, "-") ?? "Student";
  const monthYear = DateTime.fromISO(data.periodStart).toFormat("MMM-yyyy");
  const filename = `Invoice-${primaryName}-${monthYear}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
}
