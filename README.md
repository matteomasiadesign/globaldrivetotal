# Global Drive

Sito vetrina e gestionale per la concessionaria **Global Drive Srls** (Nord Sardegna): catalogo auto, servizi (usato garantito, auto su commissione, conto vendita), chatbot **Casper** e area admin.

Stack: Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind 4 · framer-motion · lucide-react.

> Questa versione di Next.js ha API diverse da quelle "classiche". Prima di scrivere codice leggi i docs in `node_modules/next/dist/docs/` (vedi [AGENTS.md](AGENTS.md)). Ad esempio `middleware` ora si chiama `proxy`.

## Avvio

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
npm run lint
```

## Stato attuale: cosa è reale e cosa è finto

| Area | Stato |
| --- | --- |
| Sito pubblico (home, catalogo, servizi) | Funziona, ma legge le auto dal `localStorage` del browser: finché non c'è il database il catalogo è vuoto per i visitatori |
| Parco auto in admin | **Finto**: salvato in `localStorage` del browser (`CarContext`). Le modifiche non arrivano ai clienti |
| Agenda, documenti e richieste in admin | **In `localStorage`**, partono vuoti (stato in `src/context/AdminContext.tsx`) |
| Gestionale (conti, IVA, contatti, noleggio, contratti) | **Funziona ma è in `localStorage`**, parte vuoto: stato in `src/context/GestionaleContext.tsx`. Nessun dato è condiviso tra browser |
| Login admin | **Reale** (Supabase Auth, email + password): unico login, vale per tutto `/admin` compreso il gestionale. Account creati solo dalla dashboard Supabase. I dati dietro restano nel `localStorage` |
| **Lead dal sito** | **Reali** (vedi sotto): salvati dal server |
| Pagina "Richieste" in admin | **Vuota**: non legge ancora i lead salvati dal server |

| Casper | Risposte locali simulate; Gemini si attiva solo con `GEMINI_API_KEY` |

### Struttura dell'admin

Ogni sezione è una rotta con un solo compito; `src/app/admin/layout.tsx` mette sidebar, login e stato condiviso.

| Rotta | Compito | Vista |
| --- | --- | --- |
| `/admin` | Cosa richiede attenzione oggi: richieste nuove, agenda del giorno, cose da sistemare | `views/TodayView` |
| `/admin/richieste` | Smistare i lead: chiama / WhatsApp (la richiesta passa a "in gestione") / fissa in agenda | `views/LeadsView` |
| `/admin/agenda` | Appuntamenti per giorno e calendario mensile; conferma, completa, sposta | `views/AgendaView` |
| `/admin/auto` | Prezzo, stato, visibilità nel catalogo e vetrina in home; costo di ogni auto; schede fuori catalogo | `views/CarsView` |
| `/admin/auto/[id]` | Scheda economica: dati, prezzi, movimenti, conto economico (margine, IVA, ROI), contratto di vendita | `gestionale/VeicoloView` |
| `/admin/documenti` | Dossier per auto, anche fuori catalogo (cosa manca): file caricati o link a Google Drive, contratto di vendita in PDF | `views/DocumentsView` |
| `/admin/movimenti` | Libro cassa e banca: entrate e uscite, collegate a un'auto o generali | `gestionale/MovimentiView` |
| `/admin/scadenzario` | Incassi e pagamenti da saldare, per scadenza | `gestionale/ScadenzarioView` |
| `/admin/iva` | Liquidazione trimestrale, registro vendite, registro acquisti (`?tab=`) | `gestionale/IvaView` |
| `/admin/banca` | Riconciliazione dei movimenti con l'estratto conto | `gestionale/BancaView` |
| `/admin/analisi` | Vendite per mese, costi fissi/variabili e break-even (`?tab=`) | `gestionale/AnalisiView` |
| `/admin/contatti` | Anagrafica unica di clienti, fornitori e clienti del noleggio | `gestionale/ContattiView` |
| `/admin/noleggio` | Global Rent: panoramica, prenotazioni, calendario, preventivi, flotta, tariffe (`?tab=`) | `gestionale/NoleggioView` |
| `/admin/sito` | Contatti, orari, social, testi di home/servizi/chi siamo, numeri e recensioni | `views/SiteView` |
| `/admin/impostazioni` | Aliquota IVA, soglie, numerazione contratti, PEC | `gestionale/ImpostazioniView` |
| `/admin/storico` | Chi ha creato, modificato o eliminato cosa | `gestionale/StoricoView` |

**Come si collegano le cose.** Un'auto nasce nel parco auto con fornitore, prezzo e data di acquisto: la scheda economica e il movimento "Acquisto veicolo" si creano da soli, collegati al fornitore in anagrafica. I costi (movimenti con l'auto) alimentano costo totale, margine, IVA e analisi. Il contratto di vendita segna l'auto venduta, collega l'acquirente (anagrafica ⇄ auto), registra l'incasso atteso nello scadenzario, chiude la richiesta di chi ha comprato e archivia il contratto nel dossier. Nascondere o mostrare un'auto sul sito, o cambiarne lo stato, riallinea la scheda e viceversa. Un'auto tolta dal catalogo resta come scheda archiviata, con costi e documenti.

**Documenti.** Ogni documento del dossier si aggiunge in due modi: caricando un file (PDF, JPG, PNG, WEBP, fino a 25 MB) oppure incollando il link di Google Drive. I file caricati stanno per ora nel browser (IndexedDB) tramite `src/lib/storage/vehicleFiles.ts`, l'unico file da riscrivere per spostarli nel bucket `vehicle-documents` di Supabase (le istruzioni sono in testa al file); il record del documento non cambia. Il dossier segue l'auto anche quando esce dal catalogo.

**App installabile.** L'area `/admin` ha un `public/manifest.json` (nome, icone in `public/icons/`, ambito `/admin`, tema scuro): da telefono o da Chrome si può installare come app. Non c'è un service worker, quindi non funziona offline: serve solo a farla comparire come app a sé.

**Noleggio.** Un'auto è occupata dal giorno di ritiro a quello di riconsegna escluso: un cliente può ritirarla lo stesso giorno in cui un altro la riporta (nel calendario quel giorno è diviso a metà) oppure più avanti. Un noleggio di un solo giorno occupa quel giorno. Le regole stanno in `fineOccupazione()` (`src/lib/gestionale/rent.ts`) e nel vincolo del database.

**Viste condivisibili.** Tab e filtri delle pagine (`?tab=`, `?stato=`, `?filtro=`) si aggiornano nell'indirizzo mentre si usano, senza riempire la cronologia: ricaricando o condividendo il link si ritrova la stessa vista.

**Il gestionale è il cardine del backoffice.** Ogni auto del catalogo ha una scheda economica (`Veicolo`, collegata con `carId`): lo stato scelto lì (o nel parco auto) decide cosa mostra il sito (`catalogoDaStato` in `src/lib/gestionale/calc.ts`), e il contratto di vendita segna l'auto venduta e salva il cliente in anagrafica. Le formule (costo, margine, IVA, ROI, liquidazione) sono funzioni pure in `src/lib/gestionale/calc.ts`; il noleggio in `rent.ts`; il PDF del contratto in `contractPdf.ts`. Ragione sociale, P.IVA, sede e contatti del venditore nei contratti si leggono da `/admin/sito`.

Creazione e modifica avvengono in pannelli laterali (`AppointmentDrawer`, `CarDrawer`, ...) apribili da qualunque pagina via `useEditors()`. I filtri iniziali si passano dall'URL (`?stato=`, `?tab=`, `?filtro=`, `?auto=`). Attenzione: `?auto=` in `/admin/documenti` è l'id dell'auto (o della scheda, per le auto fuori catalogo), in `/admin/movimenti` è l'id della scheda economica. Componenti base in `src/components/admin/ui/`.

## Lead (richieste dei clienti)

Ogni richiesta dal sito viene salvata dal server tramite `POST /api/leads`.

| Origine | `type` | Dove |
| --- | --- | --- |
| Form "Invia un Messaggio" | `contatto` | `ContactSection.tsx` |
| "Richiedi Test Drive o Preventivo" | `test_drive` | `CarDetailModal.tsx` (salva `carId` e `carLabel`) |
| Modale "Auto su Commissione" | `commissione` | `ServicesSection.tsx` |
| Modale "Conto Vendita" | `conto_vendita` | `ServicesSection.tsx` |
| "Fatti richiamare" in chat | `casper` | `CasperCallbackForm.tsx` (salva la domanda fatta a Casper) |

Come funziona:

- **Il telefono è l'unico campo obbligatorio**: i form commissione e conto vendita non chiedono il nome.
- **Il salvataggio non blocca WhatsApp**: nei form che già aprivano WhatsApp (contatti, commissione, conto vendita) il lead viene salvato per primo, ma se fallisce WhatsApp si apre comunque. Nel form test drive, se fallisce, l'utente vede un errore (prima mostrava un successo finto senza inviare nulla).
- **Protezioni** in `src/app/api/leads/route.ts`: controllo dell'origine, rate limit (5 richieste / 10 min per IP), tetto di 10.000 caratteri, validazione di tipo/telefono/email, campo honeypot `website` (i bot che lo compilano ricevono "ok" ma non viene salvato nulla).
- **Persistenza provvisoria**: file `.data/leads.jsonl`, un lead per riga, ignorato da git. Funziona in locale o su un server con disco scrivibile, **non su Vercel**.
- **Come passare al database**: scrivere una nuova implementazione di `LeadRepository` in `src/lib/leads/repository.ts` (oggi solo `create`; arriveranno `list` e `updateStatus`) e cambiare l'export `leadRepository`. Route, validazione e form non cambiano.

File: `src/types/lead.ts` · `src/lib/leads/{validate,repository,rateLimit,client}.ts` · `src/components/ui/Honeypot.tsx` · `src/config/site.ts`.

### Ancora da fare sui lead

- [ ] **Consenso privacy**: i form raccolgono nome e telefono ma non hanno checkbox né link all'informativa. Serve prima la pagina privacy (testo legale da definire con il titolare), poi la checkbox su tutti i form e il campo `privacy_accepted_at` in tabella. **Da chiudere prima della messa online.**
- [ ] **Notifica allo staff** quando arriva un lead (email o WhatsApp). Serve scegliere il provider (es. Resend) e un indirizzo mittente.
- [ ] **Tab Lead dell'admin** deve leggere i lead reali (`list`, `updateStatus`). Richiede l'autenticazione: non va esposto nessun `GET /api/leads` finché `/admin` non è protetto.
- [ ] **Rate limit condiviso** quando ci sono più istanze o serverless (oggi è in memoria, per singola istanza). Valutare anche Cloudflare Turnstile se arriva spam.
- [ ] **Anti-doppio invio e deduplica** (stesso telefono più volte in poco tempo).

## Variabili d'ambiente

Il file `.env.local` non va in git. Crearlo in locale, e **aggiungere un `.env.example`** quando le variabili aumentano.

| Variabile | Stato | A cosa serve |
| --- | --- | --- |
| `GEMINI_API_KEY` | opzionale | Attiva le risposte AI di Casper (`/api/casper`). Senza, Casper usa il motore locale |
| `LEADS_FILE_PATH` | opzionale | Percorso del file dei lead. Default `.data/leads.jsonl` |
| `NEXT_PUBLIC_SUPABASE_URL` | **obbligatoria** | Progetto Supabase (Project Settings → API). Senza, il login admin non funziona |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **obbligatoria** | Chiave pubblica (anon) dello stesso progetto. Va impostata anche sull'hosting prima del build |
| Chiave del provider email | prevista | Notifiche lead |

## Schema del database

Lo schema è `supabase/schema.sql`: sito, gestionale, noleggio, ruoli, storage, permessi (RLS) e trigger. Ha già assorbito lo schema del vecchio gestionale. Si esegue una volta nell'SQL Editor di Supabase, sia su un progetto vuoto sia su quello che ha ancora le tabelle del vecchio gestionale (le sostituisce, gli utenti restano). Istruzioni e regole di accesso sono in testa al file. Non contiene dati di prova.

## Roadmap

Ordine concordato. Il punto 3 (lead) è fatto, con i residui elencati sopra.

1. [ ] **Database e persistenza**: applicare lo schema, spostare auto/agenda/documenti e il gestionale (`src/context/GestionaleContext.tsx`: veicoli, movimenti, contatti, impostazioni, noleggio, storico) da `localStorage`; il gestionale si porta cambiando solo lettura iniziale e salvataggio, tabelle già pronte in `supabase/schema.sql`, foto su bucket Supabase (oggi l'admin le carica dal PC, le comprime nel browser e le tiene come data URL nel `localStorage`: riscrivere solo `uploadCarPhoto`/`deleteCarPhoto` in `src/lib/storage/carPhotos.ts` e aggiungere l'host del bucket in `images.remotePatterns` di `next.config.ts`).
2. [ ] **Autenticazione admin**: login reale su Supabase fatto (`src/lib/supabase/client.ts`, `AdminContext`). Restano: protezione lato server quando i dati passeranno al database (policy RLS, ed eventualmente `proxy.ts`), ruoli admin/operatore, recupero password. In Supabase la registrazione pubblica va tenuta **disattivata** (la chiave anon è pubblica).
3. [x] **Lead dal sito** (form + Casper): vedi sezione dedicata.
4. [ ] **Pagine auto e SEO**: `/catalogo/[slug]` renderizzata lato server (oggi catalogo solo client, nessun URL condivisibile), `robots`, `sitemap`, Open Graph, dati strutturati (`AutoDealer`, `Vehicle`), `not-found`, `error`, `loading`.
5. [ ] **Privacy e conformità**: informativa privacy, cookie policy/banner se si usano strumenti di tracciamento, dati societari (P.IVA) in footer.
6. [ ] **Casper (API)**: l'endpoint ignora `history`; usa `gemini-1.5-flash` (verificare che sia ancora disponibile); la chiave è passata nell'URL; il messaggio utente entra nel prompt senza protezioni; manca rate limit; manca il contesto sul parco auto reale. Sostituire `any` nel `catch`.
7. [ ] **Qualità**: aggiungere test e CI, togliere asset di default da `public/`. (Fatto: l'admin non è più un unico file da 1.200 righe.)

### Problemi noti (non legati a una voce sopra)

- `npm run lint` dà 2 errori in `CasperChat.tsx` (`Date.now()` chiamato durante il render, righe ~143 e ~165) e vari warning di import inutilizzati (`servizi/page.tsx`, `CasperChat.tsx`).
- Numeri di telefono: i placeholder (`390000000000`, `393000000000`) in servizi, modale auto e Casper sono stati sostituiti con quello reale, letto da `src/config/site.ts`. **Il numero è ancora scritto a mano** nei link di `ContactSection.tsx` (card telefono, WhatsApp), `Footer.tsx` e `Navbar.tsx`: vanno spostati nello stesso file.
- Nessun commit nel repository: tutti i file sono ancora "untracked".
