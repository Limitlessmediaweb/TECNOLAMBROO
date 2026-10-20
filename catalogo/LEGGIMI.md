# Catalogo prodotti e trattamenti

Tutto il catalogo del sito sta in **`catalogo/catalogo.csv`**. Le foto vanno in **`public/foto/<CODICE>/`**.

Il sito legge entrambi a ogni build e crea da solo:

- le pagine elenco, con filtri per categoria e ricerca: `/catalogo` e `/trattamenti`;
- una scheda per ogni riga: `/catalogo/fl-001`, `/trattamenti/brillantatura`;
- il menu, il footer e la sitemap;
- il link “Richiedi informazioni”, che apre il modulo contatti con il codice già scritto.

## Come caricare i dati

1. **Apri il CSV.** Apri `catalogo/catalogo.csv` con Excel (o LibreOffice). Il separatore è il punto e virgola.
2. **Scrivi le righe.** Una riga per ogni prodotto o trattamento, con lo `stato` a `pubblicato`. Cancella le due righe con stato `ESEMPIO`.
3. **Salva in UTF-8.** In Excel: *File → Salva con nome → CSV UTF-8*. Così le lettere accentate restano giuste.
4. **Metti le foto.** Vanno in `public/foto/<CODICE>/`: il nome della cartella è il codice esatto, maiuscole comprese.
   - Prodotti: `1.jpg`, `2.jpg`… (la prima è la copertina).
   - Trattamenti: `prima.jpg` e `dopo.jpg` (più coppie: `prima-2.jpg` e `dopo-2.jpg`), più altre foto con nomi liberi.
5. **Converti le foto e controlla.** Lancia `npm run foto`, che converte le foto in WebP leggere. Poi lancia `npm run catalogo:check`, che elenca cosa sistemare. Quando non ci sono errori, fai commit e push.

## Le colonne

I testi hanno una colonna per lingua: `_it`, `_en`, `_es`, `_zh`, `_de`.

- L'**italiano** è obbligatorio per il nome.
- Le lingue lasciate vuote mostrano l'inglese, e se manca anche quello l'italiano.

| Colonna | Prodotti | Trattamenti |
|---|---|---|
| `tipo` | `prodotto` | `trattamento` |
| `codice` | es. `FL-001`: solo lettere, numeri, `-` e `_`, senza spazi. È anche il nome della cartella foto | es. `BRILLANTATURA` |
| `stato` | `pubblicato` = online; `bozza` = solo nell'anteprima; `ESEMPIO` = riga di prova, da cancellare | come i prodotti |
| `nome_*` | nome del prodotto | nome del trattamento |
| `categoria_*` | per i filtri, es. “Guide d'onda flessibili”. Il filtro compare con almeno 2 categorie | es. “Galvanici” |
| `descrizione_*` | descrizione. Un a capo dentro la cella crea un nuovo paragrafo | che cos'è il trattamento |
| `materiale_*` | materiale del pezzo | materiali su cui si fa |
| `misure` | testo libero, es. `WR-90 · 22,86 × 10,16 mm` | — |
| `norma` | es. `IEC 60153-2` | — |
| `trattamenti` | codici dei trattamenti disponibili, separati da virgola: `VERNICIATURA, GALVANICI` | — |
| `uso_*` | — | a cosa serve |
| `famiglie` | — | facoltativo: famiglie del sito su cui si fa (`twistable, seamless, bends, twists, offsets`) |

Le celle che non servono si lasciano vuote. **Online un campo vuoto non si vede**: nessun “manca”, nessun buco.

## Regole utili

- **Righe da saltare.** Una riga che inizia con `#` viene ignorata: va bene per le note.
- **Punto e virgola nei testi.** Se un testo contiene un `;`, va tra virgolette. Excel lo fa da solo.
- **Righe con errori.** Una riga con un errore (codice doppio, tipo o stato sbagliato, colonne in più) **non va online**, ma il resto del sito sì. `npm run catalogo:check` dice quale riga sistemare.
- **Foto mancanti.** Senza foto la scheda mostra un riquadro neutro con il codice. Nella coppia prima/dopo il lato senza foto resta neutro.
- **Anteprima.** Bozze ed ESEMPIO si vedono solo in sviluppo (`npm run dev`) e nei deploy di preview di Vercel, con un badge giallo. Online non compaiono mai.
- **Codici nuovi in sviluppo.** Con `npm run dev`, dopo aver aggiunto un codice nuovo riavvia il server: altrimenti la sua scheda risponde 404. Testi e foto delle righe già presenti si aggiornano da soli.
- **Pagine vuote.** Finché non c'è nessun prodotto `pubblicato`, la pagina `/catalogo` non esiste: non compare nel menu e l'indirizzo risponde 404. Lo stesso vale per `/trattamenti`.
