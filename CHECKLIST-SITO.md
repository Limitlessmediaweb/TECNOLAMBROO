# Checklist per la messa online definitiva · 31 ottobre 2026

Aggiornata il 15 ottobre 2026 (seconda passata). Le correzioni sono sul branch `fix/pre-lancio-31-10`, pubblicato su GitHub con la sua preview Vercel. **Non sono ancora su `main`**.

**Colonne di stato**
- **Codice**:
  - ✅ fatto nel branch `fix/pre-lancio-31-10`;
  - — non è una modifica al codice.
- **Online**: cosa vede chi apre il sito di produzione (`tecnolambroooo.vercel.app`, poi `tecnolambro.it`):
  - ❌ non ancora: arriva con il merge su `main`, oggi si vede solo nella preview;
  - ✅ già online;
  - — non riguarda il sito.

**Priorità**
- **P1**: blocca il lancio del 31/10.
- **P2**: da fare prima del lancio se possibile, altrimenti nella prima settimana.
- **P3**: dopo il lancio.

**Chi**
- **Claude**: lo faccio io, senza dati esterni.
- **Riccardo**: serve un tuo accesso, un account o una decisione.
- **Papà**: serve un dato tecnico o aziendale del titolare.
- **Consulente**: serve il consulente privacy o legale.

Le stime sono in minuti di lavoro effettivo, senza i tempi di attesa (consulente, propagazione DNS).

## In breve

| Area | Fatto nel codice (branch) | P1 ancora aperte | Chi le sblocca |
|---|---|---|---|
| Privacy e cookie | testi allineati; provenienza salvata solo dalle campagne; casella "Ho letto l'informativa" | 2 | consulente, papà |
| Sicurezza | header, HSTS, modulo preventivi, patch delle dipendenze | 3 | Riccardo |
| Prodotti e trattamenti | pagina Trattamenti e dati delle rigide pronti (nascosti finché vuoti), titoli uniformi | 5 | papà |
| Foto | `npm run foto` per convertire le foto | 1–2 | Riccardo, papà |
| SEO base | favicon, sitemap, redirect del vecchio sito | 4 | Riccardo |
| Bug | demo mai in produzione, segnaposti bloccati, telefono senza sovrapposizioni, build e test verdi | 0 | — |
| Dati aziendali | ragione sociale, PEC, cellulare, orari, "24 ore" in un solo punto | — | — |

**Percorso critico.** I dati di papà (tabelle, flange, WR-51 e WR-22) e il parere del consulente sono quello che richiede più tempo: chiediamoli per primi.

| Quando | Cosa |
|---|---|
| entro lunedì 20/10 | dati di papà (3.1–3.5), PEC (1.5), appuntamento col consulente (1.2), Resend e DNS (2.5) |
| 21–25/10 | foto (4.1–4.4) con `npm run foto`; io integro foto e dati e rigenero le schede (3.6) |
| 27–29/10 | CSP sulla preview (2.4), invio reale di prova, merge di `fix/pre-lancio-31-10` su `main` |
| 30/10 | cambio DNS e variabili di produzione (5.4, 5.5) |
| 31/10 | Search Console e Google Business (5.6, 5.7) |

---

## 1. Privacy e cookie

| # | Voce | Priorità | Min | Chi | Codice | Online |
|---|---|---|---|---|---|---|
| 1.1 | Privacy e cookie policy citavano **Plausible** (mai attivo) invece di **Vercel Web Analytics**, e non elencavano tutto quello che il sito salva nel browser. Corretti in 5 lingue | — | 40 | Claude | ✅ | ❌ |
| 1.2 | **Revisione legale** di privacy, cookie policy e termini (almeno IT ed EN): basi giuridiche, conservazione (24 mesi, 10 anni, 12 mesi), fornitori USA (Vercel, Resend), foro di Pavia | P1 | 60 | Consulente | — | — |
| 1.3 | **Provenienza della prima visita** (`tl-first-visit`): ora si salva **solo** se l'indirizzo contiene `utm_*`, `gclid` o `fbclid`; le voci vecchie salvate senza campagna si cancellano alla visita successiva. Privacy e cookie policy aggiornate in 5 lingue | — | 30 | Claude | ✅ | ❌ |
| 1.4 | Casella dei moduli: da "acconsento al trattamento" a "**Ho letto l'informativa privacy**" (con link), in 5 lingue. La base giuridica è precontrattuale, non il consenso | — | 15 | Claude | ✅ | ❌ |
| 1.5 | **PEC:** footer e privacy riportano `tecnolambrosnc@pec.it` ("snc"), mentre la società è una S.a.s. Va confermato l'indirizzo. Si cambia in un solo punto (`PEC` in `src/data/site.ts`) | P1 | 5 | Papà | — | — |
| 1.6 | **Banner cookie:** oggi non serve. Il sito non ha cookie, i font sono ospitati sul sito e non ci sono Google Maps incorporate, YouTube né pixel; le statistiche Vercel non usano cookie. Va rifatto se si aggiungono Google Analytics, Ads, Meta Pixel o video incorporati | — | 0 | — | verificato | — |
| 1.7 | **File dei clienti su Vercel Blob** (oltre 4 MB): link pubblici, anche se non indovinabili, e mai cancellati, mentre la privacy promette 24 mesi. Due strade: <ul><li>pulizia automatica mensile con un cron (io 45 min, tu imposti `CRON_SECRET`);</li><li>niente Blob, i file grandi arrivano via email.</li></ul> | P2 | 50 | Riccardo decide → Claude | — | — |
| 1.8 | Accordi sul trattamento dei dati (DPA) con Vercel e con Resend (o Aruba), da accettare nei rispettivi pannelli | P2 | 15 | Riccardo | — | — |
| 1.9 | Testi legali in spagnolo, cinese e tedesco da far rivedere a un madrelingua. Finché non sono rivisti restano in noindex | P3 | — | Traduttore | — | — |

