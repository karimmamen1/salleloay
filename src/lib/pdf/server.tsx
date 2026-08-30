import { Document, Font, Page, Path, StyleSheet, Svg, Text, View, renderToBuffer } from "@react-pdf/renderer";
import type { Style } from "@react-pdf/stylesheet";
import type { MonthlyReportData, Reservation } from "@/types";
import { arabicPattern, pdfRtl } from "./rtl";

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

const colors = {
  ink: "#18221f",
  green: "#123f33",
  gold: "#b78b47",
  sand: "#f5f1e8",
  line: "#ddd4c4",
  muted: "#69746f",
};

const base = StyleSheet.create({
  page: { fontFamily: "Noto Sans Arabic", color: colors.ink, backgroundColor: "#ffffff", padding: 22, fontSize: 8.5 },
  header: { alignItems: "center", borderBottomWidth: 1.5, borderBottomColor: colors.gold, paddingBottom: 7, marginBottom: 8 },
  hallFr: { fontSize: 10, color: colors.gold },
  hallAr: { direction: "ltr", textAlign: "center", fontSize: 16, fontWeight: 700, color: colors.green, marginTop: 2 },
  titleAr: { direction: "ltr", textAlign: "center", fontSize: 13, fontWeight: 700, color: colors.green, marginTop: 4 },
  titleFr: { textAlign: "center", fontSize: 9, color: colors.muted, marginTop: 1 },
  section: { borderWidth: 1, borderColor: colors.line, borderRadius: 7, marginBottom: 6, overflow: "hidden" },
  sectionTitle: { backgroundColor: colors.green, paddingVertical: 4, paddingHorizontal: 8, flexDirection: "row", alignItems: "center" },
  sectionTitleText: { width: "50%", color: "#ffffff", fontWeight: 700, fontSize: 8 },
  sectionTitleAr: { direction: "ltr", textAlign: "right" },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  field: { width: "50%", paddingVertical: 3.5, paddingHorizontal: 7, borderBottomWidth: 0.5, borderBottomColor: "#ebe5da" },
  fieldFull: { width: "100%" },
  labels: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  labelAr: { direction: "ltr", textAlign: "right", fontSize: 7.2, color: colors.muted },
  labelFr: { fontSize: 6.4, color: colors.gold },
  value: { marginTop: 1.5, fontSize: 8.7, fontWeight: 700, color: colors.ink },
  valueRtl: { direction: "ltr", textAlign: "right" },
  valueCenter: { textAlign: "center" },
  money: { color: colors.green },
});

const bilingualEventNames: Record<Reservation["eventType"], { ar: string; fr: string }> = {
  wedding: { ar: "زفاف", fr: "Mariage" },
  engagement: { ar: "خطوبة", fr: "Fiançailles" },
  circumcision: { ar: "ختان", fr: "Circoncision" },
  birthday: { ar: "عيد ميلاد", fr: "Anniversaire" },
  reception: { ar: "استقبال", fr: "Réception" },
  other: { ar: "أخرى", fr: "Autre" },
};

const formatMoney = (value: number) => `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(value).replace(/\u202f/g, " ")} DA`;
const formatDate = (value: string) => {
  const [year, month, day] = value.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
};
const eventName = (reservation: Reservation) => reservation.eventType === "other" && reservation.customEventType?.trim()
  ? reservation.customEventType.trim()
  : bilingualEventNames[reservation.eventType].ar;

function Field({ ar, fr, value, full = false, money = false, center = false }: { ar: string; fr: string; value: string | number; full?: boolean; money?: boolean; center?: boolean }) {
  const text = String(value);
  return <View style={[base.field, ...(full ? [base.fieldFull] : [])]} wrap={false}>
    <View style={base.labels}>
      <Text style={base.labelFr}>{fr}</Text>
      <Text style={base.labelAr}>{pdfRtl(ar)}</Text>
    </View>
    <Text style={[base.value, ...(arabicPattern.test(text) ? [base.valueRtl] : []), ...(center ? [base.valueCenter] : []), ...(money ? [base.money] : [])]}>{pdfRtl(text)}</Text>
  </View>;
}

function Header({ arTitle, frTitle }: { arTitle: string; frTitle: string }) {
  return <View style={base.header}>
    <Text style={base.hallFr}>Salle des Fêtes Louay</Text>
    <Text style={base.hallAr}>{pdfRtl("قاعة الأفراح لؤي")}</Text>
    <Text style={base.titleAr}>{pdfRtl(arTitle)}</Text>
    <Text style={base.titleFr}>{frTitle}</Text>
  </View>;
}

