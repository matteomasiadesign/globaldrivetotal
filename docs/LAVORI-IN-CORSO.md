# Lavori in corso sull'admin (aggiornato il 12/10/2026)

File per riprendere il lavoro da dove si è fermato, anche in una nuova sessione. Tutto è sul ramo git `admin-fasi`.
In una nuova chat di Claude Code basta scrivere: **"leggi docs/LAVORI-IN-CORSO.md e continua"**.

## Contesto

Audit dell'admin fatto con 4 agenti il 12/10. Piano in 5 fasi. Le decisioni contabili
sono modificabili da **/admin/impostazioni** (il commercialista deve confermarle):
margine IVA con le spese (default sì), metodi bancari (Conto, Bonifico, Carta),
tariffe del noleggio IVA inclusa (default sì), backup/ripristino JSON.

## Fatto

**Fase 1, correzioni** (migrazione `supabase/migrations/20261012_admin_fase1.sql` già eseguita):
richieste dal sito su Supabase, ruoli admin/operatore, «Annulla» sulle eliminazioni, avviso
sulle modifiche non salvate, contratti salvati nel dossier e numerati per anno, auto vendute archiviate corrette.

**Fase 2, export**:
- `src/lib/export/` → `scrivi.ts` (CSV all'italiana + Excel con SheetJS), `types.ts`, `gestionale.ts` (tutti i fogli + `pacchettoCommercialista`).
- `src/components/admin/ui/ExportMenu.tsx` (pulsante Esporta), `ui/PeriodoSelect.tsx`, `src/lib/gestionale/periodo.ts`.
- Esporta in: Movimenti (+ filtro periodo, prima nota), Scadenzario, IVA (+ selettore anno, tab «Altre entrate», righe di totale, **pacchetto commercialista** per trimestre/anno), Banca, Analisi (+ selettore anno, totali), Contatti, Parco auto (catalogo + conto economico, registro usati, contratti).
- La liquidazione IVA conta anche l'IVA delle altre entrate (noleggio): `ivaAltraEntrata` in `calc.ts`; nuove categorie «Noleggio» e «Altre entrate».

**Fase 3, import**:
- `src/lib/import/` → `leggi.ts`, `normalizza.ts`, `mappatura.ts` (riconoscimento colonne), `schemi.ts` (movimenti, contatti, auto, flotta, estratto conto), `banca.ts` (abbinamento estratto conto).
- `src/components/admin/gestionale/import/` → `ImportDialog.tsx` (generico), `Importa.tsx`, `ImportEstratto.tsx`.
- Funzioni nel contesto: `importaMovimenti`, `importaContatti`, `importaVeicoli`, `importaFlotta`, `riconciliaEstratto`, `ripristinaBackup`, `esportaBackup` (tutte annullabili).
- Pulsante Importa in: Movimenti, Contatti, Parco auto, Banca (estratto conto).

**Fase 4-5, in parte**:
- Movimento: Duplica, «Segna incassato/pagato» dal menu, scorporo IVA dal totale, data saldo, **allegato** (fattura/ricevuta), link a scheda auto e contatto.
- Noleggio: prenotazione modificabile (km, carburante, note, stato); «Conclusa» crea l'incasso (categoria Noleggio, da saldare) e rimette l'auto disponibile; «In corso» la segna noleggiata; niente prenotazioni su auto fuori servizio; avviso patente scaduta; preventivi rifiutati/scaduti non convertibili.

## Da fare (in ordine)

1. ~~Impostazioni: interruttore IVA noleggio e backup~~ FATTO.
2. ~~Noleggio: import flotta, export, blocco eliminazione con noleggio in corso~~ FATTO.
3. ~~Migrazione 2~~ FATTO: `supabase/migrations/20261013_admin_fasi_2_5.sql` (testata in PGlite, già anche in schema.sql). **L'utente deve eseguirla nell'SQL Editor.**
4. ~~Oggi: ritiri e riconsegne del noleggio, richieste ferme~~ FATTO (gli incassi scaduti erano già negli avvisi).
5. ~~Ricerca globale Ctrl+K e Nuovo~~ FATTO: `src/components/admin/CommandPalette.tsx` (Ctrl+K, "/", pulsante in sidebar e lente su telefono).
6. ~~Scheda contatto completa~~ FATTO: in `ContattoDrawer.tsx` «Storia del cliente» con auto, movimenti, richieste, appuntamenti, noleggi e azioni (chiama, fissa appuntamento).
7. ~~Pubblica sul catalogo e campo Servizio~~ FATTO: link «Pubblica sul catalogo» nella scheda economica (CarDrawer con `daVeicoloId`), Servizio e Proprietario nella nuova auto, niente prezzo d'acquisto nel conto vendita.
8. ~~README, controlli e build~~ FATTO.

## Fase 6: interfaccia da CRM (ramo git `ui-crm`, in corso)

Richiesta dell'utente: migliorare nettamente la UI, più comoda da guardare e usare. Ordine:

1. ~~Accessibilità e coerenza di base~~ FATTO.
2. ~~DataTable~~ FATTO (`ui/DataTable.tsx`) e usata in Movimenti, Scadenzario, Banca, Contatti.
3. ~~Barra laterale più corta~~ FATTO: 10 voci; schede di sezione in `AdminShell.tsx` (SEZIONI, SchedeSezione).
4. ~~Etichette di stato cliccabili~~ FATTO (`ui/StatoMenu.tsx`).
5. ~~Combobox~~ FATTO (`ui/Combobox.tsx`) in movimento, prenotazione, appuntamento, contratto; colonna dei mesi fissa in Analisi.

Fase 6 completata.

## Fase 7: Global Drive e Global Rent separati (ramo git `drive-rent`, 12/10/2026)

Richiesta dell'utente: separare il noleggio (Global Rent) dalla vendita di usato (Global Drive), con un
toggle sempre visibile; in comune i veicoli (assegnati all'una o all'altra) e tutto il resto. Stessa società:
IVA e banca uniche.

- Modello: `Veicolo.attivita` e `Movimento.attivita` («Vendita» | «Noleggio»); `RentVeicolo.veicoloId` = la
  scheda del veicolo. Funzioni pure in `src/lib/gestionale/attivita.ts`; i salvataggi vecchi si migrano da soli
  (`collegaFlotta` in `normalizza`). Spostamento con `assegnaAttivita` (hook `useSpostaVeicolo`).
- Interfaccia: `src/components/admin/Attivita.tsx` (gestione aperta, colore `acc` blu/viola su <html>),
  `AdminShell.tsx` riscritta (barra sospesa riducibile, toggle, menu per gestione, dock su telefono).
  Rotte `/admin/noleggio/[sezione]`; `/admin/noleggio` è la «Oggi» di Rent.
- IVA: le spese del noleggio restano in regime ordinario anche con il margine sulle spese.
- Migrazione `supabase/migrations/20261014_drive_rent.sql` (testata in PGlite): **da eseguire nell'SQL Editor**.
- Da verificare col commercialista: un'auto ex noleggio con IVA d'acquisto detratta, se venduta, non può
  andare in regime del margine (il gestionale oggi la tratta come le altre vendite dirette).
- Prossimi passi UI proposti: grafici nella «Oggi», richieste a colonne trascinabili, parco auto a schede con foto.

## Possibili passi successivi (non richiesti esplicitamente)

- Sidebar più corta (raggruppare Scadenzario/Banca sotto Movimenti, IVA/Analisi sotto Report).
- Una tabella unica con ordinamento per colonna e selezione multipla (azioni in blocco).
- Preventivi del noleggio modificabili e in PDF; documenti allegati ai contatti.
- Conto vendita: movimento «da pagare al proprietario» alla vendita (da decidere col commercialista).
- Portare il gestionale da localStorage a Supabase (tabelle già pronte in schema.sql).

## Cose che l'utente deve fare

- Aggiungere `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` e sull'hosting (Supabase → Project Settings → API → service_role). Senza, le richieste dal sito non arrivano nell'admin.
- Eseguire nell'SQL Editor le migrazioni nuove in `supabase/migrations/` (non `schema.sql`).
