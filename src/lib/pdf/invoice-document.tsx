import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import { DateTime } from "luxon";
import fs from "fs";
import path from "path";

const logoBuffer = fs.readFileSync(path.join(process.cwd(), "public", "logo.png"));

export interface InvoicePdfSibling {
  studentName: string;
  amount: number;
}

export interface InvoicePdfData {
  isCombined: boolean;
  siblings: InvoicePdfSibling[];
  currency: string;
  totalAmount: number;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  status: string;
  invoiceNumber: string;
}

// Brand colors pulled from src/app/globals.css -- React-PDF can't read CSS
// custom properties, so the hexes are hardcoded here.
const NAVY = "#1a2f6e";
const NAVY_DARK = "#122259";
const GOLD = "#fd9c02";
const SLATE = "#475569";
const BORDER = "#e2e8f0";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, color: "#0f172a", fontFamily: "Helvetica" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 },
  logo: { width: 40, height: 40, marginBottom: 6 },
  academyName: { fontSize: 14, fontWeight: 700, color: NAVY },
  academyTag: { fontSize: 8, color: SLATE, marginTop: 2 },
  invoiceTitle: { fontSize: 18, fontWeight: 700, color: NAVY, textAlign: "right" },
  invoiceNumber: { fontSize: 9, color: SLATE, textAlign: "right", marginTop: 2 },
  statusBadge: {
    alignSelf: "flex-end",
    marginTop: 6,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 4,
    fontSize: 8,
    fontWeight: 700,
    textTransform: "uppercase",
    backgroundColor: GOLD,
    color: NAVY_DARK,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 2,
    borderTopColor: GOLD,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    paddingVertical: 10,
    marginBottom: 16,
  },
  metaLabel: { fontSize: 8, color: SLATE, textTransform: "uppercase", marginBottom: 2 },
  metaValue: { fontSize: 10, fontWeight: 700, color: "#0f172a" },
  table: { marginTop: 4 },
  tableHeadRow: { flexDirection: "row", backgroundColor: "#eef1f8", paddingVertical: 6, paddingHorizontal: 8 },
  tableHeadCell: { fontSize: 8, fontWeight: 700, color: NAVY, textTransform: "uppercase" },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  tableCell: { fontSize: 10 },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: NAVY,
    borderRadius: 4,
  },
  totalsLabel: { fontSize: 11, fontWeight: 700, color: "white" },
  totalsValue: { fontSize: 13, fontWeight: 700, color: GOLD },
  footer: { position: "absolute", bottom: 32, left: 40, right: 40, textAlign: "center" },
  footerText: { fontSize: 8, color: SLATE },
});

function formatDate(iso: string) {
  return DateTime.fromISO(iso).toFormat("d LLLL yyyy");
}

export function InvoiceDocument({ data }: { data: InvoicePdfData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- React-PDF's Image has no alt prop */}
            <Image style={styles.logo} src={logoBuffer} />
            <Text style={styles.academyName}>Ease Quran</Text>
            <Text style={styles.academyTag}>Ease Quran Online Academy</Text>
          </View>
          <View>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={styles.invoiceNumber}>{data.invoiceNumber}</Text>
            <Text style={styles.statusBadge}>{data.status}</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <View>
            <Text style={styles.metaLabel}>Billing period</Text>
            <Text style={styles.metaValue}>
              {formatDate(data.periodStart)} - {formatDate(data.periodEnd)}
            </Text>
          </View>
          <View>
            <Text style={styles.metaLabel}>Due date</Text>
            <Text style={styles.metaValue}>{formatDate(data.dueDate)}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeadRow}>
            <Text style={[styles.tableHeadCell, { flex: 3 }]}>Student</Text>
            <Text style={[styles.tableHeadCell, { flex: 1, textAlign: "right" }]}>Amount</Text>
          </View>
          {data.siblings.map((s, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 3 }]}>{s.studentName}</Text>
              <Text style={[styles.tableCell, { flex: 1, textAlign: "right" }]}>
                {data.currency} {s.amount.toFixed(2)}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.totalsRow}>
          <Text style={styles.totalsLabel}>{data.isCombined ? "Total (all siblings)" : "Total due"}</Text>
          <Text style={styles.totalsValue}>
            {data.currency} {data.totalAmount.toFixed(2)}
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Ease Quran Online Academy - Thank you for your continued trust.</Text>
        </View>
      </Page>
    </Document>
  );
}