function SectionTitle({ ar, fr }: { ar: string; fr: string }) {
  return <View style={base.sectionTitle}>
    <Text style={base.sectionTitleText}>{fr}</Text>
    <Text style={[base.sectionTitleText, base.sectionTitleAr]}>{pdfRtl(ar)}</Text>
  </View>;
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
    <View style={base.labels}>
      <Text style={[base.labelFr, { fontSize: 5.8 }]}>{fr}</Text>
      <Text style={[base.labelAr, { fontSize: 6.7 }]}>{pdfRtl(ar)}</Text>
    </View>
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
          <Field ar="نوع المناسبة" fr="Type d'événement" value={eventName(reservation)} center />
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
            <Text style={[base.titleAr, { fontSize: 12, marginTop: 0 }]}>{pdfRtl("قاعة الأفراح لؤي")}</Text>
            <Text style={[base.titleAr, { fontSize: 10, marginTop: 1 }]}>{pdfRtl("وصل الزبون")}</Text>
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
  page: { ...base.page, paddingVertical: 18, paddingHorizontal: 26, fontSize: 8 },
  fixedHeader: { height: 78, borderBottomWidth: 1.5, borderBottomColor: colors.gold, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  table: { borderWidth: 0.75, borderColor: colors.line, borderRadius: 4, overflow: "hidden" },
  tableHeader: { height: 34, flexDirection: "row", backgroundColor: colors.green, color: "#ffffff", alignItems: "stretch" },
  row: { flexDirection: "row", minHeight: 25, borderBottomWidth: 0.5, borderBottomColor: colors.line, alignItems: "stretch" },
  cell: { paddingHorizontal: 4, fontSize: 7.2, borderRightWidth: 0.5, borderRightColor: colors.line, alignSelf: "stretch", justifyContent: "center" },
  cDate: { width: "11%" },
  cClient: { width: "20%" },
  cEvent: { width: "15%" },
  cMoney: { width: "18%" },
  cCount: { width: "10%" },
  cDj: { width: "16%" },
  rtl: { direction: "ltr", textAlign: "center" },
  summary: { marginTop: 14, borderWidth: 1, borderColor: colors.line, borderRadius: 7, padding: 10, backgroundColor: colors.sand },
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", marginTop: 5 },
  summaryItem: { width: "25%", padding: 4, alignItems: "center" },
  summaryLabelFr: { color: colors.muted, fontSize: 6.5, textAlign: "center" },
  summaryLabelAr: { direction: "ltr", color: colors.muted, fontSize: 6.5, textAlign: "center", marginTop: 1 },
  summaryValue: { color: colors.green, fontWeight: 700, fontSize: 10.5, marginTop: 2, textAlign: "center" },
});

function ReportCell({ children, style }: { children: string | number; style: Style }) {
  const text = String(children);
  return <View style={[report.cell, style]}>
    <Text style={[{ textAlign: "center" }, ...(arabicPattern.test(text) ? [report.rtl] : [])]}>{pdfRtl(text)}</Text>
  </View>;
}

function ReportHeaderCell({ fr, ar, style }: { fr: string; ar: string; style: Style }) {
  return <View style={[report.cell, style, { alignItems: "center", borderRightColor: "#57766e" }]}>
    <Text style={{ color: "#ffffff", width: "100%", textAlign: "center", fontSize: 6.1 }}>{fr}</Text>
    <Text style={{ color: "#ffffff", width: "100%", textAlign: "center", direction: "ltr", fontSize: 5.8, marginTop: 1 }}>{pdfRtl(ar)}</Text>
  </View>;
}

function SummaryItem({ fr, ar, value }: { fr: string; ar: string; value: string | number }) {
  return <View style={report.summaryItem}>
    <Text style={report.summaryLabelFr}>{fr}</Text>
    <Text style={report.summaryLabelAr}>{pdfRtl(ar)}</Text>
    <Text style={report.summaryValue}>{String(value)}</Text>
  </View>;
}

