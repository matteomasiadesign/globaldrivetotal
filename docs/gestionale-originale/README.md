# Gestionale Auto

App web per gestire la rivendita di auto usate: parco auto, spese di sistemazione per ogni auto, calcolo automatico di costo totale, margine, IVA e ricavo netto. Login separato per admin e venditori (i venditori non vedono margini e prezzi di acquisto).

## 1. Crea il progetto Supabase

1. Vai su [supabase.com](https://supabase.com), registrati e crea un nuovo progetto (gratuito).
2. Aspetta che il progetto sia pronto (1-2 minuti).
3. Vai su **SQL Editor** (menu a sinistra) → **New query**.
4. Apri il file `supabase/schema_v2.sql`, copia tutto il contenuto, incollalo nell'editor e premi **Run**. Questo crea le tabelle `veicoli`, `movimenti`, `impostazioni`, `profiles` e le regole di sicurezza.
5. Apri poi anche `supabase/schema_v3.sql` (aggiunge anagrafica clienti/fornitori e storico modifiche — non cancella nulla di quanto già creato) e eseguilo allo stesso modo.
6. Apri infine `supabase/schema_v4.sql` (aggiunge scadenzario, registro IVA e riconciliazione bancaria — non cancella nulla) ed eseguilo allo stesso modo.
7. Apri infine `supabase/schema_v5.sql` (aggiunge foto/documenti: crea anche un bucket di Storage chiamato `veicoli-documenti`) ed eseguilo allo stesso modo.
8. Vai su Supabase → **Authentication → Sign In / Providers** e **disattiva** "Allow new users to sign up": da questo momento nessuno può più registrarsi da solo. Per aggiungere un collaboratore, vai su **Authentication → Users → Add user**, crealo con email e password, poi da SQL Editor esegui:
```sql
update profiles set ruolo = 'venditore' where email = 'collaboratore@esempio.it';
```
9. Vai su **Project Settings → API**: qui trovi `Project URL` (in cima alla pagina) e la **Publishable key** (sotto "Project API keys"), ti serviranno tra poco.
10. Quando vuoi iniziare a popolare anche **Global Rent** (flotta noleggio), esegui anche `supabase/schema_rent_v1.sql` — crea le tabelle `rent_veicoli`, `rent_clienti`, `rent_prenotazioni` con un vincolo di database che impedisce di prenotare due volte la stessa auto sullo stesso periodo.
11. Poi esegui anche `supabase/schema_rent_v2.sql` — aggiunge luogo di ritiro/consegna, tariffe per periodo (stagionali) e i preventivi.
12. Esegui anche, per Global Drive, in ordine: `schema_v6.sql` (dati aziendali per i contratti), `schema_v7.sql` (km/allestimento/alimentazione auto), `schema_v8.sql` (dati legali cliente) — servono per la generazione automatica dei contratti di vendita.

## 2. Configura le variabili d'ambiente

1. Copia il file `.env.local.example` in un nuovo file chiamato `.env.local`.
2. Incolla `Project URL` in `NEXT_PUBLIC_SUPABASE_URL` e `anon public key` in `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## 3. Avvia il progetto in locale (per provarlo)

Serve [Node.js](https://nodejs.org) installato (versione 18 o superiore). Poi, da terminale, nella cartella del progetto:

```bash
npm install
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000): verrai portato alla pagina di login.

## 4. Crea il tuo account amministratore

1. Sulla pagina di login clicca **Registrati**, inserisci la tua email e una password.
2. Supabase ti invierà un'email di conferma (controlla anche lo spam) — clicca il link per confermare l'account.
3. Torna su Supabase → **SQL Editor** ed esegui, sostituendo con la tua email:

```sql
update profiles set ruolo = 'admin' where email = 'tuaemail@esempio.it';
```

4. Ora accedi dall'app con quell'account: vedrai tutte le funzioni, inclusi margini e costi.

Per i collaboratori: fai registrare anche loro dalla stessa pagina. Di default il loro ruolo sarà `venditore` (vedono le auto e possono registrare spese, ma non vedono prezzi di acquisto, margini e ricavi, e non possono eliminare auto).

## 5. Pubblica il sito online (Vercel)

1. Crea un repository su [GitHub](https://github.com) e caricaci questo progetto (oppure trascina la cartella su [vercel.com/new](https://vercel.com/new) se preferisci evitare Git).
2. Vai su [vercel.com](https://vercel.com), registrati, clicca **Add New → Project** e collega il repository.
3. In **Environment Variables** inserisci le stesse due variabili di `.env.local` (`NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
4. Clicca **Deploy**. In un paio di minuti ottieni un indirizzo tipo `gestionale-auto.vercel.app`, raggiungibile da qualunque dispositivo.

## Struttura del progetto

```
app/
  login/page.tsx           pagina di accesso e registrazione
  dashboard/page.tsx        carica utente/ruolo e mostra il gestionale
  page.tsx                  reindirizza a /login o /dashboard
components/
  GestionaleApp.tsx          shell con la navigazione tra le sezioni
  views/
    DashboardView.tsx         KPI generali e riepilogo parco auto
    VeicoliView.tsx            elenco e scheda dettaglio di ogni auto
    MovimentiView.tsx          libro cassa/banca completo
    LiquidazioneIvaView.tsx    calcolo IVA trimestrale
    AnalisiCostiView.tsx       costi fissi/variabili e break-even
    AnalisiMensileView.tsx     operazioni e ricavi per mese/servizio
    ImpostazioniView.tsx       parametri globali (solo admin)
  ui/Shared.tsx               componenti visivi condivisi (badge, kpi...)
lib/
  calc.ts                    tipi e tutte le formule di calcolo
  supabase/                  client Supabase (browser e server)
middleware.ts                 mantiene la sessione di login aggiornata
supabase/schema_v2.sql        schema del database da eseguire su Supabase
```

## Come funzionano i calcoli (per servizio)

**Vendita diretta / Auto su commissione**
- Costo totale = prezzo acquisto + costi diretti (movimenti collegati all'auto)
- Margine gestionale = prezzo vendita − costo totale
- Margine regime IVA = max(0, prezzo vendita − prezzo acquisto)
- IVA regime del margine = margine regime IVA × aliquota / (1 + aliquota)
- Risultato dopo IVA = margine gestionale − IVA regime del margine

**Conto vendita** (l'auto è di un privato, tu intermedi la vendita)
- Costo totale = solo i costi diretti sostenuti (non c'è acquisto)
- Commissione imponibile = prezzo vendita × % commissione
- IVA su commissione = commissione imponibile × aliquota IVA
- Margine gestionale = commissione imponibile − costi diretti
- Risultato dopo IVA = margine gestionale (l'IVA è già scorporata nella fattura di intermediazione)

**In comune**: ROI = risultato dopo IVA / costo totale · Giorni stock = oggi (o data vendita) − data acquisto

## Estensioni possibili

- Fatturazione: generare un PDF con i dati di vendita
- Caricamento foto e documenti per ogni auto
- Notifiche email quando un'auto resta invenduta troppo a lungo o si avvicina una scadenza IVA
- Esportazione dati in Excel/CSV
- Categorie di costo personalizzabili (oggi sono fisse nel codice, in `lib/calc.ts`)

Per qualsiasi di queste, puoi tornare a chiedere aiuto per estendere il progetto.