## 2. Sicurezza

| # | Voce | Priorità | Min | Chi | Codice | Online |
|---|---|---|---|---|---|---|
| 2.1 | **Header:** <ul><li>CSP minima applicata;</li><li>CSP completa in sola osservazione (`Report-Only`);</li><li>`Cross-Origin-Opener-Policy`;</li><li>`Permissions-Policy` aggiornata (prima `interest-cohort` dava un errore in console).</li></ul> | — | 30 | Claude | ✅ | ❌ |
| 2.2 | **HSTS** senza `includeSubDomains` e `preload`: `webmail.tecnolambro.it` (Aruba) risponde solo in HTTP e sarebbe diventata irraggiungibile | — | 10 | Claude | ✅ | ❌ |
| 2.3 | **Modulo preventivi:** <ul><li>accetta solo invii dalle pagine del sito;</li><li>massimo 3 conferme all'ora allo stesso indirizzo;</li><li>timeout su Resend e SMTP.</li></ul> | — | 30 | Claude | ✅ | ❌ |
| 2.4 | **CSP completa da provare sulla preview:** <ul><li>apri home, configuratore 3D, upload di un file oltre 4 MB, invio;</li><li>se la console non mostra violazioni "Report Only", la rendo applicata.</li></ul> | P1 | 30 | Riccardo + Claude | — | — |
| 2.5 | **Email in produzione:** <ul><li>`RESEND_API_KEY` con il dominio verificato (record DNS su Aruba, vedi README);</li><li>oppure `SMTP_PASS` della casella info@;</li><li>poi un invio reale di prova (`docs/messa-online.md`).</li></ul> | P1 | 40 | Riccardo (password info@ da papà) | — | — |
| 2.6 | **Anti-spam vero:** il limite di invii è in memoria, per singola istanza. Si risolve con Cloudflare Turnstile (gratuito, senza cookie di profilazione) | P2 | 60 | Riccardo (account) → Claude | — | — |
| 2.7 | **Dipendenze aggiornate:** next 16.4.1, react 19.3.1, nodemailer 10.1.1, @vercel/blob 2.8.2. `npm audit` di produzione: 0 vulnerabilità. Build e tutti i test rifatti | — | 30 | Claude | ✅ | ❌ |
| 2.8 | 5 vulnerabilità "high" solo negli strumenti di sviluppo (`eslint-config-next` → `braces`): non finiscono nel sito e non c'è una versione corretta | P3 | 0 | — | da ignorare | — |
| 2.9 | **HTTPS:** il certificato lo emette Vercel. Dopo il cambio DNS va verificato che `http://` porti a `https://` su tecnolambro.it e www | P1 | 5 | Riccardo | — | — |
| 2.10 | Autenticazione a due fattori su Vercel, GitHub, Aruba e Resend | P2 | 20 | Riccardo | — | — |
| 2.11 | **Troppi progetti Vercel sullo stesso codice:** `TECNOLAMBROO` alimenta `tecnolambroo`, `tecnolambrooo` e `tecnolambroooo`; `TECNOLAMBROOFFICIAL` ne ha un quarto. Va scelto un solo repository con un solo progetto, e vanno archiviati gli altri | P2 | 15 | Riccardo | — | — |

