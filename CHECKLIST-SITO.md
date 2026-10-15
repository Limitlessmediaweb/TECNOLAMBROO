# Checklist per la messa online definitiva · 31 ottobre 2026

Analisi del 15 ottobre 2026 sul branch `modifiche-v2` (uguale a `main`). Le correzioni fatte oggi sono sul branch `fix/pre-lancio-31-10`.

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

| Area | Fatto oggi | P1 aperte | Chi le sblocca |
|---|---|---|---|
| Privacy e cookie | testi allineati a quello che il sito fa | 3 | consulente, papà |
| Sicurezza | header, HSTS, modulo preventivi | 3 | Riccardo |
| Prodotti e trattamenti | — | 5 | papà |
| Foto | — | 1–2 | Riccardo, papà |
| SEO base | favicon, sitemap, redirect del vecchio sito | 4 | Riccardo |
| Bug | 3 bug corretti | 2 | Riccardo |

**Percorso critico.** I dati di papà (tabelle, flange, WR-51 e WR-22) e il parere del consulente sono quello che richiede più tempo: chiediamoli per primi.

| Quando | Cosa |
|---|---|
| entro lunedì 20/10 | dati di papà (3.1–3.5), PEC (1.5), appuntamento col consulente (1.2–1.4), Resend e DNS (2.5) |
| 21–25/10 | foto (4.1–4.4); io integro foto e dati e rigenero le schede (3.6) |
| 27–29/10 | preview Vercel: CSP, build e test completi (2.4, 6.6), invio reale di prova |
| 30/10 | cambio DNS e variabili di produzione (5.4, 5.5, 6.4) |
| 31/10 | Search Console e Google Business (5.6, 5.7) |

---

## 1. Privacy e cookie

