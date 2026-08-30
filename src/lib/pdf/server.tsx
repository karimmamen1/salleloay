import { Document, Page, Path, StyleSheet, Svg, Text, View, renderToBuffer } from "@react-pdf/renderer";
import type { Style } from "@react-pdf/stylesheet";
import type { MonthlyReportData, Reservation } from "@/types";

const colors = {
  ink: "#18221f",
  green: "#123f33",
  gold: "#b78b47",
  sand: "#f5f1e8",
  line: "#ddd4c4",
  muted: "#69746f",
};

const base = StyleSheet.create({
  page: { fontFamily: "Helvetica", color: colors.ink, backgroundColor: "#ffffff", padding: 22, fontSize: 8.5 },
  header: { alignItems: "center", borderBottomWidth: 1.5, borderBottomColor: colors.gold, paddingBottom: 9, marginBottom: 9 },
  hall: { fontSize: 11, fontWeight: 700, color: colors.gold },
  title: { textAlign: "center", fontSize: 16, fontWeight: 700, color: colors.green, marginTop: 7 },
  section: { borderWidth: 1, borderColor: colors.line, borderRadius: 7, marginBottom: 7, overflow: "hidden" },
  sectionTitle: { backgroundColor: colors.green, paddingVertical: 5, paddingHorizontal: 8, color: "#ffffff", fontWeight: 700, fontSize: 8.5 },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  field: { width: "50%", paddingVertical: 4, paddingHorizontal: 7, borderBottomWidth: 0.5, borderBottomColor: "#ebe5da" },
  fieldFull: { width: "100%" },
  label: { fontSize: 6.7, color: colors.gold },
  value: { marginTop: 2, fontSize: 8.8, fontWeight: 700, color: colors.ink },
  valueCenter: { textAlign: "center" },
  money: { color: colors.green },
});

const frenchEventNames: Record<Reservation["eventType"], string> = {
  wedding: "Mariage",
  engagement: "Fiançailles",
  circumcision: "Circoncision",
  birthday: "Anniversaire",
  reception: "Réception",
  other: "Autre",
};

const arabicPattern = /[\u0600-\u06ff]/;
const formatMoney = (value: number) => `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(value).replace(/\u202f/g, " ")} DA`;
const formatDate = (value: string) => {
  const [year, month, day] = value.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
};
const eventName = (reservation: Reservation) => {
  if (reservation.eventType !== "other") return frenchEventNames[reservation.eventType];
  const custom = reservation.customEventType?.trim();
  return custom && !arabicPattern.test(custom) ? custom : frenchEventNames.other;
};

function Field({ label, value, full = false, money = false, center = false }: { label: string; value: string | number; full?: boolean; money?: boolean; center?: boolean }) {
  return <View style={[base.field, ...(full ? [base.fieldFull] : [])]} wrap={false}>
    <Text style={[base.label, ...(center ? [{ textAlign: "center" as const }] : [])]}>{label}</Text>
    <Text style={[base.value, ...(center ? [base.valueCenter] : []), ...(money ? [base.money] : [])]}>{String(value)}</Text>
  </View>;
}

function Header({ title }: { title: string }) {
  return <View style={base.header}>
    <Text style={base.hall}>Salle des Fêtes Louay</Text>
    <Text style={base.title}>{title}</Text>
  </View>;
}

function SectionTitle({ children }: { children: string }) {
  return <View style={base.sectionTitle}><Text>{children}</Text></View>;
}

function CutLine() {
  return <View style={{ flexDirection: "row", alignItems: "center", marginVertical: 6 }} wrap={false}>
    <View style={{ flexGrow: 1, borderTopWidth: 1, borderStyle: "dashed", borderTopColor: colors.muted }} />
    <Svg width={20} height={13} viewBox="0 0 24 16" style={{ marginHorizontal: 8 }}>
      <Path d="M7.2 6.8a3.6 3.6 0 1 0 0 2.4L11 8l-3.8-1.2Zm0-1.2L21 1l-9.2 7L7.2 6.4v-.8Zm0 4.8L21 15l-9.2-7-4.6 1.6v.8Z" fill={colors.muted} />
    </Svg>
    <View style={{ flexGrow: 1, borderTopWidth: 1, borderStyle: "dashed", borderTopColor: colors.muted }} />
  </View>;
}

function MiniField({ label, value, full = false, money = false }: { label: string; value: string | number; full?: boolean; money?: boolean }) {
  return <View style={{ width: full ? "100%" : "50%", paddingVertical: 2.8, paddingHorizontal: 7, borderBottomWidth: 0.5, borderBottomColor: "#ebe5da" }} wrap={false}>
    <Text style={[base.label, { fontSize: 6 }]}>{label}</Text>
    <Text style={[base.value, { fontSize: 8, marginTop: 1 }, ...(money ? [base.money] : [])]}>{String(value)}</Text>
  </View>;
}

