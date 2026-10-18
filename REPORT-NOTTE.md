# Report della notte · 18 ottobre 2026

Branch **`notte-18-10`**, creato da `fix/pre-lancio-31-10`.

- **Nessun merge su `main`.**
- **Niente di pubblicato in produzione** e variabili di Vercel non toccate.
- Il branch è solo su GitHub: Vercel ne fa una preview protetta dal login.

## In breve

| # | Compito | Esito |
|---|---|---|
| 1 | Privacy, cookie policy e banner cookie | ✅ Fatto: banner con consenso preventivo, testi riscritti in 5 lingue, link nel footer |
| 2 | Inventario di prodotti e trattamenti | ✅ Fatto (sotto). Compilata la scheda **Trattamenti**, solo con dati già presenti nel sito |
| 3 | Basi di sicurezza | ✅ Nessuna chiave esposta, form protetti, HTTPS ok. Restano 4 azioni tue (sotto) |
| 4 | Backup GitHub di tecnolambro-hub | ❌ **Non funziona ancora**: mancano i secret su GitHub. Comando pronto sotto |

---

## 1. Privacy, cookie e banner

### Cosa ho fatto

**Banner del consenso**, secondo le linee guida del Garante dell'8/10/2021:

- Compare alla prima visita, su tutte le pagine e in tutte le lingue.
- **“Accetta” e “Rifiuta” hanno lo stesso peso**: stesso stile, stessa dimensione.
- La **X chiude senza accettare**, quindi vale come rifiuto.
- La scelta dura **6 mesi**, poi il banner viene riproposto.
- La scelta si cambia in ogni momento dal link **“Preferenze cookie”** nel footer, accanto a Privacy, Termini e Cookie policy.
- Finché il banner è aperto, il pulsante WhatsApp si nasconde per non coprirlo. In stampa il banner non compare.

**Cosa parte solo dopo il consenso:**

- le **statistiche** (Vercel Web Analytics e, se un giorno lo attivi, Plausible);
- la **provenienza delle campagne**, cioè i parametri `utm_*`, `gclid` e `fbclid` salvati in `tl-first-visit` e inviati con la richiesta di preventivo.

Senza consenso, quindi, non si carica nessuno script di statistica e la provenienza non si salva né viene inviata. Se si revoca il consenso, la provenienza già salvata si cancella.

**Cosa resta sempre attivo:**

- la memorizzazione tecnica: tema, lingua, la lista “La tua richiesta”, i dati del modulo e la scelta stessa sul banner;
- non serve consenso per queste voci;
- il sito continua a **non usare cookie**.

**Cookie della lingua tolto.** Il test nuovo ha scoperto che next-intl impostava un cookie di sessione `NEXT_LOCALE`, contro quanto dicevano le policy. Al sito non serviva, perché il rilevamento automatico della lingua è spento. L'ho disattivato con `localeCookie: false` in `src/i18n/routing.ts`. Ora il test verifica zero cookie in tutte e 5 le lingue.

**Attenzione: online oggi c'è ancora il cookie della lingua.** La versione su `tecnolambroooo.vercel.app` è quella di main e lo imposta ancora. Si risolve quando si pubblica questo branch.

**Privacy policy**, riscritta in 5 lingue:

- statistiche e provenienza passano dalla base “legittimo interesse” al **consenso** (art. 6.1.a), revocabile;
- aggiunta la natura del conferimento: i campi obbligatori servono per rispondere;
- aggiunto che non ci sono decisioni automatizzate né profilazione;
- Resend indicato come fornitore negli USA, con clausole contrattuali standard;
- aggiunto il diritto di revocare il consenso;
- data aggiornata al 18/10/2026.

**Cookie policy**, riscritta in 5 lingue:

- tolta la frase “non mostriamo un banner”;
- quattro sezioni: tracciamento, memorizzazione tecnica sempre attiva, statistiche e provenienza solo con consenso, come cambiare la scelta.

**Test nuovo:** `npm run test:consent` (`scripts/consent-e2e.mjs`). Controlla:

- prima visita da un link di campagna: banner visibile, zero cookie, nessuna statistica, nessuna provenienza salvata;
- Rifiuta, Accetta, X;
- riapertura da “Preferenze cookie”;
- scadenza dopo 6 mesi e cambio di versione;
- banner dentro lo schermo a 375 px nelle 5 lingue, con pulsanti da almeno 44 px.

Gli altri test, che cliccano sul sito, partono con la scelta già fatta.

**File toccati:**

- `src/lib/consent.ts`
- `src/components/ui/CookieBanner.tsx`
- `src/components/ui/ConsentedAnalytics.tsx`, che sostituisce `FirstVisitCapture.tsx`
- `src/lib/analytics.ts`
- layout, footer e `globals.css`
- `messages/*.json`, sotto le chiavi `consent` e `legal`

### Perché non ci sono segnaposto [DA COMPILARE]