| # | Voce | Priorità | Min | Chi | Stato |
|---|---|---|---|---|---|
| 1.1 | Privacy e cookie policy citavano **Plausible** (mai attivo) invece di **Vercel Web Analytics**. Mancavano inoltre: lingua scelta, bozza del modulo, ultima richiesta inviata e provenienza della prima visita (pagina d'ingresso, referrer, UTM, gclid) salvate nel browser; i dati di provenienza che arrivano con la richiesta. Corretti in 5 lingue | — | 40 | Claude | ✅ fatto |
| 1.2 | **Revisione legale** di privacy, cookie policy e termini (almeno IT ed EN): basi giuridiche, conservazione (24 mesi, 10 anni, 12 mesi), fornitori USA (Vercel, Resend), foro di Pavia | P1 | 60 | Consulente | da fare |
| 1.3 | **Provenienza della prima visita** (UTM, referrer, gclid nel localStorage di tutti i visitatori): può restare senza consenso? Se no, l'alternativa senza banner è salvarla solo quando l'indirizzo contiene parametri UTM | P1 | 15 + 30 | Consulente → Claude | da decidere |
| 1.4 | La casella del modulo dice "acconsento al trattamento", ma la base giuridica dichiarata è la richiesta precontrattuale (art. 6.1.b), non il consenso. Se il consulente conferma, va riformulata in "Ho letto l'informativa" | P2 | 15 | Consulente → Claude | da decidere |
| 1.5 | **PEC:** footer e privacy riportano `tecnolambrosnc@pec.it` ("snc"), mentre la società è una S.a.s. Va confermato che sia l'indirizzo giusto e attivo | P1 | 5 | Papà | da fare |
| 1.6 | **Banner cookie:** oggi non serve. Ho verificato nel codice che il sito non ha cookie, i font sono ospitati sul sito e non ci sono Google Maps, YouTube né pixel; le statistiche Vercel non usano cookie. Va rifatto se si aggiungono Google Analytics, Ads, Meta Pixel o video incorporati | — | 0 | — | ✅ verificato |
| 1.7 | **File dei clienti su Vercel Blob** (oltre 4 MB): link pubblici, anche se non indovinabili, e mai cancellati, mentre la privacy promette 24 mesi. Due strade: (a) pulizia automatica mensile con un cron; io ci metto 45 minuti, a te serve impostare la variabile `CRON_SECRET`; (b) niente Blob, i file grandi arrivano via email | P2 | 50 | Riccardo decide → Claude | da decidere |
| 1.8 | Accordi sul trattamento dei dati (DPA) con Vercel e con Resend (o Aruba), da accettare nei rispettivi pannelli | P2 | 15 | Riccardo | da fare |
| 1.9 | Testi legali in spagnolo, cinese e tedesco da far rivedere a un madrelingua. Finché non sono rivisti restano in noindex | P3 | — | Traduttore | da fare |

## 2. Sicurezza

| # | Voce | Priorità | Min | Chi | Stato |
|---|---|---|---|---|---|
| 2.1 | **Header:** <ul><li>CSP minima applicata (niente iframe, plugin, `<base>` o form verso altri domini);</li><li>CSP completa in sola osservazione (`Report-Only`);</li><li>`Cross-Origin-Opener-Policy`;</li><li>`Permissions-Policy` aggiornata.</li></ul> | — | 30 | Claude | ✅ fatto |
| 2.2 | **HSTS:** tolti `includeSubDomains` e `preload`. `webmail.tecnolambro.it` (Aruba) risponde solo in HTTP: con l'impostazione precedente, dopo una visita al sito il browser l'avrebbe resa irraggiungibile | — | 10 | Claude | ✅ fatto |
| 2.3 | **Modulo preventivi:** <ul><li>accetta solo invii partiti dalle pagine del sito (prima chiunque poteva far partire da tecnolambro.it email di conferma verso indirizzi di terzi);</li><li>massimo 3 conferme all'ora allo stesso indirizzo;</li><li>timeout su Resend e SMTP.</li></ul> | — | 30 | Claude | ✅ fatto |
| 2.4 | **Provare la CSP completa sulla preview Vercel:** home, configuratore 3D, upload di un file oltre 4 MB, invio. Se la console non mostra violazioni "Report Only", la rendo applicata | P1 | 30 | Riccardo + Claude | da fare |
| 2.5 | **Email in produzione:** <ul><li>`RESEND_API_KEY` con il dominio verificato su Resend (record DNS su Aruba, vedi README);</li><li>oppure `SMTP_PASS` della casella info@;</li><li>poi un invio reale di prova (`docs/messa-online.md`).</li></ul> | P1 | 40 | Riccardo (password info@ da papà) | da fare |
| 2.6 | **Anti-spam vero:** il limite di invii è in memoria e vale solo per la singola istanza del server. Si risolve con Cloudflare Turnstile (gratuito, senza cookie di profilazione): tu crei l'account (10 min), io lo integro (50 min) | P2 | 60 | Riccardo → Claude | da fare |
| 2.7 | **Dipendenze:** `npm audit` non trova vulnerabilità in quelle che vanno online. Prima del lancio vanno aggiornate le patch (next 16.4.1, react 19.3.1, nodemailer 10.1.1, @vercel/blob 2.8.2) e rifatti build e test | P2 | 30 | Claude (serve la build, vedi 6.6) | da fare |
| 2.8 | 5 vulnerabilità "high" solo negli strumenti di sviluppo (`eslint-config-next` → `braces`): non finiscono nel sito e non c'è una versione corretta | P3 | 0 | — | da ignorare |
| 2.9 | **HTTPS:** il certificato lo emette Vercel da solo. Dopo il cambio DNS va verificato che `http://` porti a `https://` su tecnolambro.it e www | P1 | 5 | Riccardo | da fare |
| 2.10 | Autenticazione a due fattori su Vercel, GitHub, Aruba e Resend | P2 | 20 | Riccardo | da fare |
| 2.11 | Due repository GitHub (`TECNOLAMBROO` e `TECNOLAMBROOFFICIAL`) con lo stesso codice: scegli quello da collegare a Vercel e archivia l'altro | P3 | 5 | Riccardo | da fare |

## 3. Prodotti e trattamenti: pagine incomplete o vuote

| # | Pagina / voce | Cosa manca | Priorità | Min | Chi |
|---|---|---|---|---|---|
| 3.1 | `/prodotti/tabelle`, le 14 pagine WR e le 95 schede PDF | Valori delle tabelle (twistabile, seamless, dimensioni) trascritti a mano da un'immagine a bassa risoluzione: vanno verificati riga per riga | P1 | 45 | Papà |
| 3.2 | `/prodotti/guida-flessibile/wr-51` | **TLFX-180: tutte le dimensioni sono vuote** (A, B, C, D, P, r, R), anche nella scheda PDF | P1 | 5 | Papà |
| 3.3 | `/prodotti/guida-flessibile/wr-22` | TLFX-400: la vecchia tabella indicava una lunghezza massima di 3 piedi (circa 900 mm), mentre oggi il sito propone 1000 e 1200 mm standard e lunghezze libere fino a 3000 mm. Vale ancora il limite? | P1 | 5 | Papà |
| 3.4 | WR-34 e WR-159 | Mancano i codici TLFX (oggi "WR-34 flessibile twistabile") | P2 | 5 | Papà |
| 3.5 | Configuratore | Le flange per misura sono l'elenco standard IEC/EIA, "da confermare": serve l'elenco reale | P1 | 20 | Papà |
| 3.6 | Schede tecniche | Dopo 3.1–3.5 vanno rigenerati i 95 PDF (`npm run datasheets`) e committati | P1 | 15 | Claude |
| 3.7 | `/prodotti/curve`, `/twist`, `/disassati` | **Pagine deboli:** 3–4 righe di testo, nessuna tabella, nessuna foto. Spessore di parete e raggio di curvatura usati nel 3D e nei disegni sono indicativi. Servono il raggio minimo E/H e lo spessore standard per misura | P2 | 30 + 60 | Papà → Claude |
| 3.8 | **Trattamenti** | **Non esiste una pagina.** Oggi ci sono una riga ("brillantatura, verniciatura, trattamenti termici e galvanici") e un'opzione nel configuratore. Va deciso se farla, e con quali contenuti: quali trattamenti, su quali pezzi, argentatura, doratura, nichel… | P2 | 20 + 60 | Papà → Claude |
| 3.9 | Prodotti tolti nella v2 | Illuminatori d'antenna, transizioni, flange e kit di installazione, guida rigida, elettroformatura: oggi rimandano a `/prodotti`. Va confermato che non sono più a catalogo, oppure si rimettono aggiungendo solo i dati (`docs/aggiungere-prodotti.md`) | P2 | 15 | Papà |
| 3.10 | Quarta famiglia | Nascosta come "famiglia da definire": nome, testi, misure | P3 | 10 | Papà |
| 3.11 | `/qualita` | "Controllo elettrico e dimensionale su ogni pezzo" è generico: serve l'elenco di strumenti e parametri controllati | P3 | 10 | Papà |
| 3.12 | `/azienda` | Citazione del titolare (facoltativa) e date della storia dopo il 1987 | P3 | 10 | Papà |
| 3.13 | Configuratore | Opzioni extra del pezzo (es. rivestimento) e AR su Android | P3 | — | Papà |

## 4. Foto: dove servono foto vere

Le cartelle sono già pronte: i blocchi compaiono da soli quando ci sono i file, e senza foto non restano buchi.

**Formato:** JPG o WebP, lato lungo di almeno 2000 px, luce naturale, sfondo neutro. Nome del file con il reparto (es. `collaudo-1.jpg`).

| # | Dove | Cosa | Cartella | Priorità | Min | Chi |
|---|---|---|---|---|---|---|
| 4.1 | Pagine famiglia (galleria) e home | 3–6 foto per famiglia, a partire dalle due flessibili | `public/foto/prodotti/twistable/`, `seamless/`, `bends/`, `twists/`, `offsets/` | P1 | 90 + 20 | Riccardo scatta, papà sceglie i pezzi; Claude integra |
| 4.2 | `/azienda` e home, "Chi guida Tecnolambro" | Ritratto verticale di Marco Pasquini | `public/foto/persone/marco-pasquini.jpg` | P2 | 15 | Riccardo / papà |
| 4.3 | `/azienda`, "L'officina" | Almeno una foto per reparto: lavorazione, collaudo, magazzino | `public/foto/officina/` | P2 | 45 | Riccardo |
| 4.4 | Tutte le foto con persone | Liberatoria dei dipendenti riconoscibili (diritto all'immagine) | — | P1 se ci sono persone | 15 | Papà |
| 4.5 | Home | Oggi non c'è nessuna foto vera, solo render 3D. Quando arrivano 4.1 e 4.3 si sceglie l'immagine d'apertura | — | P2 | 15 | Claude |
| 4.6 | Spot video (fuori dal sito) | 4 riprese: officina, mani che assemblano, fresatura, collaudo | `video/spot-3d/riprese/` | P3 | — | Riccardo |

## 5. SEO base

| # | Voce | Priorità | Min | Chi | Stato |
|---|---|---|---|---|---|
| 5.1 | **Favicon e icona iPhone** ricavate dalla flangia del logo: prima `/favicon.ico` dava 404 e su Google compariva l'icona generica | — | 20 | Claude | ✅ fatto |
| 5.2 | Sitemap con `x-default` negli hreflang, come le pagine | — | 10 | Claude | ✅ fatto |
| 5.3 | **Vecchio sito su tecnolambro.com.** È un WordPress con le pagine demo del tema, ancora indicizzate (about, contact, articoli del 2020 sulle auto, categorie). Ogni vecchio indirizzo ora porta alla pagina nuova più vicina | — | 30 | Claude | ✅ fatto |
| 5.4 | `NEXT_PUBLIC_ALLOW_INDEXING=true` in Production. **Senza, robots.txt blocca tutto e ogni pagina è noindex** | P1 | 2 | Riccardo | da fare |
| 5.5 | **Domini:** tecnolambro.it come principale. Punta su Vercel anche tecnolambro.com e www.tecnolambro.com e imposta `CANONICAL_REDIRECT=true` (`docs/messa-online.md`). Va capito chi gestisce il DNS di tecnolambro.com. Spegni il WordPress solo dopo aver provato i redirect | P1 | 20 | Riccardo | da fare |
| 5.6 | **Google Search Console:** proprietà tecnolambro.it e tecnolambro.com, invio della sitemap, "Cambio di indirizzo" da .com a .it | P1 | 25 | Riccardo | da fare |
| 5.7 | **Scheda Google Business:** sito tecnolambro.it, orari (lun–ven 8–12 e 13:30–17:30), foto | P1 | 15 | Papà (accesso) + Riccardo | da fare |
| 5.8 | Coordinate della sede di Miradolo per i dati strutturati (`geo`) | P3 | 10 | Riccardo → Claude | da fare |
| 5.9 | Profili social (Instagram, Facebook, LinkedIn): link nel footer e `sameAs` nei dati strutturati | P3 | 15 | Riccardo → Claude | da fare |
| 5.10 | Immagine di anteprima (Open Graph) in cinese: il generatore non ha un font cinese, quindi probabilmente escono quadratini. Serve solo se `/zh` va online | P3 | 30 | Claude | da verificare |
| 5.11 | ES, ZH e DE restano in noindex finché un madrelingua non le rivede (`NEXT_PUBLIC_NEW_LOCALES_NOINDEX=true`) | P3 | — | Traduttore | come previsto |

## 6. Bug

| # | Voce | Priorità | Min | Chi | Stato |
|---|---|---|---|---|---|
| 6.1 | Errore in console di Chrome su ogni pagina: `Permissions-Policy` conteneva `interest-cohort`, che non esiste più | — | 5 | Claude | ✅ fatto |
| 6.2 | Privacy e cookie policy descrivevano Plausible invece di Vercel Analytics (vedi 1.1) | — | — | Claude | ✅ fatto |
| 6.3 | `.env.example` indicava tecnolambro.com, la tua Gmail come destinataria dei preventivi e la porta SMTP 587 (con `smtps.aruba.it` serve la 465): copiato su Vercel avrebbe mandato le richieste nel posto sbagliato | — | 15 | Claude | ✅ fatto |
| 6.4 | `NEXT_PUBLIC_DEMO`: se la variabile manca vale "true", e in produzione comparirebbe il badge "Versione demo". Va impostata a `false` su Vercel; in alternativa cambio io il valore predefinito | P1 | 2 | Riccardo | da fare |
| 6.5 | Errore JavaScript intermittente sulla home cinese ("Cannot read properties of undefined (reading 'end')"), visto 2 volte su 6 | P3 (P2 se `/zh` va online) | 45 | Claude | da fare |
| 6.6 | **Build e test non rifatti oggi.** Nel mio terminale il binario nativo di SWC non si carica (sandbox) e l'esecuzione fuori sandbox non è stata autorizzata. Type-check, lint e `i18n:check` passano. Prima del merge vanno lanciati `npm run verify`, `test:request`, `test:configurator`, `check:links` e `check:placeholders` | P1 | 25 | Riccardo (o Claude con il permesso) | da fare |
| 6.7 | Lighthouse mobile della home cinese: 77 (obiettivo 85) | P3 | 60 | Claude | da fare |
| 6.8 | Lighthouse accessibilità 97: misura il contrasto della tagline a metà animazione (axe, a pagina ferma, non trova problemi) | P3 | 20 | Claude | da fare |

---

## Cosa chiedere a papà (una sola volta, ~1 ora per le P1)

1. **PEC:** `tecnolambrosnc@pec.it` è giusta e attiva? (1.5)
2. **Tabelle** di `/prodotti/tabelle`: le controlla stampate e segna le correzioni. (3.1)
3. **WR-51 (TLFX-180):** dimensioni A, B, C, D, P, r, R. (3.2)
4. **WR-22 (TLFX-400):** vale ancora il limite di 3 piedi (circa 900 mm) di lunghezza? (3.3)
5. **Flange** realmente prodotte per ogni misura. (3.5)
6. **Liberatoria** per i dipendenti nelle foto. (4.4)
7. **Accesso** alla scheda Google Business e password della casella info@ (o accesso al pannello Aruba). (2.5, 5.7)

Per dopo (P2–P3):
- codici TLFX di WR-34 e WR-159;
- raggi di curvatura e spessore di parete;
- contenuti di una pagina Trattamenti;
- quali prodotti tolti nella v2 si vendono ancora;
- quarta famiglia, strumenti di collaudo, citazione e date della storia.

## Totali stimati

| Chi | P1 | Tutto |
|---|---|---|
| Papà | ~1 h 45 min | ~3 h 30 min |
| Riccardo | ~4 h (di cui 1 h 30 min di foto) | ~6 h |
| Claude | ~1 h 30 min (CSP, schede, foto, provenienza visite) | ~8 h 30 min |
| Consulente | 1 incontro (~1 h) | — |
