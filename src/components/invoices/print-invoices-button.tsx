"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Triggers the browser's native print dialog, which the user can save as
 * PDF -- avoids pulling in a PDF-generation library for what's really just
 * a printable table.
 */
export function PrintInvoicesButton() {
  return (
    <Button type="button" variant="outline" onClick={() => window.print()}>
      <Printer className="h-4 w-4" /> Download PDF
    </Button>
  );
}
