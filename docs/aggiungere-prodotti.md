# Aggiungere una famiglia di prodotti

Una famiglia nuova si aggiunge **solo con dati**: non serve toccare i componenti. La pagina della famiglia, la card in home e in `/prodotti`, la sitemap, il disegno, la demo 3D e la richiesta di preventivo si generano da soli.

## I passi

### 1. Una voce in `src/data/families.ts`

Aggiungi un oggetto all'elenco `FAMILIES`:

| Campo | Cosa mettere |
|---|---|
| `key` | identificativo breve in inglese, senza spazi (es. `"transitions"`). È anche il nome della cartella delle foto |
| `slug` | indirizzo della pagina in italiano e in inglese (es. `{ it: "transizioni", en: "transitions" }`) |
| `partType` | il tipo del configuratore se il pezzo si compone (`"twistable"`, `"seamless"`, `"bend"`, `"twist"`, `"offset"`), altrimenti `null` |
| `model3d` | il 3D dimostrativo della pagina: un tipo del configuratore, `"straight"` (tratto rigido con flange, per le famiglie senza configuratore) o `null` (nessun 3D). Se lo ometti vale `partType` |
| `hidden` | `true` finché la famiglia non è pronta: non compare da nessuna parte |
| `table` | `"twist"` o `"seamless"` se ha una tabella elettrica in `src/data/waveguides.ts`, altrimenti `null` |
| `drawing` | il disegno a linee: `"flexible"`, `"bend"`, `"twist"` o `"offset"` |
| `sizes` | le misure disponibili, es. `WR_LIST` (tutte e 14) oppure `["WR-75", "WR-90"]` |

### 2. I testi in `messages/*.json`

Sotto `products.items.<key>`, in tutte e 5 le lingue (`it`, `en`, `es`, `zh`, `de`; `npm run i18n:check` segnala quelle mancanti):

```json
"transitions": {
  "name": "Transizioni guida–coassiale",
  "short": "Dalla guida d’onda al connettore coassiale.",
  "description": "Transizioni da guida d’onda rigida a connettore coassiale, nella misura e con la flangia che vi servono.",
  "applications": ["Banchi di misura", "Collegamento ad apparati coassiali"]
}
```

Solo dati veri forniti dal titolare: niente numeri o clienti inventati.

### 3. Le foto (facoltative)

Copia le foto in `public/foto/prodotti/<key>/`. Il primo file, in ordine alfabetico, diventa l'immagine della card e la foto grande della galleria. Senza foto la card usa la miniatura 3D (`public/render/`) o il disegno, e la galleria non compare.

### 4. Build

`npm run build`. La famiglia è online alla pubblicazione successiva.

## Cosa succede da solo

- **Con configuratore** (`partType` impostato): pulsante "Componi…" nella pagina, demo 3D personalizzabile, prodotti pronti, link condivisibile.
- **Senza configuratore** (`partType: null`): la pagina mostra il pulsante "Richiedi <nome>". Il pulsante aggiunge a "La tua richiesta" una voce su disegno già intitolata con il nome della famiglia; il cliente aggiunge descrizione e file.
- **Modello 3D `"straight"`**: tratto rigido con flange nella misura WR-90, ruotabile e con il disegno, senza link al configuratore.

## Esempio completo

In `src/data/families.ts`:

```ts
{
  key: "transitions",
  slug: { it: "transizioni", en: "transitions" },
  partType: null,
  model3d: "straight",
  hidden: false,
  table: null,
  drawing: "twist",
  sizes: ["WR-62", "WR-75", "WR-90", "WR-112"],
},
```

Poi aggiungi i testi del passo 2 in tutte le lingue, copia le foto in `public/foto/prodotti/transitions/` e fai la build.

## Catalogo e trattamenti (pagine /catalogo e /trattamenti)

Schede prodotto e trattamenti si caricano da **`catalogo/catalogo.csv`** (separatore `;`), con le foto in `public/foto/<CODICE>/`. Istruzioni complete e colonne: **[catalogo/LEGGIMI.md](../catalogo/LEGGIMI.md)**. Controllo: `npm run catalogo:check`.

Finché non c'è almeno una riga `pubblicato` del tipo giusto, `/catalogo` e `/trattamenti` non esistono (404, fuori da menu e sitemap). I quattro trattamenti già citati nel sito (brillantatura, verniciatura, termici, galvanici) sono le prime righe pubblicate: prima stavano in `src/data/treatments.ts`, che non esiste più.

## Raggio minimo e spessore delle guide rigide

Curve, twist e disassati hanno una tabella "Dati per misura" alimentata da `src/data/rigid.ts`, con una riga per misura (`minRadiusE`, `minRadiusH`, `wall`, in millimetri).

```ts
"WR-90": { minRadiusE: 25, minRadiusH: 40, wall: 1.27 },
```

- **Quali righe e colonne si vedono:** le colonne tutte `null` non compaiono, e nemmeno le misure senza nessun valore. Se è tutto `null` la tabella non c'è.
- **Effetto sul 3D e sui disegni:** lo spessore reale sostituisce quello indicativo. Il raggio "standard" non scende sotto il raggio minimo inserito.
- **Schede tecniche:** dopo la modifica rigenera le schede PDF con `npm run datasheets`.

## Un tipo nuovo nel configuratore

Serve quando un pezzo ha una geometria che il configuratore non conosce ancora. Questo lavoro tocca il codice:

1. il tipo e le opzioni in `src/data/configurator/types.ts` e `defaults.ts`;
2. il percorso 3D in `src/lib/part3d.ts` (`pathFor`);
3. la vista laterale in `src/lib/drawing.ts`;
4. i testi `configurator.types.<tipo>` nei due file di traduzione;
5. un caso in `scripts/configurator-e2e.mjs`.