export function ReceiptDocument({ reservation, generatedOn }: { reservation: Reservation; generatedOn: string }) {
  const remaining = reservation.totalCost - reservation.advancePayment;
  return <Document title={`Recu Loay - ${reservation.customerName}`} author="Salle des Fêtes Louay">
    <Page size="A4" style={base.page}>
      <Header title="Reçu de réservation" />
      <View style={base.section} wrap={false}>
        <SectionTitle>Informations de réservation</SectionTitle>
        <View style={base.grid}>
          <Field label="Client" value={reservation.customerName} />
          <Field label="Téléphone" value={reservation.phone} />
          <Field label="Type d'événement" value={eventName(reservation)} center />
          <Field label="Invités" value={reservation.guestCount} />
          <Field label="Date de réservation" value={formatDate(reservation.reservationDate)} />
          <Field label="Date du jour" value={formatDate(generatedOn)} />
          <Field label="Coût total" value={formatMoney(reservation.totalCost)} money />
          <Field label="Avance" value={formatMoney(reservation.advancePayment)} money />
          <Field label="Reste" value={formatMoney(remaining)} money full />
        </View>
      </View>
      <View style={base.section} wrap={false}>
        <SectionTitle>Personnel et services</SectionTitle>
        <View style={base.grid}>
          <Field label="Cuisinier" value={reservation.cookName || "-"} />
          <Field label="Nom du DJ" value={reservation.djName || "-"} />
          <Field label="Type de DJ" value={reservation.djType === "internal" ? "Interne" : "Externe"} />
          <Field label="Serveurs" value={reservation.serverCount} />
          <Field label="Ménage" value={reservation.cleaningCount} full />
        </View>
      </View>
      <View style={{ position: "absolute", left: 22, right: 22, bottom: 22 }}>
        <CutLine />
        <View style={{ borderWidth: 1.2, borderColor: colors.gold, borderRadius: 8, padding: 8 }} wrap={false}>
          <View style={{ alignItems: "center", marginBottom: 5 }}>
            <Text style={{ fontSize: 11, fontWeight: 700, color: colors.green }}>Salle des Fêtes Louay</Text>
            <Text style={{ fontSize: 10, fontWeight: 700, color: colors.green, marginTop: 2 }}>Reçu client</Text>
          </View>
          <View style={base.grid}>
            <MiniField label="Client" value={reservation.customerName} full />
            <MiniField label="Date de réservation" value={formatDate(reservation.reservationDate)} />
            <MiniField label="Date du jour" value={formatDate(generatedOn)} />
            <MiniField label="Coût total" value={formatMoney(reservation.totalCost)} money />
            <MiniField label="Avance" value={formatMoney(reservation.advancePayment)} money />
            <MiniField label="Reste" value={formatMoney(remaining)} money full />
          </View>
        </View>
      </View>
    </Page>
  </Document>;
}

const report = StyleSheet.create({
  page: { ...base.page, paddingVertical: 20, paddingHorizontal: 26, fontSize: 8 },
  fixedHeader: { height: 62, borderBottomWidth: 1.5, borderBottomColor: colors.gold, alignItems: "center", justifyContent: "center", marginBottom: 9 },
  table: { borderWidth: 0.75, borderColor: colors.line, borderRadius: 4, overflow: "hidden" },
  tableHeader: { height: 28, flexDirection: "row", backgroundColor: colors.green, color: "#ffffff", alignItems: "center" },
  row: { flexDirection: "row", minHeight: 25, borderBottomWidth: 0.5, borderBottomColor: colors.line, alignItems: "center" },
  cell: { paddingHorizontal: 4, fontSize: 7.2, textAlign: "center", borderRightWidth: 0.5, borderRightColor: colors.line },
  centered: { textAlign: "center" },
  cDate: { width: "11%" },
  cClient: { width: "20%" },
  cEvent: { width: "15%" },
  cMoney: { width: "18%" },
  cCount: { width: "10%", textAlign: "center" },
  cDj: { width: "16%" },
  summary: { marginTop: 16, borderWidth: 1, borderColor: colors.line, borderRadius: 7, padding: 12, backgroundColor: colors.sand },
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", marginTop: 7 },
  summaryItem: { width: "25%", padding: 5 },
  summaryLabel: { color: colors.muted, fontSize: 7, textAlign: "center" },
  summaryValue: { color: colors.green, fontWeight: 700, fontSize: 11, marginTop: 2, textAlign: "center" },
});

function ReportCell({ children, style, center = false }: { children: string | number; style: Style; center?: boolean }) {
  return <Text style={[report.cell, style, ...(center ? [report.centered] : [])]}>{String(children)}</Text>;
}

function ReportHeaderCell({ label, style }: { label: string; style: Style }) {
  return <View style={[report.cell, style, { alignItems: "center", borderRightColor: "#57766e" }]}><Text style={{ color: "#ffffff", width: "100%", textAlign: "center", fontSize: 6.4 }}>{label}</Text></View>;
}