export function MonthlyReportDocument({ data }: { data: MonthlyReportData }) {
  const [year, month] = data.month.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, 1));
  const monthFr = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" }).format(date);
  const monthAr = new Intl.DateTimeFormat("ar-DZ", { month: "long", year: "numeric", timeZone: "UTC" }).format(date);
  const chunks = Array.from({ length: Math.ceil(data.reservations.length / 11) }, (_, index) => data.reservations.slice(index * 11, index * 11 + 11));
  return <Document title={`Rapport Loay ${data.month}`} author="Salle des Fêtes Louay">
    {chunks.map((chunk, pageIndex) => <Page key={pageIndex} size="A4" orientation="landscape" style={report.page}>
      <View style={report.fixedHeader}>
        <Text style={{ fontSize: 8.5, color: colors.gold, fontWeight: 700, textAlign: "center" }}>Salle des Fêtes Louay</Text>
        <Text style={{ fontSize: 11.5, color: colors.green, fontWeight: 700, direction: "ltr", textAlign: "center", marginTop: 1 }}>{pdfRtl("قاعة الأفراح لؤي")}</Text>
        <Text style={{ fontSize: 13.5, color: colors.green, fontWeight: 700, marginTop: 2, textAlign: "center" }}>Rapport mensuel</Text>
        <Text style={{ fontSize: 10, color: colors.green, fontWeight: 700, direction: "ltr", textAlign: "center" }}>{pdfRtl("التقرير الشهري")}</Text>
        <Text style={{ fontSize: 7.2, color: colors.muted, textTransform: "capitalize", marginTop: 2, textAlign: "center" }}>{monthFr} / {pdfRtl(monthAr)}</Text>
      </View>
      <View style={report.table}>
        <View style={report.tableHeader}>
          <ReportHeaderCell style={report.cDate} fr="Date" ar="التاريخ" />
          <ReportHeaderCell style={report.cClient} fr="Client" ar="الزبون" />
          <ReportHeaderCell style={report.cEvent} fr="Type" ar="المناسبة" />
          <ReportHeaderCell style={report.cMoney} fr="Coût total" ar="التكلفة" />
          <ReportHeaderCell style={report.cCount} fr="Serveurs" ar="سرفور" />
          <ReportHeaderCell style={report.cDj} fr="DJ interne" ar="الديجي الداخلي" />
          <ReportHeaderCell style={report.cCount} fr="Ménage" ar="ميناج" />
        </View>
        {chunk.map((reservation) => <View key={reservation.reservationDate} style={report.row} wrap={false}>
          <ReportCell style={report.cDate}>{formatDate(reservation.reservationDate).slice(0, 5)}</ReportCell>
          <ReportCell style={report.cClient}>{reservation.customerName}</ReportCell>
          <ReportCell style={report.cEvent}>{eventName(reservation)}</ReportCell>
          <ReportCell style={report.cMoney}>{formatMoney(reservation.totalCost)}</ReportCell>
          <ReportCell style={report.cCount}>{reservation.serverCount}</ReportCell>
          <ReportCell style={report.cDj}>{reservation.djType === "internal" ? reservation.djName || "ديجي داخلي" : "-"}</ReportCell>
          <ReportCell style={report.cCount}>{reservation.cleaningCount}</ReportCell>
        </View>)}
      </View>
      {pageIndex === chunks.length - 1 && <View style={report.summary} wrap={false}>
        <Text style={{ fontWeight: 700, color: colors.green, textAlign: "center" }}>Résumé du mois</Text>
        <Text style={{ fontWeight: 700, color: colors.green, direction: "ltr", textAlign: "center", marginTop: 1 }}>{pdfRtl("ملخص الشهر")}</Text>
        <View style={report.summaryGrid}>
          <SummaryItem fr="Coût total" ar="مجموع التكلفة الإجمالية" value={formatMoney(data.summary.totalCost)} />
          <SummaryItem fr="Total serveurs" ar="مجموع السرفور" value={data.summary.serverCount} />
          <SummaryItem fr="Total ménage" ar="مجموع الميناج" value={data.summary.cleaningCount} />
          <SummaryItem fr="Nombre de DJ internes" ar="عدد مرات الديجي الداخلي" value={data.summary.internalDjCount} />
        </View>
        {data.summary.internalDjNames.length > 0 && <View style={{ marginTop: 5, borderTopWidth: 0.5, borderTopColor: colors.line, paddingTop: 5 }}>
          <Text style={{ fontWeight: 700, color: colors.green, textAlign: "center" }}>DJ internes par nom</Text>
          <Text style={{ fontWeight: 700, color: colors.green, direction: "ltr", textAlign: "center", marginTop: 1 }}>{pdfRtl("الديجي الداخلي حسب الاسم")}</Text>
          <Text style={{ marginTop: 3, textAlign: "center" }}>{data.summary.internalDjNames.map((item) => `${item.name}: ${item.count}`).join("   |   ")}</Text>
        </View>}
        <Text style={{ marginTop: 5, color: colors.muted, textAlign: "center" }}>Date de génération : {formatDate(data.generatedOn)}</Text>
        <Text style={{ color: colors.muted, direction: "ltr", textAlign: "center", marginTop: 1 }}>{pdfRtl("تاريخ إنشاء التقرير")}: {formatDate(data.generatedOn)}</Text>
      </View>}
      <Text style={{ position: "absolute", bottom: 9, left: 26, right: 26, textAlign: "center", color: colors.muted, fontSize: 7 }}>Salle des Fêtes Louay - {pageIndex + 1} / {chunks.length}</Text>
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
