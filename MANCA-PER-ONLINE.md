# Cosa manca per mettere online tecnolambro.it

Aggiornato la notte del 30/10/2026 dopo il controllo completo (dettagli in fondo). Fonte unica per il lancio; la storia delle voci è in `CHECKLIST-SITO.md`.

**In una riga:** il sito è tecnicamente pronto (test verdi, nessun segnaposto visibile, nessun link rotto, mobile e desktop a posto). Per andare online nel weekend servono **4 cose** (sezione A): PEC confermata, email dei preventivi funzionante, le tabelle WR controllate da papà e il tuo ok sul "senza foto vere". Tutto il resto si può aggiungere dopo, il sito resta pulito anche senza.

Legenda: 👨 **papà** (dato o accesso aziendale) · 🙋 **Riccardo** (lo fai tu) · ⚖️ **consulente** · 🤖 **Claude** (lo faccio io quando arriva il dato)

---

## A. BLOCCANTI per il weekend

| # | Cosa | Chi | Tempo | Perché blocca |
|---|---|---|---|---|
| A1 | **PEC**: il sito mostra `tecnolambrosnc@pec.it` ("snc"), ma la società è una **S.a.s.**. È giusta e attiva? | 👨 | 1 min | È nel footer, in privacy e termini: un dato legale sbagliato non va pubblicato. Si cambia in un punto: `PEC` in `src/data/site.ts` |
| A2 | **Email dei preventivi**: password della casella `info@tecnolambro.it` (SMTP Aruba) **oppure** account Resend con dominio verificato | 👨 password → 🙋 la metti su Vercel | 10 min | Senza, i moduli "Richiedi preventivo" e "Contatti" non spediscono niente. Variabili in `PUBBLICARE-TECNOLAMBRO.md` §2 |
| A3 | **Invio di prova reale** dopo A2: una richiesta dal configuratore e una da Contatti, verificare che arrivino a info@ con allegati e che il cliente riceva la conferma | 🙋 | 5 min | Unico pezzo non testabile stanotte (test fatti in modalità prova, vedi sotto) |
| A4 | **Tabelle tecniche** (`/prodotti/tabelle`, 14 pagine WR, 95 schede PDF): i valori sono trascritti a mano da un'immagine a bassa risoluzione. Papà le controlla stampate e segna le correzioni | 👨 → 🤖 | 45 min + 15 | Sono dati tecnici che un cliente usa per ordinare. Se non si fa in tempo: pubblicare lo stesso, la nota "Dati indicativi: i valori definitivi sono nel preventivo" è già su tabelle e PDF (**decidi tu**) |
| A5 | **WR-51 (TLFX-180)**: tutte le dimensioni vuote (A, B, C, D, P, r, R) | 👨 → 🤖 | 5 min | Oggi la riga c'è ma senza misure. Alternativa per il weekend: nascondo WR-51 finché non arrivano (dimmelo) |
| A6 | **WR-22 (TLFX-400)**: vale ancora il limite di 3 piedi (~900 mm)? Il sito propone fino a 1200 mm e lunghezze libere fino a 3000 | 👨 → 🤖 | 2 min | Rischio di preventivi su pezzi che non fate |

## B. Da fare prima o subito dopo il lancio (non bloccano)