export function MonthlyReportDocument({ data }: { data: MonthlyReportData }) {
  const [year, month] = data.month.split("-").map(Number);
  const monthFr = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, 1)));
  const chunks = Array.from({ length: Math.ceil(data.reservations.length / 11) }, (_, index) => data.reservations.slice(index * 11, index * 11 + 11));
  return <Document title={`Rapport Loay ${data.month}`} author="Salle des Fêtes Louay">
    {chunks.map((chunk, pageIndex) => <Page key={pageIndex} size="A4" orientation="landscape" style={report.page}>
      <View style={report.fixedHeader}>
        <Text style={{ fontSize: 9, color: colors.gold, fontWeight: 700, textAlign: "center" }}>Salle des Fêtes Louay</Text>
        <Text style={{ fontSize: 15, color: colors.green, fontWeight: 700, marginTop: 3, textAlign: "center" }}>Rapport mensuel</Text>
        <Text style={{ fontSize: 8, color: colors.muted, textTransform: "capitalize", marginTop: 2, textAlign: "center" }}>{monthFr}</Text>
      </View>
      <View style={report.table}>
        <View style={report.tableHeader}>
          <ReportHeaderCell style={report.cDate} label="Date" />
          <ReportHeaderCell style={report.cClient} label="Client" />
          <ReportHeaderCell style={report.cEvent} label="Type" />
          <ReportHeaderCell style={report.cMoney} label="Coût total" />
          <ReportHeaderCell style={report.cCount} label="Serveurs" />
          <ReportHeaderCell style={report.cDj} label="DJ interne" />
          <ReportHeaderCell style={report.cCount} label="Ménage" />
        </View>
        {chunk.map((reservation) => <View key={reservation.reservationDate} style={report.row} wrap={false}>
          <ReportCell style={report.cDate}>{formatDate(reservation.reservationDate).slice(0, 5)}</ReportCell>
          <ReportCell style={report.cClient}>{reservation.customerName}</ReportCell>
          <ReportCell style={report.cEvent}>{eventName(reservation)}</ReportCell>
          <ReportCell style={report.cMoney}>{formatMoney(reservation.totalCost)}</ReportCell>
          <ReportCell style={report.cCount}>{reservation.serverCount}</ReportCell>
          <ReportCell style={report.cDj}>{reservation.djType === "internal" ? reservation.djName || "DJ interne" : "-"}</ReportCell>
          <ReportCell style={report.cCount}>{reservation.cleaningCount}</ReportCell>
        </View>)}
      </View>
      {pageIndex === chunks.length - 1 && <View style={report.summary} wrap={false}>
        <Text style={{ fontWeight: 700, color: colors.green, textAlign: "center" }}>Résumé du mois</Text>
        <View style={report.summaryGrid}>
          <View style={report.summaryItem}><Text style={report.summaryLabel}>Coût total</Text><Text style={report.summaryValue}>{formatMoney(data.summary.totalCost)}</Text></View>
          <View style={report.summaryItem}><Text style={report.summaryLabel}>Total serveurs</Text><Text style={report.summaryValue}>{data.summary.serverCount}</Text></View>
          <View style={report.summaryItem}><Text style={report.summaryLabel}>Total ménage</Text><Text style={report.summaryValue}>{data.summary.cleaningCount}</Text></View>
          <View style={report.summaryItem}><Text style={report.summaryLabel}>Nombre de DJ internes</Text><Text style={report.summaryValue}>{data.summary.internalDjCount}</Text></View>
        </View>
        {data.summary.internalDjNames.length > 0 && <View style={{ marginTop: 7, borderTopWidth: 0.5, borderTopColor: colors.line, paddingTop: 6 }}>
          <Text style={{ fontWeight: 700, color: colors.green, textAlign: "center" }}>DJ internes par nom</Text>
          <Text style={{ marginTop: 4, textAlign: "center" }}>{data.summary.internalDjNames.map((item) => `${item.name}: ${item.count}`).join("   |   ")}</Text>
        </View>}
        <Text style={{ marginTop: 7, color: colors.muted, textAlign: "center" }}>Date de génération : {formatDate(data.generatedOn)}</Text>
      </View>}
      <Text style={{ position: "absolute", bottom: 10, left: 26, right: 26, textAlign: "center", color: colors.muted, fontSize: 7 }}>Salle des Fêtes Louay - {pageIndex + 1} / {chunks.length}</Text>
    </Page>)}
  </Document>;
}

export async function renderReceiptPdf(reservation: Reservation, generatedOn: string) {
  return renderToBuffer(<ReceiptDocument reservation={reservation} generatedOn={generatedOn} />);
}

export async function renderMonthlyReportPdf(data: MonthlyReportData) {
  return renderToBuffer(<MonthlyReportDocument data={data} />);
}