Non è servito nessun segnaposto: tutti i dati aziendali c'erano già nel progetto (`src/data/site.ts`):

- ragione sociale;
- P.IVA 08639310153;
- sede legale e sede operativa;
- email info@tecnolambro.it;
- PEC;
- telefoni.

Inoltre il controllo `check:placeholders` blocca proprio le scritte come “[DA COMPILARE]” sulle pagine pubbliche. Metterle avrebbe fatto fallire il controllo e, se pubblicate, sarebbero finite online.

Restano **da confermare**, non da compilare:

- **PEC**: oggi è `tecnolambrosnc@pec.it` (“snc”), mentre la società è una S.a.s. Si cambia in un punto solo: `PEC` in `src/data/site.ts`.
- **Email per la privacy**: oggi è info@tecnolambro.it. Se preferite un indirizzo dedicato (es. privacy@), si cambia nei testi.

---

## 2. Prodotti e trattamenti

### Inventario: cosa c'è

| Cosa | Stato |
|---|---|
| **Famiglie visibili (5)** | Guida flessibile twistabile, guida flessibile seamless, curve, twist, disassati. Ognuna ha la sua pagina in 5 lingue |
| **Misure WR (14)** | Da WR-22 a WR-284, ognuna con la sua pagina e il configuratore 3D |
| **Schede tecniche PDF** | 95: 19 per lingua × 5 lingue |
| **Tabelle tecniche** | 3, in `/prodotti/tabelle`: twistabile, seamless, dimensioni TLFX |
| **FAQ** | 15 domande complete, nessuna in sospeso |
| **Trattamenti** | **Compilata stanotte** (vedi sotto) |

### Trattamenti: cosa ho compilato

In `src/data/treatments.ts` ho messo **solo i 4 trattamenti già citati nei testi del sito**:

- brillantatura;
- verniciatura;
- trattamenti termici;
- trattamenti galvanici.

Tutti sono presentati come lavorazioni fatte con fornitori di fiducia. Per colori, vernici e parametri il testo dice “li definiamo insieme nel preventivo”: nessun dato tecnico inventato.

Di conseguenza `/trattamenti` è ora **visibile nel menu, nel footer e nella sitemap**, in 5 lingue.

**Da confermare con papà:**

- se l'elenco è giusto e completo (argentatura, doratura, nichelatura…);
- se i trattamenti si fanno davvero su **tutte e 5 le famiglie** di pezzi: oggi sono abbinati a tutte, come le opzioni del configuratore.

### Cosa manca: dati che solo papà può dare

| Cosa manca | Dove | Effetto oggi |
|---|---|---|
| **Foto reali**: prodotti, officina, Marco Pasquini | `public/foto/…`: la cartella non esiste ancora | I blocchi foto sono nascosti; il sito usa i disegni 3D |
| **WR-51 (TLFX-180)**: dimensioni A, B, C, D, P e raggi | `src/data/waveguides.ts` | Riga incompleta nella tabella TLFX |
| **WR-34 e WR-159**: codice TLFX, VSWR, attenuazione e potenze seamless | `src/data/waveguides.ts` | Mostrati come “WR-34 flessibile twistabile”; celle seamless vuote |
| **WR-22**: vale ancora il limite di 3 piedi di lunghezza? | `LENGTH_RANGE` | Oggi lunghezze standard uguali per tutte le misure |
| **Elenco reale delle flange** per misura | `src/data/flanges.ts` | Il configuratore propone un elenco standard |
| **Opzioni del pezzo** (es. rivestimento) | `EXTRA_OPTIONS` | Non mostrate |
| **Guide rigide**: spessore di parete e raggio standard delle curve | `src/data/rigid.ts` (14 misure, tutte vuote) | Il 3D e i disegni usano valori indicativi |
| **Verifica delle 3 tabelle** | `/prodotti/tabelle` | Trascritte a mano da un'immagine a bassa risoluzione |
| **Quarta famiglia di prodotto** | `families.ts`, nascosta | Non visibile |
| **Citazione del titolare** e date della storia dopo il 1987 | `pending.ts`, `/azienda` | Blocchi nascosti |
| **Strumenti di collaudo** e PDF dell'attestato | `/qualita` | Pagina più breve |

Le pagine **curve, twist e disassati** sono complete ma brevi, perché non hanno una tabella propria. Si arricchiscono con le foto e con i dati delle guide rigide.

---

## 3. Sicurezza

