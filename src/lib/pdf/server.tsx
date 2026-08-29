import { Document, Font, Page, Path, StyleSheet, Svg, Text, View, renderToBuffer } from "@react-pdf/renderer";
import type { Style } from "@react-pdf/stylesheet";
import { arabicPattern, pdfRtl } from "./rtl";
import type { MonthlyReportData, Reservation } from "@/types";

let fontsRegistered = false;

function registerFonts(fontBase: string) {
  if (fontsRegistered) return;
  Font.register({
    family: "Noto Sans Arabic",
    fonts: [
      { src: `${fontBase}/NotoSansArabic-Regular.ttf`, fontWeight: 400 },
      { src: `${fontBase}/NotoSansArabic-Bold.ttf`, fontWeight: 700 },
    ],
  });
  Font.registerHyphenationCallback((word) => [word]);
  fontsRegistered = true;
}

const colors = { ink: "#18221f", green: "#123f33", gold: "#b78b47", sand: "#f5f1e8", line: "#ddd4c4", muted: "#69746f", red: "#9f413a" };
const base = StyleSheet.create({
  page: { fontFamily: "Noto Sans Arabic", color: colors.ink, backgroundColor: "#ffffff", padding: 22, fontSize: 8.5 },
  header: { alignItems: "center", borderBottomWidth: 1.5, borderBottomColor: colors.gold, paddingBottom: 6, marginBottom: 7 },
  hallAr: { direction: "ltr", textAlign: "center", fontSize: 18, fontWeight: 700, color: colors.green, lineHeight: 1.35 },
  hallFr: { fontSize: 10, color: colors.gold, marginTop: 1 },
  titleAr: { direction: "ltr", textAlign: "right", fontSize: 14, fontWeight: 700, color: colors.green },
  titleFr: { fontSize: 9, color: colors.muted, marginTop: 1 },
  section: { borderWidth: 1, borderColor: colors.line, borderRadius: 7, marginBottom: 6, overflow: "hidden" },
  sectionTitle: { backgroundColor: colors.green, paddingVertical: 4, paddingHorizontal: 8, flexDirection: "row", justifyContent: "space-between" },
  sectionTitleAr: { direction: "ltr", textAlign: "right", color: "#ffffff", fontWeight: 700, fontSize: 9 },
  sectionTitleFr: { width: "50%", color: "#e9d8b8", fontSize: 7.5 },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  field: { width: "50%", paddingVertical: 3.5, paddingHorizontal: 7, borderBottomWidth: 0.5, borderBottomColor: "#ebe5da" },
  fieldFull: { width: "100%" },
  labels: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  labelAr: { direction: "ltr", textAlign: "right", fontSize: 7.5, color: colors.muted },
  labelFr: { fontSize: 6.5, color: colors.gold },
  value: { marginTop: 1.5, fontSize: 8.7, fontWeight: 700, color: colors.ink },
  valueRtl: { direction: "ltr", textAlign: "right" },
  money: { color: colors.green },
  footerNote: { direction: "ltr", textAlign: "center", color: colors.muted, fontSize: 7 },
});

const bilingualEventNames: Record<Reservation["eventType"], { ar: string; fr: string }> = {
  wedding: { ar: "زفاف", fr: "Mariage" }, engagement: { ar: "خطوبة", fr: "Fiançailles" },
  circumcision: { ar: "ختان", fr: "Circoncision" }, birthday: { ar: "عيد ميلاد", fr: "Anniversaire" },
  reception: { ar: "استقبال", fr: "Réception" }, other: { ar: "أخرى", fr: "Autre" },
};

const formatMoney = (value: number) => `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(value).replace(/\u202f/g, " ")} DA`;
const formatDate = (value: string) => {
  const [year, month, day] = value.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
};
const eventName = (reservation: Reservation) => reservation.eventType === "other" && reservation.customEventType
  ? reservation.customEventType
  : bilingualEventNames[reservation.eventType].ar;

function Field({ ar, fr, value, full = false, money = false }: { ar: string; fr: string; value: string | number; full?: boolean; money?: boolean }) {
  const text = String(value);
  return <View style={[base.field, ...(full ? [base.fieldFull] : [])]} wrap={false}>
    <View style={base.labels}><Text style={base.labelFr}>{fr}</Text><Text style={base.labelAr}>{pdfRtl(ar)}</Text></View>
    <Text style={[base.value, ...(arabicPattern.test(text) ? [base.valueRtl] : []), ...(money ? [base.money] : [])]}>{pdfRtl(text)}</Text>
  </View>;
}

