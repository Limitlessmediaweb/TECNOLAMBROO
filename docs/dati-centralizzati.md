# Dati aziendali: dove si cambiano

Questi dati stanno **in un solo punto**, `src/data/site.ts`. Cambiato il valore lì, si aggiornano da soli:
- le pagine e i 5 file di testo;
- le email al cliente;
- i dati strutturati per Google.

| Dato | Dove si cambia in `src/data/site.ts` | Valore attuale |
|---|---|---|
| Ragione sociale | `LEGAL_NAME`, `LEGAL_NAME_SHORT` | Tecnolambro S.a.s. di Pasquini Marco & C. / Tecnolambro S.a.s. |
| PEC | `PEC` | tecnolambrosnc@pec.it |
| Cellulare e WhatsApp | `MOBILE` | +39 375 577 1084 (WhatsApp e link `tel:` derivati) |
| Tempo di risposta del preventivo | `QUOTE_REPLY_HOURS`; le formulazioni per lingua sono in `QUOTE_TIME_FORMS` | 24 ("24 ore", "24 ore lavorative", "24 h") |
| Orari dell'ufficio | `COMPANY.hours` (giorni ISO, 1 = lunedì) | lun–ven 8:00–12:00 e 13:30–17:30; sabato e domenica chiuso |

**Come funziona**
- Nei file `messages/*.json` i valori sono scritti come segnaposto: `%legalName%`, `%legalNameShort%`, `%pec%`, `%phone%`, `%quoteTime%`, `%quoteTimeWorking%`, `%quoteTimeShort%`, `%officeDays%`, `%officeHours%`, `%closedDays%`.
- `src/i18n/request.ts` li sostituisce al caricamento dei testi, con `siteTokens()` di `site.ts`.
- I testi degli orari si generano dai dati: nomi dei giorni e congiunzioni ("e", "and", "y", "und", "和") li fornisce `Intl`.

**Controlli**
- `npm run i18n:check` fallisce se una lingua perde o cambia un segnaposto.
- `npm run check:placeholders` fallisce se un segnaposto non sostituito arriva nella pagina.

**Dopo un cambio**
- Rigenera le schede tecniche PDF (`npm run datasheets`): sono file statici e riportano il cellulare.
- Se cambiano gli orari, aggiorna anche la scheda Google Business.

## Dove comparivano (15/10/2026)

Prima di questa modifica i valori erano scritti a mano. Le chiavi valgono per tutte e 5 le lingue, salvo dove indicato.

**Tempo di risposta "24 ore" (≈ 25 punti per lingua)**
- **"24 ore":**
  - `meta.home.description`, `meta.products.description`, `meta.custom.description`, `meta.contact.description`, `meta.shop.description`;
  - `company.factReply`;
  - `products.page.onRequestBody`, `products.page.quoteBody`, `products.page.shopBody`;
  - `shopSection.points.0`;
  - `faq.items.shopVsQuote.a`;
  - `finalCta.title`;
  - `customPage.timeBody`;
  - `contactPage.intro`;
  - `shop.intro`, `shop.how.2`;
  - `configurator.customBody`;
  - `requestSent.next.0.title`;
  - `trust.quote24`;
  - `wrPage.metaDescription`.
- **"24 ore lavorative":** `faq.items.clientDrawing.a`, `quote.body`, `request.intro`, `requestSent.body`, `wrPage.ctaBody`, e l'email di conferma al cliente in 5 lingue (`src/lib/quote-mail.ts`).
- **"24 h":**
  - `company.factReplyValue`;
  - in spagnolo e tedesco anche `meta.products.description`;
  - in tedesco anche `meta.shop.description`;
  - in spagnolo anche `trust.quote24`.

**Cellulare +39 375 577 1084**
- Testi: `meta.contact.description`, `legal.privacy.sections.0.p.1`, `legal.terms.sections.5.p.0`, `tables.sheetFooter` (piè di pagina delle schede PDF).
- Codice: header, footer, `QuoteSection`, conferma della richiesta, email al cliente, JSON-LD: già da `COMPANY.phone`.
- WhatsApp: prima era un secondo valore separato, ora è derivato dal cellulare.

**Ragione sociale**
- "Tecnolambro S.a.s. di Pasquini Marco & C." nei testi: `footer.rights`, `legal.privacy.sections.0.p.0`, `legal.terms.sections.0.p.0`.
- "Tecnolambro S.a.s." nei testi: `meta.privacy.description`.
- "Tecnolambro S.a.s." nel codice: `authors` in `src/app/[locale]/layout.tsx` e `alternateName` del JSON-LD in `src/lib/seo.ts`.
- Footer, contatti e JSON-LD: già da `COMPANY.legalName`.

**PEC**
- Testi: `legal.privacy.sections.0.p.1`.
- Footer e contatti: già da `COMPANY.pec`.

**Orari**
- Testi: `common.hoursWeek`, `common.hoursWeekend` (footer e contatti) e `faq.items.hours.a`.
- JSON-LD: `openingHoursSpecification`, già da `COMPANY.hours`.