| Controllo | Esito |
|---|---|
| **Chiavi nel codice** | ✅ Nessuna chiave, token o password nei file del repository né nella **cronologia git**. Ho cercato chiavi di Resend, Stripe, AWS, GitHub, Google, JWT, chiavi private e stringhe di connessione Postgres |
| **File `.env`** | ✅ Tutti esclusi da git, tranne `.env.example`, che ha i valori segreti vuoti. Nel codice del browser finiscono solo variabili `NEXT_PUBLIC_*` non segrete (URL, flag) |
| **Form preventivi** (`/api/quote`) | ✅ Diverse protezioni: <ul><li>solo invii dalle pagine del sito;</li><li>limite di dimensione: 4,5 MB per invio;</li><li>campo trappola anti-bot e tempo minimo di compilazione;</li><li>limite di invii per IP;</li><li>massimo 3 conferme all'ora allo stesso indirizzo;</li><li>validazione dei dati sul server;</li><li>controllo di tipo e dimensione dei file.</li></ul> |
| **Upload grandi** (`/api/quote/upload`) | ✅ Solo dalle pagine del sito, 20 file all'ora per IP, solo formati CAD e PDF. Spento se manca `BLOB_READ_WRITE_TOKEN` |
| **Dipendenze** | ✅ `npm audit --omit=dev`: **0 vulnerabilità** |
| **Header di sicurezza** (sul branch) | ✅ <ul><li>HSTS;</li><li>CSP minima applicata e CSP completa in osservazione;</li><li>`X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`.</li></ul> |
| **HTTPS: sito Vercel** | ✅ `tecnolambroooo.vercel.app`: http porta a https (308). Certificato Google Trust Services, scade il 27/11/2026 e Vercel lo rinnova da solo |
| **HTTPS: tecnolambro.it** (oggi ancora su Aruba) | ✅ http e il dominio senza www portano a `https://www.tecnolambro.it`. Certificato Actalis `*.tecnolambro.it`, scade il 15/03/2027 |

**Da fare (tuo):**

1. **Dopo il cambio DNS verso Vercel:** ricontrollare che http porti a https su tecnolambro.it e su www.
2. **Anti-spam:** il limite di invii è in memoria, per singola istanza. Se arriva spam, si aggiunge Cloudflare Turnstile: tu crei l'account, io lo integro.
3. **Autenticazione a due fattori** su Vercel, GitHub, Aruba e Resend.
4. **Accordi sul trattamento dei dati (DPA)** con Vercel e Resend, da accettare nei rispettivi pannelli.

---

## 4. Backup di tecnolambro-hub

**Esito: NON funziona ancora.**

Cosa ho trovato:

- Su GitHub c'è un solo run del workflow `backup.yml`, quello del **12/10**, **fallito** con “Manca DATABASE_URL”.
- `gh secret list` è **vuoto**: i 3 secret non sono mai stati impostati.
- Il workflow è attivo. Il prossimo run automatico è **lunedì 19/10 alle 05:00**, ora italiana (03:00 UTC), e **fallirà allo stesso modo**.
- Le 3 chiavi sono nel file locale `tecnolambro-hub/.env.supabase.local`, che non è mai stato committato.

Non ho impostato io i secret: sono credenziali del database e vanno inserite da te.

**Come sistemarlo** (2 minuti, dalla cartella `tecnolambro-hub`, in Git Bash):

```bash
for k in DATABASE_URL SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY; do grep -m1 "^$k=" .env.supabase.local | cut -d= -f2- | tr -d '\r\n' | gh secret set "$k"; done && gh workflow run backup.yml
```

Poi controlla che il run sia verde:

```bash
gh run list --workflow backup.yml --limit 1
```

Da `HUB-STATO.md` restano anche due cose: revocare i token di sviluppo e cambiare la password di `hub_server`.

---

## Cosa devi decidere o compilare tu

**Prima del lancio (P1):**

1. **Backup hub:** il comando qui sopra. Meglio prima di lunedì mattina.
2. **Rivedere la preview** del branch `notte-18-10`: banner, footer, `/privacy`, `/cookie`, `/trattamenti`. Se va bene, si unisce a `fix/pre-lancio-31-10`. Il merge su main lo decidi tu.
3. **Revisione legale** di privacy, cookie policy e termini, almeno in italiano e inglese.
4. **PEC:** confermare `tecnolambrosnc@pec.it` oppure darmi quella giusta.
5. **Email in produzione:** `RESEND_API_KEY` oppure `SMTP_PASS`, poi un invio di prova (`docs/messa-online.md`).

**Da papà:**

6. **Trattamenti:** confermare l'elenco e le famiglie di pezzi.
7. **Dati tecnici:** WR-51, WR-34, WR-159, WR-22, elenco flange, guide rigide, verifica delle tabelle.
8. **Foto:** prodotti, officina e titolare, da mettere in `public/foto/…`. Poi `npm run foto` le converte in WebP.

**Decisioni:**

9. **Email privacy dedicata:** usarne una (es. privacy@) o restare su info@?
10. **File grandi su Vercel Blob:** pulizia automatica a 24 mesi oppure invio solo via email (checklist 1.7).
11. **Un solo progetto Vercel** e un solo repository: archiviare gli altri (checklist 2.11).

Il dettaglio di tutte le voci, con stime, è in `CHECKLIST-SITO.md`. Ho aggiornato le righe 1.6 (banner) e 3.8 (trattamenti).