## 3. Prodotti e trattamenti

| # | Pagina / voce | Cosa manca | Priorità | Min | Chi | Codice | Online |
|---|---|---|---|---|---|---|---|
| 3.1 | `/prodotti/tabelle`, le 14 pagine WR e le 95 schede PDF | Valori delle tabelle (twistabile, seamless, dimensioni) trascritti a mano da un'immagine a bassa risoluzione: vanno verificati riga per riga | P1 | 45 | Papà | — | — |
| 3.2 | `/prodotti/guida-flessibile/wr-51` | **TLFX-180: tutte le dimensioni sono vuote** (A, B, C, D, P, r, R), anche nella scheda PDF | P1 | 5 | Papà | — | — |
| 3.3 | `/prodotti/guida-flessibile/wr-22` | TLFX-400: la vecchia tabella indicava una lunghezza massima di 3 piedi (circa 900 mm); oggi il sito propone 1000 e 1200 mm e lunghezze libere fino a 3000 mm. Vale ancora il limite? | P1 | 5 | Papà | — | — |
| 3.4 | WR-34 e WR-159 | Mancano i codici TLFX (oggi "WR-34 flessibile twistabile") | P2 | 5 | Papà | — | — |
| 3.5 | Configuratore, flange | Le flange per misura sono l'elenco standard IEC/EIA: serve l'elenco reale. La nota interna "Elenco da confermare" è sostituita da "Altre flange su richiesta: indicatele nelle note." | P1 | 20 | Papà | nota ✅ | ❌ |
| 3.6 | Schede tecniche | Dopo 3.1–3.5 vanno rigenerati i 95 PDF (`npm run datasheets`) | P1 | 15 | Claude | — | — |
| 3.7 | `/prodotti/curve`, `/twist`, `/disassati` | **Tabella "Dati per misura" pronta** (`src/data/rigid.ts`: raggio minimo E/H, spessore di parete), nascosta finché vuota. Mancano i valori. Lo spessore reale sostituirà quello indicativo del 3D | P2 | 30 | Papà | struttura ✅ | ❌ |
| 3.8 | **`/trattamenti`** | **Pagina pronta** (`src/data/treatments.ts`: trattamento, pezzi, note), in 5 lingue. Con l'elenco vuoto risponde 404 ed è fuori da sitemap e menu. Mancano i contenuti: quali trattamenti, su quali pezzi (argentatura, doratura, nichel…) | P2 | 20 | Papà | struttura ✅ | ❌ |
| 3.9 | Prodotti tolti nella v2 | Illuminatori d'antenna, transizioni, flange e kit, guida rigida, elettroformatura: oggi rimandano a `/prodotti`. Va confermato che non sono più a catalogo, oppure si rimettono con i soli dati (`docs/aggiungere-prodotti.md`) | P2 | 15 | Papà | — | — |
| 3.10 | Quarta famiglia | Nascosta come "famiglia da definire": nome, testi, misure | P3 | 10 | Papà | — | — |
| 3.11 | `/qualita` | "Controllo elettrico e dimensionale su ogni pezzo" è generico: serve l'elenco di strumenti e parametri | P3 | 10 | Papà | — | — |
| 3.12 | `/azienda` | Citazione del titolare (facoltativa) e date della storia dopo il 1987 | P3 | 10 | Papà | — | — |
| 3.13 | Configuratore | Opzioni extra del pezzo (es. rivestimento) e AR su Android | P3 | — | Papà | — | — |
| 3.14 | Titoli delle pagine famiglia | Ora tutti "… \| Tecnolambro", come le altre pagine (curve, twist e disassati avevano "Tecnolambro Microwave Components") | — | 10 | Claude | ✅ | ❌ |
| 3.15 | `/azienda`, sedi | Il link "Apri in Google Maps" resta solo per la sede operativa di Miradolo; la sede legale è solo testo | — | 5 | Claude | ✅ | ❌ |

## 4. Foto

Le cartelle sono pronte: i blocchi compaiono da soli quando ci sono i file, e senza foto non restano buchi.

**Come si caricano**
1. Copia i JPG nella cartella giusta.
2. Lancia **`npm run foto`**. Lo script:
   - li converte in WebP, con il lato lungo al massimo 2400 px e qualità 80, mantenendo il nome;
   - avvisa se il lato lungo è sotto i 2000 px;
   - sposta gli originali in `foto-originali/` (fuori da git).
3. Fai il commit.

**Nomi dei file:** con il reparto, es. `collaudo-1.jpg`.

