import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LayoutDashboard, Calendar, Repeat, FilePlus, Wallet, Receipt, TrendingDown,
  RefreshCw, Info,
} from "lucide-react";

interface Section {
  icon: React.ElementType;
  title: string;
  description: string;
  details: string[];
}

const SECTIONS: Section[] = [
  {
    icon: LayoutDashboard,
    title: "Instrumentpanel",
    description: "Startsidan ger en snabb överblick över likviditeten.",
    details: [
      "Aktuellt saldo — visar kontobehållningen från Wint API. Du kan redigera saldot manuellt med pennikonen om det inte stämmer. Manuellt saldo ersätts automatiskt nästa gång API:et rapporterar ett nytt värde.",
      "Senast uppdaterad — visar när data senast hämtades från Wint. Klicka Uppdatera nu för att hämta färsk data direkt.",
      "Likviditetsgrafen — visar daglig nettokassaflöde (faktiskt i blått, prognos streckad) och löpande saldo (mörkblå linje) från och med idag.",
      "Månadssammanfattning — scrollbara kort längst ned som visar totalt kassaflöde per hel kalendermånad. Grönt = positivt, rött = negativt.",
    ],
  },
  {
    icon: Calendar,
    title: "Detaljer & händelser",
    description: "En tabell med alla enskilda kassaflödeshändelser från och med idag.",
    details: [
      "Visar datum, belopp, typ (faktiskt/prognos), kategori och källa för varje post.",
      "Filtrera på typ (faktiskt eller prognos) via rullistan överst.",
      "Klicka på kategoriknapparna för att dölja eller visa specifika kategorier.",
      "Faktiska poster kommer från Wint-datan. Prognoser är beräknade av systemet.",
    ],
  },
  {
    icon: Repeat,
    title: "Återkommande fakturor",
    description: "Konfigurera leverantörsfakturor som förväntas komma tillbaka med jämna mellanrum.",
    details: [
      "Systemet hittar den senaste faktiska fakturan för angiven leverantör och projicerar framtida betalningar utifrån den.",
      "Betalningsdatumet baseras på den senaste fakturans faktiska betaldatum (eller förfallodatum om betaldatum saknas).",
      "Ange intervall i månader (1–12). Fakturor med betalningsdatum inom 14 dagar visas inte som prognos.",
      "Du kan överstyrka beloppet om du vet att nästa faktura avviker från den senaste.",
    ],
  },
  {
    icon: FilePlus,
    title: "Planerade fakturor",
    description: "Planera framtida utgående fakturor baserat på debiterbara timmar och kundmallar.",
    details: [
      "Lägg först till kunder under Kunder-kortet — ange namn, timpris, betalningstid och fakturadatumregel.",
      "Kundnamnet kan väljas bland faktiska mottagare från Wint-datan eller anges fritt.",
      "Fakturadatumregel styr när fakturan dateras: sista dag, sista arbetsdag, första (arbets)dag nästa månad — med hänsyn till svenska helgdagar.",
      "När du lägger till en planerad faktura väljs kunden automatiskt om det bara finns en. Fakturadatum beräknas automatiskt utifrån kundens regel och vald månad.",
      "Beloppet beräknas automatiskt inkl. 25% moms. Förväntad betalning = fakturadatum + betalningstid.",
      "Varje planerad faktura visas som en prognos i grafen och detaljtabellen under Planerad faktura.",
    ],
  },
  {
    icon: Wallet,
    title: "Lön & skatt",
    description: "Ange löne- och skattekostnader för att inkludera dem i prognosen.",
    details: [
      "Lön betalas ut den 25:e varje månad.",
      "Skatt & sociala avgifter betalas den 12:e varje månad (17:e i augusti).",
      "Ange nettobelopp per månad och från vilket datum inställningen gäller. Du kan ha flera perioder med olika belopp.",
      "Den senaste aktiva perioden används för beräkningen.",
    ],
  },
  {
    icon: Receipt,
    title: "Engångskostnader",
    description: "Lägg till enstaka planerade utgifter som inte passar i någon annan kategori.",
    details: [
      "Ange en beskrivning, belopp och datum för när utgiften förväntas betalas.",
      "Visas som prognos i grafen och detaljtabellen.",
      "Exempel: inköp av utrustning, konsulttjänster, prenumerationer.",
    ],
  },
  {
    icon: TrendingDown,
    title: "Löpande kostnader",
    description: "Återkommande utgifter med fast belopp — t.ex. kortavgifter, abonnemang och tjänster.",
    details: [
      "Var X dag — utgiften registreras var X:e dag från startdatumet. Välj t.ex. 30 dagar för månadsvis kostnad med exakt intervall.",
      "Månadsvis dag X — utgiften registreras på en specifik dag varje månad, t.ex. dag 25 för kortavgifter.",
      "Startdatum är obligatoriskt (standard: idag). Slutdatum är valfritt — lämna tomt för en löpande kostnad utan slutdatum.",
      "Varje förekomst visas som prognos i grafen och detaljtabellen under kategorin Löpande kostnad.",
    ],
  },
];

function SectionCard({ icon: Icon, title, description, details }: Section) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="size-4 text-primary" />
          {title}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-2">
          {details.map((d, i) => (
            <li key={i} className="flex gap-2 text-sm">
              <span className="mt-0.5 text-muted-foreground shrink-0">•</span>
              <span>{d}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export function Help() {
  return (
    <div className="flex flex-col gap-4">
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="flex gap-3 pt-5">
          <Info className="size-5 text-primary shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-foreground mb-1">Om Fint Likvid</p>
            <p className="text-muted-foreground">
              Fint Likvid visualiserar ditt företags likviditet de kommande månaderna. Data hämtas
              automatiskt från Wint API och kombineras med dina egna inställningar för lön, planerade
              fakturor och återkommande kostnader. Grafen visar faktiska och prognostiserade
              kassaflöden samt löpande kontosaldo.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        {SECTIONS.map((s) => (
          <SectionCard key={s.title} {...s} />
        ))}
      </div>

      <Card className="border-dashed">
        <CardContent className="flex gap-3 pt-5 text-sm text-muted-foreground">
          <RefreshCw className="size-4 shrink-0 mt-0.5" />
          <span>
            Data uppdateras automatiskt var 6:e timme. Använd <strong>Uppdatera nu</strong> på
            instrumentpanelen för att hämta färsk data direkt från Wint.
          </span>
        </CardContent>
      </Card>
    </div>
  );
}