| # | Cosa | Chi | Note |
|---|---|---|---|
| B1 | **Revisione legale** di privacy, cookie e termini (IT ed EN) | ⚖️ | Testi già allineati a quello che il sito fa davvero (banner cookie con consenso preventivo, nessun cookie senza consenso: testato). Basi giuridiche, conservazione, fornitori USA (Vercel, Resend), foro di Pavia da far confermare |
| B2 | **Flange** realmente prodotte per ogni misura (oggi l'elenco standard UBR, PBR, PDR, UDR, CPR con "altre flange su richiesta") | 👨 → 🤖 | 20 min |
| B3 | **Foto vere** dei prodotti: 3–6 per famiglia, partendo dalle due flessibili | 🙋 scatti, 👨 sceglie i pezzi → 🤖 | Oggi solo render 3D: il sito è completo e pulito, i riquadri foto si attivano da soli quando metti i file e lanci `npm run foto`. Cartelle in `SEGNAPOSTI.md` |
| B4 | **Foto dell'officina** (lavorazione, collaudo, magazzino) e **ritratto di Marco Pasquini** | 🙋 + 👨 | Liberatoria dei dipendenti riconoscibili (👨) |
| B5 | **Trattamenti** (brillantatura, verniciatura, termici, galvanici): che cosa sono, a cosa servono, su quali materiali, foto prima/dopo | 👨 → 🤖 | Le 4 pagine online mostrano solo i testi già presenti sul sito; i campi vuoti non si vedono |
| B6 | **Schede delle famiglie**: materiale della guida rigida e delle flange, VSWR e perdite, raggi minimi E/H, spessori, disassamenti | 👨 → 🤖 | 53 voci, elenco completo in `SEGNAPOSTI.md` (da stampare e dare a papà) |
| B7 | **Google Search Console** (proprietà tecnolambro.it, sitemap) e **scheda Google Business** con il nuovo sito | 🙋 (+ 👨 accesso Business) | Passi in `PUBBLICARE-TECNOLAMBRO.md` §6 |
| B8 | **Vecchio tecnolambro.com** (WordPress con pagine demo ancora su Google): puntarlo su Vercel; i redirect pagina per pagina sono già pronti | 🙋 | Accesso al DNS di tecnolambro.com |
| B9 | **Anti-spam** vero sui moduli (Cloudflare Turnstile, gratis) | 🙋 account → 🤖 1 h | Oggi c'è un limite di invii per istanza: basta per partire |
| B10 | **Allegati oltre 4 MB** (Vercel Blob): pulizia automatica o niente Blob | 🙋 decide → 🤖 | La privacy promette 24 mesi |
| B11 | 2FA e DPA su Vercel, Resend, GitHub, Aruba | 🙋 | 20 min |
| B12 | **Troppi progetti Vercel** sullo stesso sito (`tecnolambro`, `tecnolambro0`, `tecnolambroo`, `tecnolambrooo`, `tecnolambroooo`, `tecnolambroofficial`): tenere solo `tecnolambroooo` | 🙋 | Dopo il lancio |

## C. Dopo (P3)

| Cosa | Chi |
|---|---|
| Quarta famiglia di prodotto (oggi nascosta), prodotti tolti a ottobre (illuminatori, transizioni, flange e kit, rigida dritta, elettroformatura): si vendono ancora? | 👨 |
| Strumenti e parametri di collaudo per `/qualita`, citazione del titolare e date della storia per `/azienda` | 👨 |
| Codici TLFX di WR-34 e WR-159 | 👨 |
| Traduzioni ES, ZH, DE riviste da madrelingua (finché no restano online ma in noindex) | traduttore |
| Profili social nel footer, coordinate GPS della sede | 🙋 → 🤖 |
| Lo spot del lancio dice "Dal 1986", il sito dice "dal 1987" (come la ragione sociale): quale è giusto? | 👨 |

---

## Da chiedere a papà (stampabile, ~1 ora)

1. La PEC è `tecnolambrosnc@pec.it`? È attiva? (A1)
2. La password della casella info@tecnolambro.it, oppure l'accesso al pannello Aruba. (A2)
3. Controllare le tabelle stampate di `/prodotti/tabelle` e segnare le correzioni. (A4)
4. WR-51 / TLFX-180: dimensioni A, B, C, D, P, r, R. (A5)
5. WR-22 / TLFX-400: vale ancora il massimo di 3 piedi? (A6)
6. Quali flange fate davvero per ogni misura. (B2)
7. Firmare/far firmare la liberatoria per le foto con persone. (B4)
8. Accesso alla scheda Google Business. (B7)
9. 1986 o 1987? (C)
10. Per l'Hub: i nomi e le email di chi lo usa in ufficio, e le postazioni dell'officina (`tecnolambro-hub/account/LEGGIMI.md`).

Poi, con calma: il foglio `SEGNAPOSTI.md` (trattamenti, materiali, misure).

## Cosa posso fare io (🙋) senza papà

- Mettere le variabili su Vercel e collegare il dominio: `PUBBLICARE-TECNOLAMBRO.md` (10 min).
- Scattare le foto in officina (B3, B4) e lanciare `npm run foto`.
- Search Console, account Resend o Turnstile, 2FA, archiviare i progetti Vercel doppi.

---

## Controllo del 30/10/2026 (build di produzione, `NEXT_PUBLIC_DEMO=false`)

| Controllo | Esito |
|---|---|
| Merge dei 27 commit (`notte-18-10`, `fix/pre-lancio-31-10`, `catalogo-20-10`, `prodotti-23-10`) su `main` | ✅ fast-forward, **nessun conflitto**, niente perso. `main` unito in locale, **non pushato** (il push su `main` pubblica in produzione) |
| `npm run verify` (lint, build, alt delle immagini) | ✅ |
| Pagine prodotti: 5 famiglie, tabelle, 14 pagine WR, `/shop`, `/su-misura` · trattamenti: elenco + 4 schede · `/catalogo` (compare col primo prodotto pubblicato) | ✅ tutte presenti e 200 |
| Privacy, cookie, termini in 5 lingue; banner cookie con "Accetta"/"Rifiuta" e nessun cookie né statistica prima del consenso (`test:consent`) | ✅ |
| Moduli (`test:request`): richiesta dal configuratore con 3 pezzi e file, modulo breve con allegato, errore del server con dati conservati, anti-spam, email a info@ e conferma al cliente | ✅ in modalità prova (email non spedite davvero: A2–A3) |
| Configuratore 3D, PDF, STL, GLB (`test:configurator`) | ✅ |
| Segnaposto e note interne (`check:placeholders`): 192 pagine, 5 lingue | ✅ nessuno visibile |
| Link interni (`check:links`): 594 pagine | ✅ nessun link rotto |
| Traduzioni (`i18n:check`) | ✅ 0 errori |
| Larghezze 375, 390, 414, 430 e 1440 px su 23 pagine (`scripts/check-larghezze.mjs`) | ✅ nessuno scorrimento orizzontale, nessun 404, nessun errore JS (dopo le correzioni sotto) |
| Lighthouse mobile | ✅ 90–93 calibrato (tabella sotto) |

**Corretto stanotte (branch `pronto-online-30-10`):**
1. Sulle pagine inglesi (e nelle altre lingue) il banner "Passa all'italiano" faceva **~200 richieste al secondo in loop** (prefetch della pagina italiana): consumo di banda e batteria su telefono. Tolto il prefetch dai link di cambio lingua.
2. Errore JavaScript intermittente "Cannot read properties of undefined (reading 'end')" (voce 6.8 della checklist, soprattutto `/zh`): le animazioni allo scroll con `once: true` si cancellavano durante il ricalcolo di GSAP. Ora si animano una volta senza cancellarsi: 0 errori su 80 caricamenti (prima 5–9).
3. **Lighthouse della home sceso da 91 a 85** dopo il banner cookie del 18/10: l'elemento più grande dello schermo (LCP) era il testo del banner, che compariva solo dopo il caricamento del JavaScript. Ora il banner è già nell'HTML (chi ha già scelto non lo vede nemmeno per un istante): home di nuovo a **90**.

### Lighthouse mobile (30/10, build di produzione, mediana di 3 giri)

Stanotte il PC era circa 3 volte più lento del 15/10 (indice di Lighthouse ~1300 contro 3547, probabilmente risparmio energetico). Per confrontare i numeri con il 15/10 ho ricalibrato la CPU simulata (`CPU_SLOWDOWN=1.4`, stesso telefono di riferimento: Moto G Power, 4G lento). Riporto anche il valore "grezzo" del PC così com'era.

| Pagina | Performance (calibrata) | Grezza, PC lento | Accessibilità | Best practice | SEO | LCP |
|---|---|---|---|---|---|---|
| `/` | **90** | 77 | 100 | 100 | 100 | 3,6 s |
| `/en` | **90** | 78 | 100 | 100 | 100 | 3,6 s |
| `/prodotti` | **91** | 79 | 100 | 100 | 100 | 3,5 s |
| `/prodotti/guida-flessibile-twistabile` | **91** | — | 100 | 100 | 100 | 3,5 s |
| `/prodotti/guida-flessibile/wr-90` | **92** | — | 100 | 100 | 100 | 3,3 s |
| `/trattamenti` | **93** | 82 | 100 | 100 | 100 | 3,3 s |
| `/shop` | **90** | 77 | 100 | 100 | 100 | 3,7 s |
| `/contatti` | **92** | 82 | 100 | 100 | 100 | 3,4 s |

(twistabile e WR-90 misurate prima della correzione 3, quindi con il banner in ritardo.) **Obiettivo > 85 raggiunto su tutte le pagine nella misura calibrata.** La conferma definitiva è PageSpeed Insights sul sito vero, appena è online (`https://pagespeed.web.dev/?url=https://tecnolambro.it`): l'anteprima Vercel è dietro login e non si può misurare da fuori.
