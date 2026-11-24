# Fonti dei dati (documento interno, non pubblicato)

Da quale documento arriva ogni dato di `src/data`. Sono citati solo documenti di catalogo Tecnolambro
generici e documenti di norma. Aggiornato il 24/11/2026.

## `catalogo-ditta.ts`

| Dato | Fonte |
|---|---|
| `TFTG` (perdita, return loss a 600/900/1200 mm, potenza, raggi minimi, torsione, guaina, flange a catalogo) | `DATASHEET FLEX TWIST/DATASHEET FLEXTWIST EXAMPLE/TFTG-R<n>-WR<n>-WG<n>.pdf`, 10 file, tutte le pagine |
| `TFTG_LENGTHS`, `TFTG_PRESSURE` | gli stessi 10 file |
| `FLANGE_LETTER` (D, E, F, G) | confronto tra codice e flange scritte negli stessi file. H e I non confermate |
| `TLFX_SHEET` WR-90 | `DATASHEET FLEX/R100 Flessibile/TLFX-100.pdf` |
| `BENDS` | `DATASHEET CURVE …/Curve PE PH/`: `esempi gomito r100 wr90.pdf`, `TCE-120-50-GG.pdf`, `TCH-220-50-FG.pdf`, `TCH-260-50-GG.pdf`, `TCE-320-60-GG.pdf`, `TCH-320-40-FG.pdf`, `TCE-70-50-DE.pdf` |
| `COVERS` | `DATASHEET COPERTURE/Copertura … TCF100.pdf`, `TCF140`, `TCF320`, `TCF48` |
| `GASKETS` | `DATASHEET Guarnizioni/PDR 100 guarnizione.pdf`, `cpr90gfull.pdf`, `CPR284 FULL HALF.pdf` |
| `CAST_BEND_SIZES` | nomi delle cartelle `Cast bend/cast bend wr284` e `cast bend R40` (nessuna quota pubblicata) |

## `flanges.ts`

| Dato | Fonte |
|---|---|
| Quote di tutte le flange (lato, interassi, diametro dei fori, spessore) | SPINNER TD-00077 Issue G, solo come verifica di misure standard IEC / MIL / EIA |
| Numero di fori delle tonde UAR/PAR/CAR (8 per R32 e R48, 6 per R58) | IEC 60154-2 ed. 3.0 |
| Flange «consigliate» per la twistabile | famiglie a catalogo in `TFTG` |

## Verifiche fatte

- Bande di frequenza dei datasheet TFTG uguali a quelle di `waveguides.ts` per tutte le 10 misure.
- TLFX-32 (WR-284): quote del disegno della guida nuda A 79,9 · B 39,4 · C 73,5 · D 33,1 · P 3,3; il sito ha B 39,2.
- TLFX-48 (WR-187): il disegno dice A 54,2 · B 26,3 · C 48,5 · D 20,7 · P 2,8; il sito ha 54,4 · 26,7 · 48 · 20,4 · 2,5. Da chiarire con l'ufficio tecnico: i valori del sito non sono stati cambiati.

## Dati che mancano (sul sito: «su richiesta»)

- Dati elettrici della twistabile per WR-22, WR-159, WR-229, WR-284.
- Dati elettrici della seamless montata (tutte le misure tranne WR-90 nuda).
- Twist rigidi e disassati: nessun datasheet leggibile.
- Cast bend: nessuna quota pubblicabile.
- Guarnizioni e coperture: solo i codici elencati sopra.