| # | Dove | Cosa | Cartella | Priorità | Min | Chi | Codice | Online |
|---|---|---|---|---|---|---|---|---|
| 4.0 | Tutte | Script `npm run foto` | — | — | 30 | Claude | ✅ | — |
| 4.1 | Pagine famiglia (galleria) e home | 3–6 foto per famiglia, a partire dalle due flessibili | `public/foto/prodotti/twistable/`, `seamless/`, `bends/`, `twists/`, `offsets/` | P1 | 90 + 20 | Riccardo scatta, papà sceglie i pezzi; Claude integra | — | — |
| 4.2 | `/azienda` e home, "Chi guida Tecnolambro" | Ritratto verticale di Marco Pasquini | `public/foto/persone/marco-pasquini.jpg` | P2 | 15 | Riccardo / papà | — | — |
| 4.3 | `/azienda`, "L'officina" | Almeno una foto per reparto: lavorazione, collaudo, magazzino | `public/foto/officina/` | P2 | 45 | Riccardo | — | — |
| 4.4 | Tutte le foto con persone | Liberatoria dei dipendenti riconoscibili (diritto all'immagine) | — | P1 se ci sono persone | 15 | Papà | — | — |
| 4.5 | Home | Oggi nessuna foto vera, solo render 3D. Quando arrivano 4.1 e 4.3 si sceglie l'immagine d'apertura | — | P2 | 15 | Claude | — | — |
| 4.6 | Spot video (fuori dal sito) | 4 riprese: officina, mani che assemblano, fresatura, collaudo | `video/spot-3d/riprese/` | P3 | — | Riccardo | — | — |

## 5. SEO base

| # | Voce | Priorità | Min | Chi | Codice | Online |
|---|---|---|---|---|---|---|
| 5.1 | **Favicon e icona iPhone** dalla flangia del logo (online `/favicon.ico` e `/apple-icon.png` danno ancora errore) | — | 20 | Claude | ✅ | ❌ |
| 5.2 | Sitemap con `x-default` negli hreflang | — | 10 | Claude | ✅ | ❌ |
| 5.3 | **Vecchio WordPress su tecnolambro.com:** ogni vecchio indirizzo (`/about`, `/contact`, articoli, categorie) porta alla pagina nuova più vicina (online `/about` dà ancora 404) | — | 30 | Claude | ✅ | ❌ |
| 5.4 | `NEXT_PUBLIC_ALLOW_INDEXING=true` in Production. **Senza, robots.txt blocca tutto e ogni pagina è noindex** | P1 | 2 | Riccardo | — | — |
| 5.5 | **Domini:** <ul><li>tecnolambro.it come principale;</li><li>punta su Vercel anche tecnolambro.com e www.tecnolambro.com e imposta `CANONICAL_REDIRECT=true` (`docs/messa-online.md`);</li><li>spegni il WordPress solo dopo aver provato i redirect.</li></ul> | P1 | 20 | Riccardo | — | — |
| 5.6 | **Google Search Console:** proprietà tecnolambro.it e tecnolambro.com, invio della sitemap, "Cambio di indirizzo" da .com a .it | P1 | 25 | Riccardo | — | — |
| 5.7 | **Scheda Google Business:** sito tecnolambro.it, orari (lun–ven 8–12 e 13:30–17:30), foto | P1 | 15 | Papà (accesso) + Riccardo | — | — |
| 5.8 | Coordinate della sede di Miradolo per i dati strutturati (`geo`) | P3 | 10 | Riccardo → Claude | — | — |
| 5.9 | Profili social (Instagram, Facebook, LinkedIn): link nel footer e `sameAs` | P3 | 15 | Riccardo → Claude | — | — |
| 5.10 | Immagine Open Graph in cinese: probabili quadratini (manca un font cinese nel generatore). Serve solo se `/zh` va online | P3 | 30 | Claude | — | — |
| 5.11 | ES, ZH e DE restano in noindex finché un madrelingua non le rivede | P3 | — | Traduttore | — | — |

## 6. Bug

| # | Voce | Priorità | Min | Chi | Codice | Online |
|---|---|---|---|---|---|---|
| 6.1 | Errore in console di Chrome su ogni pagina (`interest-cohort`) | — | 5 | Claude | ✅ | ❌ |
| 6.2 | Privacy e cookie descrivevano Plausible (vedi 1.1) | — | — | Claude | ✅ | ❌ |
| 6.3 | `.env.example` con dominio, destinatario dei preventivi e porta SMTP sbagliati | — | 15 | Claude | ✅ | — |
| 6.4 | **Modalità demo:** se `NEXT_PUBLIC_DEMO` manca ora vale `false`, e nel deploy di produzione Vercel è sempre spenta, anche se qualcuno la imposta a `true`. Online oggi si vedono ancora i badge "● manca: …" | — | 20 | Claude | ✅ | ❌ |
| 6.5 | **Note interne mai in produzione:** badge "● manca: …", "Bozza da far revisionare…", "Valori da verificare…", "Elenco da confermare…". Quando manca il dato il blocco sparisce. `check:placeholders` fallisce se una di queste stringhe finisce nel testo o nel markup, in 5 lingue | — | 30 | Claude | ✅ | ❌ |
| 6.6 | **Telefono (375 px):** <ul><li>il pulsante WhatsApp non copre più il testo: si nasconde mentre si scorre verso il basso;</li><li>la miniatura 3D del configuratore sta dentro la barra fissa e non copre più la card "Disassato";</li><li>verificato su home, `/shop` e `/contatti`.</li></ul> | — | 40 | Claude | ✅ | ❌ |
| 6.7 | **Build e test:** `npm run verify`, `test:request`, `test:configurator`, `check:links` (549 pagine), `check:placeholders` e `check:alt` tutti verdi, prima e dopo le modifiche | — | 25 | Claude | ✅ | — |
| 6.8 | Errore JavaScript intermittente sulla home cinese ("Cannot read properties of undefined (reading 'end')") | P3 (P2 se `/zh` va online) | 45 | Claude | — | — |
| 6.9 | Lighthouse mobile della home cinese: 77 nell'ultima misura (obiettivo 85) | P3 | 60 | Claude | — | — |

## 7. Dati aziendali in un solo punto

| # | Voce | Chi | Codice | Online |
|---|---|---|---|---|
| 7.1 | Ragione sociale, PEC, cellulare/WhatsApp, orari dell'ufficio e tempo di risposta del preventivo ("24 ore", ~25 punti per lingua) si cambiano **solo** in `src/data/site.ts`. Nei testi delle 5 lingue ci sono i segnaposto `%…%`. Elenco dei punti in cui comparivano: [docs/dati-centralizzati.md](docs/dati-centralizzati.md) | Claude | ✅ | ❌ (testi visibili identici) |

## Lighthouse mobile (15/10/2026, build di produzione, mediana di 3 giri)

Profilo standard di Lighthouse: Moto G Power, 4G lento, CPU 4×.

| Pagina | Performance | Accessibilità | Best practice | SEO | LCP |
|---|---|---|---|---|---|
| `/` | 91 | 100 | 100 | 100 | 3,4 s |
| `/shop` | 95 | 100 | 100 | 100 | 2,1 s |
| `/prodotti/guida-flessibile/wr-90` | 92 | 100 | 100 | 100 | 3,4 s |

**JavaScript iniziale della home:** 285 KB compressi (805 KB non compressi), sotto la soglia dei ~500 KB.

**3D:** three.js non si carica all'apertura. Parte solo quando il riquadro entra nello schermo (`Viewer3D`, IntersectionObserver), quindi non serviva altro.

---

## Cosa chiedere a papà (una sola volta, ~1 ora per le P1)

1. **PEC:** `tecnolambrosnc@pec.it` è giusta e attiva? (1.5)
2. **Tabelle** di `/prodotti/tabelle`: le controlla stampate e segna le correzioni. (3.1)
3. **WR-51 (TLFX-180):** dimensioni A, B, C, D, P, r, R. (3.2)
4. **WR-22 (TLFX-400):** vale ancora il limite di 3 piedi (circa 900 mm)? (3.3)
5. **Flange** realmente prodotte per ogni misura. (3.5)
6. **Liberatoria** per i dipendenti nelle foto. (4.4)
7. **Accesso** alla scheda Google Business e password della casella info@ (o accesso al pannello Aruba). (2.5, 5.7)

Per dopo (P2–P3):
- raggio minimo E/H e spessore di parete per misura (3.7);
- trattamenti e pezzi su cui si fanno (3.8);
- codici TLFX di WR-34 e WR-159;
- quali prodotti tolti nella v2 si vendono ancora;
- quarta famiglia, strumenti di collaudo, citazione e date della storia.

## Totali stimati (lavoro ancora da fare)

| Chi | P1 | Tutto |
|---|---|---|
| Papà | ~1 h 45 min | ~3 h 15 min |
| Riccardo | ~4 h (di cui 1 h 30 min di foto) | ~6 h |
| Claude | ~1 h (CSP applicata, schede PDF, integrazione foto) | ~5 h |
| Consulente | 1 incontro (~1 h) | — |
