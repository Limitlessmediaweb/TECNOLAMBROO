# Segnaposti da completare: prodotti e trattamenti

Generato con `npm run segnaposti` il 22/10/2026: **53 voci** in 9 schede.

Ogni voce corrisponde a un segnaposto giallo **[DA COMPLETARE – foto/scheda]** che si vede nell'anteprima del sito (`NEXT_PUBLIC_DEMO=true`).
Nella versione pubblica i segnaposto non compaiono: il campo resta nascosto finché non arriva il dato vero.

**Come consegnare:**
- **Foto.** Orizzontali, lato lungo di almeno 2000 px, pezzo intero su fondo neutro, più un dettaglio.
  Vanno nella cartella indicata, poi si lancia `npm run foto`.
- **Schede.** Basta il dato scritto, anche a mano o in una foto del documento.
  Le inserisce Riccardo in `messages/it.json` o in `catalogo/catalogo.csv`.

## Guida d’onda flessibile twistabile

_pagina /prodotti/guida-flessibile-twistabile · testi in messages/*.json → products.items.twistable_

- [ ] 📷 Foto reali del prodotto: nessuna. Cartella: public/foto/prodotti/twistable/ (es. intero-1.jpg, dettaglio-flangia-1.jpg, lavorazione-1.jpg).
- [ ] 📝 **Caratteristiche tecniche:** dimensioni di WR-51 (TLFX-180) e codici TLFX di WR-34 e WR-159
- [ ] 📝 **Caratteristiche tecniche:** raggio minimo di curvatura e torsione massima per misura
- [ ] 📝 **Caratteristiche tecniche:** WR-22: vale ancora il limite di lunghezza di 3 piedi?
- [ ] 📝 **Caratteristiche tecniche:** elenco delle flange disponibili per ogni misura (oggi il configuratore propone UBR, PBR, PDR, UDR e CPR: da confermare)
- [ ] 📝 **Materiali:** materiale delle flange
- [ ] 📝 **Materiali:** guarnizioni e rivestimento esterno: ci sono? di che materiale?

## Guida d’onda flessibile seamless

_pagina /prodotti/guida-flessibile-seamless · testi in messages/*.json → products.items.seamless_

- [ ] 📷 Foto reali del prodotto: nessuna. Cartella: public/foto/prodotti/seamless/ (es. intero-1.jpg, dettaglio-flangia-1.jpg, lavorazione-1.jpg).
- [ ] 📝 **Caratteristiche tecniche:** VSWR, attenuazione e potenze di WR-34 e WR-159
- [ ] 📝 **Caratteristiche tecniche:** come si piega (piani E e H, torsione) e raggio minimo
- [ ] 📝 **Caratteristiche tecniche:** elenco delle flange disponibili per ogni misura (oggi il configuratore propone UBR, PBR, PDR, UDR e CPR: da confermare)
- [ ] 📝 **Materiali:** materiale del corpo e della guaina della seamless
- [ ] 📝 **Materiali:** materiale delle flange

## Curve

_pagina /prodotti/curve · testi in messages/*.json → products.items.bends_

- [ ] 📷 Foto reali del prodotto: nessuna. Cartella: public/foto/prodotti/bends/ (es. intero-1.jpg, dettaglio-flangia-1.jpg, lavorazione-1.jpg).
- [ ] 📝 **Caratteristiche tecniche:** raggio minimo di curvatura nei piani E e H per ogni misura
- [ ] 📝 **Caratteristiche tecniche:** spessore di parete della guida rigida per ogni misura
- [ ] 📝 **Caratteristiche tecniche:** VSWR e perdite tipiche
- [ ] 📝 **Caratteristiche tecniche:** elenco delle flange disponibili per ogni misura (oggi il configuratore propone UBR, PBR, PDR, UDR e CPR: da confermare)
- [ ] 📝 **Materiali:** materiale della guida rigida (ottone? rame? alluminio?)
- [ ] 📝 **Materiali:** materiale delle flange

## Twist

_pagina /prodotti/twist · testi in messages/*.json → products.items.twists_

- [ ] 📷 Foto reali del prodotto: nessuna. Cartella: public/foto/prodotti/twists/ (es. intero-1.jpg, dettaglio-flangia-1.jpg, lavorazione-1.jpg).
- [ ] 📝 **Caratteristiche tecniche:** lunghezza standard del twist per ogni misura
- [ ] 📝 **Caratteristiche tecniche:** spessore di parete della guida rigida per ogni misura
- [ ] 📝 **Caratteristiche tecniche:** VSWR e perdite tipiche
- [ ] 📝 **Caratteristiche tecniche:** elenco delle flange disponibili per ogni misura (oggi il configuratore propone UBR, PBR, PDR, UDR e CPR: da confermare)
- [ ] 📝 **Materiali:** materiale della guida rigida (ottone? rame? alluminio?)
- [ ] 📝 **Materiali:** materiale delle flange

## Disassati

_pagina /prodotti/disassati · testi in messages/*.json → products.items.offsets_

- [ ] 📷 Foto reali del prodotto: nessuna. Cartella: public/foto/prodotti/offsets/ (es. intero-1.jpg, dettaglio-flangia-1.jpg, lavorazione-1.jpg).
- [ ] 📝 **Caratteristiche tecniche:** disassamento minimo e massimo per ogni misura
- [ ] 📝 **Caratteristiche tecniche:** spessore di parete della guida rigida per ogni misura
- [ ] 📝 **Caratteristiche tecniche:** VSWR e perdite tipiche
- [ ] 📝 **Caratteristiche tecniche:** elenco delle flange disponibili per ogni misura (oggi il configuratore propone UBR, PBR, PDR, UDR e CPR: da confermare)
- [ ] 📝 **Materiali:** materiale della guida rigida (ottone? rame? alluminio?)
- [ ] 📝 **Materiali:** materiale delle flange

## Trattamento: Brillantatura (BRILLANTATURA)

_pagina /trattamenti/brillantatura · riga 4 di catalogo/catalogo.csv_

- [ ] 📷 Foto: coppia prima/dopo (prima.jpg e dopo.jpg: stesso pezzo, stessa inquadratura, prima e dopo il trattamento); almeno una foto del trattamento o del pezzo trattato. Cartella: public/foto/BRILLANTATURA/.
- [ ] 📝 **Descrizione:** Brillantatura: che cos’è e come si fa, in 2-3 frasi
- [ ] 📝 **A cosa serve:** Brillantatura: a cosa serve sulle guide d’onda
- [ ] 📝 **Materiali su cui si fa:** Brillantatura: su quali altri materiali si fa, oltre all’ottone

## Trattamento: Verniciatura (VERNICIATURA)

_pagina /trattamenti/verniciatura · riga 5 di catalogo/catalogo.csv_

- [ ] 📷 Foto: coppia prima/dopo (prima.jpg e dopo.jpg: stesso pezzo, stessa inquadratura, prima e dopo il trattamento); almeno una foto del trattamento o del pezzo trattato. Cartella: public/foto/VERNICIATURA/.
- [ ] 📝 **Descrizione:** Verniciatura: che cos’è e come si fa, in 2-3 frasi
- [ ] 📝 **Descrizione:** tipi di vernice e colori più richiesti
- [ ] 📝 **A cosa serve:** Verniciatura: a cosa serve sulle guide d’onda
- [ ] 📝 **Materiali su cui si fa:** Verniciatura: su quali altri materiali si fa, oltre all’ottone

## Trattamento: Trattamenti termici (TERMICI)

_pagina /trattamenti/termici · riga 6 di catalogo/catalogo.csv_

- [ ] 📷 Foto: coppia prima/dopo (prima.jpg e dopo.jpg: stesso pezzo, stessa inquadratura, prima e dopo il trattamento); almeno una foto del trattamento o del pezzo trattato. Cartella: public/foto/TERMICI/.
- [ ] 📝 **Descrizione:** Trattamenti termici: che cos’è e come si fa, in 2-3 frasi
- [ ] 📝 **Descrizione:** quali trattamenti termici fate e su quali pezzi
- [ ] 📝 **A cosa serve:** Trattamenti termici: a cosa serve sulle guide d’onda
- [ ] 📝 **Materiali su cui si fa:** Trattamenti termici: su quali altri materiali si fa, oltre all’ottone

## Trattamento: Trattamenti galvanici (GALVANICI)

_pagina /trattamenti/galvanici · riga 7 di catalogo/catalogo.csv_

- [ ] 📷 Foto: coppia prima/dopo (prima.jpg e dopo.jpg: stesso pezzo, stessa inquadratura, prima e dopo il trattamento); almeno una foto del trattamento o del pezzo trattato. Cartella: public/foto/GALVANICI/.
- [ ] 📝 **Descrizione:** Trattamenti galvanici: che cos’è e come si fa, in 2-3 frasi
- [ ] 📝 **Descrizione:** quali trattamenti galvanici fate (la tabella dati della twistabile cita l’argentatura): argentatura, doratura, nichelatura…?
- [ ] 📝 **A cosa serve:** Trattamenti galvanici: a cosa serve sulle guide d’onda
- [ ] 📝 **Materiali su cui si fa:** Trattamenti galvanici: su quali altri materiali si fa, oltre all’ottone

## Altre domande per la ditta

_non sono segnaposto di una pagina, ma servono per completare il catalogo_

- [ ] 📝 **Quarta famiglia di prodotto** (oggi nascosta): esiste? Nome, descrizione, misure (es. transizioni o carichi?).
- [ ] 📝 **Prodotti tolti dal sito a ottobre:** confermare che non sono più a catalogo.
  Sono illuminatori d'antenna, transizioni, flange e kit di installazione, guida rigida a tratti dritti ed elettroformatura in nichel.
- [ ] 📝 **Tabelle tecniche:** controllare i valori sul documento originale.
  Sul sito sono stati trascritti a mano da un'immagine a bassa risoluzione.
- [ ] 📝 **Collaudo:** quali strumenti usate e quali parametri misurate (pagina Qualità).
- [ ] 📝 **Trattamenti:** si fanno davvero su tutti i pezzi (twistabile, seamless, curve, twist, disassati)?
- [ ] 📷 **Officina:** lavorazione, collaudo e magazzino, 2-3 foto ciascuno.
  Cartella `public/foto/officina/`, con nomi tipo `lavorazione-1.jpg`, `collaudo-1.jpg`, `magazzino-1.jpg`.
- [ ] 📷 **Ritratto di Marco Pasquini:** `public/foto/persone/marco-pasquini.jpg`.
