# Pubblicare tecnolambro.it (≈ 10 minuti + attesa DNS)

Preparato il 30/10/2026. Progetto Vercel: **`tecnolambroooo`** (team limitlessmediaweb), repository GitHub **`TECNOLAMBROO`** (remote `nuovo` nel PC).
Oggi tecnolambro.it mostra "Sito in costruzione" di Aruba (IP `31.11.36.13`).

> Prima di iniziare: in `MANCA-PER-ONLINE.md` le voci **BLOCCANTI** devono essere chiuse (soprattutto PEC e un invio email di prova).

## 0. Cosa c'è oggi nei DNS (letti il 30/10, server Aruba/Technorail)

| Tipo | Nome | Valore | Cosa fare |
|---|---|---|---|
| A | `@` | `31.11.36.13` | **cambia** |
| AAAA | `@` | `2a00:6d40:4:1::c322:13` | **cancella** (Vercel non usa IPv6: se resta, chi naviga in IPv6 vede ancora Aruba) |
| A / AAAA | `www` | `31.11.36.13` / `2a00:6d40:4:1::c322:13` | **cancella entrambi** e crea il CNAME |
| MX | `@` | `mx.tecnolambro.it` (10) | **NON toccare** (email) |
| TXT | `@` | `v=spf1 include:_spf.aruba.it ~all` | **NON toccare** |
| TXT | `_dmarc` | `v=DMARC1; p=none; …` | **NON toccare** |
| — | `mx`, `webmail`, `smtp`, `pop`, `imap`… | Aruba | **NON toccare** |

Fai uno screenshot della pagina DNS di Aruba **prima** di modificare: è il tuo backup per tornare indietro.

## 1. Mettere online il codice (2 min)

Il branch `main` è già unito in locale (30/10) ma **non è su GitHub**, apposta: il push su `main` pubblica in produzione su `tecnolambroooo.vercel.app`.

```bash
cd "C:/Users/ricca/Desktop/SITI WEB/tecnolambro-site"
git checkout main
git merge --ff-only pronto-online-30-10
git push nuovo main
git push origin main
```

Aspetta il deploy "Ready" su Vercel → tecnolambroooo → Deployments.

## 2. Variabili di Production su Vercel (3 min)

Vercel → **tecnolambroooo → Settings → Environment Variables**, ambiente **Production**:

| Variabile | Valore |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://tecnolambro.it` |
| `NEXT_PUBLIC_DEMO` | `false` |
| `NEXT_PUBLIC_ALLOW_INDEXING` | `true` |
| `CANONICAL_REDIRECT` | `true` |
| `REDIRECT_HOSTS` | `www.tecnolambro.it,tecnolambroooo.vercel.app` (aggiungi `tecnolambro.com,www.tecnolambro.com` solo quando anche il .com punta a Vercel) |
| `QUOTE_TO_EMAIL` | `info@tecnolambro.it` |
| `QUOTE_FROM_EMAIL` | `Tecnolambro <info@tecnolambro.it>` |
| `RESEND_API_KEY` **oppure** `SMTP_HOST=smtps.aruba.it`, `SMTP_PORT=465`, `SMTP_USER=info@tecnolambro.it`, `SMTP_PASS` | email dei preventivi |
| `BLOB_READ_WRITE_TOKEN` | Vercel → Storage → Blob (per allegati oltre 4 MB) |

Poi **Deployments → ultimo deploy di main → ⋯ → Redeploy**.

## 3. Aggiungere il dominio su Vercel (1 min)

Vercel → **tecnolambroooo → Settings → Domains → Add**:
1. `tecnolambro.it` → Production.
2. `www.tecnolambro.it` → **Redirect to `tecnolambro.it`** (308).

Vercel dirà "Invalid configuration": è normale finché non cambi i DNS.

## 4. DNS su Aruba (3 min)

**admin.aruba.it → Hosting/Domini → tecnolambro.it → Gestione DNS e name server → Gestisci DNS** (pannello "Gestione record DNS").

| Azione | Tipo | Nome | Valore esatto | TTL |
|---|---|---|---|---|
| modifica | **A** | `@` / `tecnolambro.it` | **`216.198.79.1`** | 3600 (o il minimo disponibile) |
| cancella | AAAA | `@` | `2a00:6d40:4:1::c322:13` | — |
| cancella | A e AAAA | `www` | `31.11.36.13`, `2a00:…:13` | — |
| crea | **CNAME** | `www` | **`7f09ac46c9fb750b.vercel-dns-017.com.`** | 3600 |

Valori presi dall'API di Vercel per questo progetto il 30/10. Se il pannello Domains di Vercel mostra valori diversi, **vincono quelli di Vercel**. Alternative accettate da Vercel: A `76.76.21.21`, CNAME `cname.vercel-dns.com`.

Se Aruba non permette di modificare il record A perché il dominio ha un "hosting attivo", usa l'opzione **"Puntamento a server esterno / modifica DNS avanzata"**: l'hosting e le caselle email restano attivi.

## 5. Verifica (5–60 min dopo)

1. Propagazione, da un terminale:
   ```bash
   nslookup tecnolambro.it 8.8.8.8
   nslookup www.tecnolambro.it 8.8.8.8
   ```
   Deve rispondere `216.198.79.1` e il CNAME `…vercel-dns-017.com`, **senza** indirizzi `2a00:6d40…`.
2. Vercel → Domains: entrambi con la spunta blu "Valid Configuration". Il certificato HTTPS lo emette Vercel da solo (di solito entro pochi minuti).
3. **HTTPS**, da un terminale:
   ```bash
   curl -sI http://tecnolambro.it
   curl -sI https://www.tecnolambro.it
   curl -sI https://tecnolambro.it
   ```
   Attesi: `http://` → **308** verso `https://tecnolambro.it/`; `www` → **308** verso `https://tecnolambro.it/`; l'ultimo → **200** con `strict-transport-security`. Nel browser: lucchetto chiuso, certificato "R11/R10 Let's Encrypt" o "Vercel".
4. `https://tecnolambro.it/robots.txt` deve contenere `Allow: /` e la riga `Sitemap:` (se c'è `Disallow: /` manca `NEXT_PUBLIC_ALLOW_INDEXING=true`).
5. Nessun badge giallo "Versione demo" / "[DA COMPLETARE]" sulle pagine.
6. **Email**: invia una richiesta vera dal modulo `/shop/richiesta` e una da `/contatti` → arrivano a info@ con allegati, e al cliente arriva la conferma.
7. **Email aziendale ancora viva**: manda una mail a info@tecnolambro.it da Gmail e apri `http://webmail.tecnolambro.it`.

## 6. Dopo (stesso giorno o lunedì)

- **Google Search Console**: proprietà "Dominio" `tecnolambro.it` (record TXT su Aruba), invia `https://tecnolambro.it/sitemap.xml`.
- **Google Business**: sito `https://tecnolambro.it`.
- Vercel → **Analytics → Enable** (parte solo dopo il consenso cookie).
- Archivia i progetti Vercel doppioni (`tecnolambro`, `tecnolambro0`, `tecnolambroo`, `tecnolambrooo`, `tecnolambroofficial`) per non confondersi.

## Tornare indietro (2 min)

Su Aruba rimetti A `@` = `31.11.36.13`, AAAA `@` = `2a00:6d40:4:1::c322:13`, e per `www` di nuovo A/AAAA uguali (togli il CNAME). Torna "Sito in costruzione". L'email non è mai coinvolta.