function Header({ arTitle, frTitle }: { arTitle: string; frTitle: string }) {
  return <View style={base.header}>
    <Text style={base.hallFr}>Salle des Fêtes Louay</Text>
    <Text style={[base.titleAr, { fontSize: 16, marginTop: 4 }]}>{pdfRtl("قاعة الأفراح لؤي")}</Text>
    <View style={{ marginTop: 6, alignItems: "center" }}><Text style={base.titleAr}>{pdfRtl(arTitle)}</Text><Text style={base.titleFr}>{frTitle}</Text></View>
  </View>;
}

function SectionTitle({ ar, fr }: { ar: string; fr: string }) {
  return <View style={base.sectionTitle}><Text style={base.sectionTitleFr}>{fr}</Text><View style={{ width: "50%", alignItems: "flex-end" }}><Text style={base.sectionTitleAr}>{pdfRtl(ar)}</Text></View></View>;
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

function MiniField({ ar, fr, value, full = false, money = false }: { ar: string; fr: string; value: string | number; full?: boolean; money?: boolean }) {
  const text = String(value);
  return <View style={{ width: full ? "100%" : "50%", paddingVertical: 2.5, paddingHorizontal: 7, borderBottomWidth: 0.5, borderBottomColor: "#ebe5da" }} wrap={false}>
    <View style={base.labels}><Text style={[base.labelFr, { fontSize: 6 }]}>{fr}</Text><Text style={[base.labelAr, { fontSize: 7 }]}>{pdfRtl(ar)}</Text></View>
    <Text style={[base.value, { fontSize: 8, marginTop: 1 }, ...(arabicPattern.test(text) ? [base.valueRtl] : []), ...(money ? [base.money] : [])]}>{pdfRtl(text)}</Text>
  </View>;
}

export function ReceiptDocument({ reservation, generatedOn }: { reservation: Reservation; generatedOn: string }) {
  const remaining = reservation.totalCost - reservation.advancePayment;
  return <Document title={`Recu Loay - ${reservation.customerName}`} author="Salle des Fêtes Louay">
    <Page size="A4" style={base.page}>
      <Header arTitle="وصل الحجز" frTitle="Reçu de réservation" />
      <View style={base.section} wrap={false}>
        <SectionTitle ar="معلومات الحجز" fr="Informations de réservation" />
        <View style={base.grid}>
          <Field ar="الزبون" fr="Client" value={reservation.customerName} />
          <Field ar="رقم الهاتف" fr="Téléphone" value={reservation.phone} />
          <Field ar="نوع المناسبة" fr="Type d'événement" value={eventName(reservation)} />
          <Field ar="عدد المدعوين" fr="Invités" value={reservation.guestCount} />
          <Field ar="تاريخ الحجز" fr="Date de réservation" value={formatDate(reservation.reservationDate)} />
          <Field ar="تاريخ اليوم" fr="Date du jour" value={formatDate(generatedOn)} />
          <Field ar="التكلفة الإجمالية" fr="Coût total" value={formatMoney(reservation.totalCost)} money />
          <Field ar="الدفع المسبق" fr="Avance" value={formatMoney(reservation.advancePayment)} money />
          <Field ar="المبلغ المتبقي" fr="Reste" value={formatMoney(remaining)} money full />
        </View>
      </View>
      <View style={base.section} wrap={false}>
        <SectionTitle ar="العمال والخدمات" fr="Personnel et services" />
        <View style={base.grid}>
          <Field ar="الطباخ" fr="Cuisinier" value={reservation.cookName || "-"} />
          <Field ar="اسم الديجي" fr="Nom du DJ" value={reservation.djName || "-"} />
          <Field ar="نوع الديجي" fr="Type de DJ" value={reservation.djType === "internal" ? "داخلي" : "خارجي"} />
          <Field ar="سرفور" fr="Serveurs" value={reservation.serverCount} />
          <Field ar="ميناج" fr="Ménage" value={reservation.cleaningCount} full />
        </View>
      </View>
      <View style={{ position: "absolute", left: 22, right: 22, bottom: 22 }}>
      <CutLine />
      <View style={{ borderWidth: 1.2, borderColor: colors.gold, borderRadius: 8, padding: 8 }} wrap={false}>
        <View style={{ alignItems: "center", marginBottom: 4 }}>
          <Text style={[base.titleAr, { fontSize: 13 }]}>{pdfRtl("قاعة الأفراح لؤي")}</Text>
          <Text style={[base.titleAr, { fontSize: 10.5, marginTop: 1 }]}>{pdfRtl("وصل الزبون")}</Text>
          <Text style={base.titleFr}>Reçu client</Text>
        </View>
        <View style={base.grid}>
          <MiniField ar="الزبون" fr="Client" value={reservation.customerName} full />
          <MiniField ar="تاريخ الحجز" fr="Date de réservation" value={formatDate(reservation.reservationDate)} />
          <MiniField ar="تاريخ اليوم" fr="Date du jour" value={formatDate(generatedOn)} />
          <MiniField ar="التكلفة الإجمالية" fr="Coût total" value={formatMoney(reservation.totalCost)} money />
          <MiniField ar="الدفع المسبق" fr="Avance" value={formatMoney(reservation.advancePayment)} money />
          <MiniField ar="المبلغ المتبقي" fr="Reste" value={formatMoney(remaining)} money full />
        </View>
      </View>
      </View>
    </Page>
  </Document>;
}

const report = StyleSheet.create({
  page: { ...base.page, paddingVertical: 20, paddingHorizontal: 26, fontSize: 8 },
  fixedHeader: { height: 66, borderBottomWidth: 1.5, borderBottomColor: colors.gold, flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 7 },
  tableHeader: { height: 28, flexDirection: "row", backgroundColor: colors.green, color: "#ffffff", borderRadius: 4, alignItems: "center" },
  row: { flexDirection: "row", minHeight: 25, borderBottomWidth: 0.5, borderBottomColor: colors.line, alignItems: "center" },
  cell: { paddingHorizontal: 4, fontSize: 7.2 },
  cDate: { width: "11%" }, cClient: { width: "20%" }, cEvent: { width: "15%" }, cMoney: { width: "18%" }, cCount: { width: "10%", textAlign: "center" }, cDj: { width: "16%" },
  rtl: { direction: "ltr", textAlign: "right" },
  summary: { marginTop: 16, borderWidth: 1, borderColor: colors.line, borderRadius: 7, padding: 12, backgroundColor: colors.sand },
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", marginTop: 7 },
  summaryItem: { width: "25%", padding: 5 },
  summaryLabel: { direction: "ltr", textAlign: "right", color: colors.muted, fontSize: 7 },
  summaryValue: { color: colors.green, fontWeight: 700, fontSize: 11, marginTop: 2 },
});

function ReportCell({ children, style }: { children: string | number; style: Style }) {
  const text = String(children);
  return <Text style={[report.cell, style, ...(arabicPattern.test(text) ? [report.rtl] : [])]}>{pdfRtl(text)}</Text>;
}

function ReportHeaderCell({ fr, ar, style }: { fr: string; ar: string; style: Style }) {
  return <View style={[report.cell, style, { alignItems: "center" }]}><Text style={{ color: "#ffffff", fontSize: 6.2 }}>{fr}</Text><Text style={{ color: "#ffffff", width: "100%", textAlign: "center", fontSize: 5.5, direction: "ltr", marginTop: 1 }}>{pdfRtl(ar)}</Text></View>;
}

export function MonthlyReportDocument({ data }: { data: MonthlyReportData }) {
  const [year, month] = data.month.split("-").map(Number);
  const monthFr = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, 1)));
  const monthAr = new Intl.DateTimeFormat("ar-DZ", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, 1)));
  const chunks = Array.from({ length: Math.ceil(data.reservations.length / 11) }, (_, index) => data.reservations.slice(index * 11, index * 11 + 11));
  return <Document title={`Rapport Loay ${data.month}`} author="Salle des Fêtes Louay">
    {chunks.map((chunk, pageIndex) => <Page key={pageIndex} size="A4" orientation="landscape" style={report.page}>
      <View style={report.fixedHeader}>
        <View><Text style={{ fontSize: 8, color: colors.gold }}>Salle des Fêtes Louay</Text><Text style={{ fontSize: 14, color: colors.green, fontWeight: 700 }}>Rapport mensuel</Text><Text style={{ fontSize: 8, color: colors.muted }}>{monthFr}</Text></View>
        <View style={{ alignItems: "flex-end" }}><Text style={[base.titleAr, { fontSize: 14 }]}>{pdfRtl("قاعة الأفراح لؤي")}</Text><Text style={[base.titleAr, { fontSize: 11 }]}>{pdfRtl("التقرير الشهري")}</Text><Text style={[report.rtl, { fontSize: 8, color: colors.muted }]}>{pdfRtl(monthAr)}</Text></View>
      </View>
      <View style={report.tableHeader}>
        <ReportHeaderCell style={report.cDate} fr="Date" ar="التاريخ" /><ReportHeaderCell style={report.cClient} fr="Client" ar="الزبون" /><ReportHeaderCell style={report.cEvent} fr="Type" ar="المناسبة" /><ReportHeaderCell style={report.cMoney} fr="Coût total" ar="التكلفة" /><ReportHeaderCell style={report.cCount} fr="Serveurs" ar="سرفور" /><ReportHeaderCell style={report.cDj} fr="DJ interne" ar="الديجي الداخلي" /><ReportHeaderCell style={report.cCount} fr="Ménage" ar="ميناج" />
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
      {pageIndex === chunks.length - 1 && <View style={report.summary} wrap={false}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}><Text style={{ fontWeight: 700, color: colors.green }}>Résumé du mois</Text><Text style={[report.rtl, { fontWeight: 700, color: colors.green }]}>{pdfRtl("ملخص الشهر")}</Text></View>
        <View style={report.summaryGrid}>
          <View style={report.summaryItem}><Text style={report.summaryLabel}>{pdfRtl("مجموع التكلفة الإجمالية")}</Text><Text style={report.summaryValue}>{formatMoney(data.summary.totalCost)}</Text></View>
          <View style={report.summaryItem}><Text style={report.summaryLabel}>{pdfRtl("مجموع السرفور")}</Text><Text style={report.summaryValue}>{data.summary.serverCount}</Text></View>
          <View style={report.summaryItem}><Text style={report.summaryLabel}>{pdfRtl("مجموع الميناج")}</Text><Text style={report.summaryValue}>{data.summary.cleaningCount}</Text></View>
          <View style={report.summaryItem}><Text style={report.summaryLabel}>{pdfRtl("عدد مرات الديجي الداخلي")}</Text><Text style={report.summaryValue}>{data.summary.internalDjCount}</Text></View>
        </View>
        {data.summary.internalDjNames.length > 0 && <View style={{ marginTop: 7, borderTopWidth: 0.5, borderTopColor: colors.line, paddingTop: 6 }}>
          <Text style={[report.rtl, { fontWeight: 700, color: colors.green }]}>{pdfRtl("الديجي الداخلي حسب الاسم / DJ internes par nom")}</Text>
          <Text style={{ marginTop: 4 }}>{data.summary.internalDjNames.map((item) => `${item.name}: ${item.count}`).join("   |   ")}</Text>
        </View>}
        <Text style={[report.rtl, { marginTop: 7, color: colors.muted }]}>{pdfRtl(`تاريخ إنشاء التقرير / Date de génération: ${formatDate(data.generatedOn)}`)}</Text>
      </View>}
      <Text style={{ position: "absolute", bottom: 10, left: 26, right: 26, textAlign: "center", color: colors.muted, fontSize: 7 }}>Salle des Fêtes Louay - {pageIndex + 1} / {chunks.length}</Text>
    </Page>)}
  </Document>;
}

export async function renderReceiptPdf(reservation: Reservation, generatedOn: string, fontBase: string) {
  registerFonts(fontBase);
  return renderToBuffer(<ReceiptDocument reservation={reservation} generatedOn={generatedOn} />);
}

export async function renderMonthlyReportPdf(data: MonthlyReportData, fontBase: string) {
  registerFonts(fontBase);
  return renderToBuffer(<MonthlyReportDocument data={data} />);
}
