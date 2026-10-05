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
| Sito pubblico (home, catalogo, servizi) | Funziona, ma legge sempre le auto demo di `src/data/cars.ts` |
| Parco auto in admin | **Finto**: salvato in `localStorage` del browser (`CarContext`). Le modifiche non arrivano ai clienti |
| Agenda, documenti e richieste in admin | **Finti**: `localStorage` + dati di `src/data/adminMock.ts` (stato in `src/context/AdminContext.tsx`) |
| Login admin | **Finto**: accetta qualsiasi credenziale, nessuna protezione reale su `/admin` |
| **Lead dal sito** | **Reali** (vedi sotto): salvati dal server |
| Pagina "Richieste" in admin | **Finta**: mostra lead demo con la stessa forma di quelli reali (`Lead`), non legge ancora quelli salvati |

### Struttura dell'admin

Ogni sezione è una rotta con un solo compito; `src/app/admin/layout.tsx` mette sidebar, login e stato condiviso.

| Rotta | Compito | Vista |
| --- | --- | --- |
| `/admin` | Cosa richiede attenzione oggi: richieste nuove, agenda del giorno, cose da sistemare | `views/TodayView` |
| `/admin/richieste` | Smistare i lead: chiama / WhatsApp (la richiesta passa a "in gestione") / fissa in agenda | `views/LeadsView` |
| `/admin/agenda` | Appuntamenti per giorno e calendario mensile; conferma, completa, sposta | `views/AgendaView` |
| `/admin/auto` | Prezzo, stato, visibilità nel catalogo e vetrina in home | `views/CarsView` |
| `/admin/documenti` | Dossier per auto (cosa manca) e contratto di vendita | `views/DocumentsView` |
| `/admin/sito` | Contatti, orari, social, testi di home/servizi/chi siamo, numeri e recensioni | `views/SiteView` |

Creazione e modifica avvengono in pannelli laterali (`AppointmentDrawer`, `CarDrawer`, ...) apribili da qualunque pagina via `useEditors()`. I filtri iniziali si passano dall'URL (`?stato=`, `?tab=`, `?filtro=`, `?auto=`). Componenti base in `src/components/admin/ui/`.
| Casper | Risposte locali simulate; Gemini si attiva solo con `GEMINI_API_KEY` |

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
| `DATABASE_URL` o equivalente | prevista | Connessione al database (scelta del servizio ancora aperta) |
| Segreti di autenticazione | previsti | Sessioni admin |
| Chiave del provider email | prevista | Notifiche lead |

## Schema del database previsto

Bozza delle tabelle, ricavata dai tipi in `src/types/` e dai form. Non è ancora applicata: è indipendente dal servizio scelto (SQL Postgres). Convenzioni: chiavi `uuid`, date `timestamptz`, valori testuali a stati chiusi con `CHECK` (più facili da evolvere degli enum). Nel codice i valori sono etichette italiane ("In Trattativa"): vanno mappati in slug (`in_trattativa`).

```sql
-- AUTO ----------------------------------------------------------------
create table cars (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,            -- per /catalogo/[slug] (SEO)
  brand         text not null,
  model         text not null,
  version       text not null,
  year          int  not null,
  mileage_km    int  not null check (mileage_km >= 0),
  price_eur     numeric(10,2) not null check (price_eur >= 0),
  fuel          text not null check (fuel in ('benzina','diesel','ibrida','elettrica')),
  transmission  text not null check (transmission in ('automatico','manuale')),
  power_cv      int  not null,
  category      text not null check (category in ('sportiva','suv','berlina','coupe','cabrio')),
  status        text not null default 'disponibile'
                check (status in ('disponibile','in_trattativa','venduta')),
  featured      boolean not null default false,  -- vetrina in home
  hidden        boolean not null default false,  -- nascosta dal catalogo pubblico
  description   text not null default '',
  features      text[] not null default '{}',
  location      text not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index on cars (hidden, status, price_eur);

-- Oggi `images` è un array di URL: con l'upload diventano file in uno storage.
create table car_images (
  id           uuid primary key default gen_random_uuid(),
  car_id       uuid not null references cars(id) on delete cascade,
  storage_path text not null,
  position     int  not null default 0,          -- 0 = foto principale
  alt          text,
  unique (car_id, position)
);

-- LEAD ----------------------------------------------------------------
create table leads (
  id            uuid primary key default gen_random_uuid(),
  type          text not null check (type in
                ('contatto','test_drive','commissione','conto_vendita','casper')),
  status        text not null default 'nuovo'
                check (status in ('nuovo','in_gestione','completato','scartato')),
  phone         text not null,
  name          text,
  email         text,
  message       text,
  car_id        uuid references cars(id) on delete set null,
  car_label     text,                            -- copia testuale: resta se l'auto viene cancellata
  details       jsonb,                           -- budget, anno minimo, km, prezzo desiderato...
  source_path   text,
  privacy_accepted_at timestamptz,               -- null finché non c'è la checkbox
  assigned_to   uuid references staff_profiles(id),
  internal_notes text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index on leads (status, created_at desc);
create index on leads (car_id);

-- AGENDA --------------------------------------------------------------
create table appointments (
  id            uuid primary key default gen_random_uuid(),
  lead_id       uuid references leads(id) on delete set null,  -- "Fissa in agenda" da un lead
  client_name   text not null,
  client_phone  text not null,
  client_email  text,
  starts_at     timestamptz not null,            -- oggi date + time separati; fuso Europe/Rome
  duration_minutes int not null default 60,
  type          text not null check (type in
                ('test_drive','trattativa','consegna','perizia_permuta',
                 'consulenza_finanziamento','ritiro_documenti')),
  car_id        uuid references cars(id) on delete set null,
  car_label     text,
  location      text not null,
  status        text not null default 'in_attesa'
                check (status in ('confermato','in_attesa','completato','annullato')),
  notes         text,
  created_at    timestamptz not null default now()
);
create index on appointments (starts_at);

-- DOCUMENTI -----------------------------------------------------------
create table vehicle_documents (
  id               uuid primary key default gen_random_uuid(),
  car_id           uuid not null references cars(id) on delete cascade,
  title            text not null,
  category         text not null check (category in
                   ('contratto_vendita','libretto_duc','certificato_proprieta',
                    'tagliandi_manutenzione','perizia_110_punti',
                    'garanzia_assicurazione','altro')),
  source           text not null check (source in ('google_drive','generated_html','local_pdf')),
  file_url         text,
  drive_folder_url text,
  file_size_bytes  bigint,
  notes            text,
  created_at       timestamptz not null default now()
);
create index on vehicle_documents (car_id);

-- STAFF ---------------------------------------------------------------
create table staff_profiles (
  id         uuid primary key,                   -- = id utente del sistema di autenticazione
  full_name  text not null,
  role       text not null default 'operatore' check (role in ('admin','operatore')),
  created_at timestamptz not null default now()
);
```

Regole di accesso previste (da trasformare nel meccanismo del servizio scelto):

- **Pubblico**: legge solo `cars` con `hidden = false` e le relative `car_images`. Non legge mai lead, agenda o documenti.
- **Sito → lead**: solo scrittura, e solo dal server (la route `/api/leads`). Nessuna lettura pubblica.
- **Staff** (`staff_profiles`): lettura e scrittura su tutto. Solo `admin` può cancellare auto o documenti e gestire lo staff.
- **Dati personali**: lead, agenda e documenti contengono dati di clienti (GDPR). I contratti di vendita (`SaleDocumentDraft` in `src/types/admin.ts`) contengono anche il codice fiscale: **non** vanno salvati finché non è deciso dove e per quanto tempo conservarli.

Da valutare più avanti:

- Tabella `customers` per unire lead, appuntamenti e vendite dello stesso cliente (oggi i dati cliente sono copiati in ogni record).
- Tabella per lo storico dei cambi di stato dei lead.
- Tabella per le conversazioni di Casper (solo con consenso e per un tempo limitato).
- Tabella per le bozze di contratto, quando si decide come proteggere i dati.

## Roadmap

Ordine concordato. Il punto 3 (lead) è fatto, con i residui elencati sopra.

1. [ ] **Database e persistenza**: applicare lo schema, spostare auto/agenda/documenti da `localStorage`, foto su bucket Supabase (oggi l'admin le carica dal PC, le comprime nel browser e le tiene come data URL nel `localStorage`: riscrivere solo `uploadCarPhoto`/`deleteCarPhoto` in `src/lib/storage/carPhotos.ts` e aggiungere l'host del bucket in `images.remotePatterns` di `next.config.ts`).
2. [ ] **Autenticazione admin**: login reale, `proxy.ts` che protegge `/admin`, ruoli, "Password dimenticata?" oggi è solo testo. Rimuovere credenziali precompilate e "Accesso Rapido" da `AdminLogin.tsx`.
3. [x] **Lead dal sito** (form + Casper): vedi sezione dedicata.
4. [ ] **Pagine auto e SEO**: `/catalogo/[slug]` renderizzata lato server (oggi catalogo solo client, nessun URL condivisibile), `robots`, `sitemap`, Open Graph, dati strutturati (`AutoDealer`, `Vehicle`), `not-found`, `error`, `loading`.
5. [ ] **Privacy e conformità**: informativa privacy, cookie policy/banner se si usano strumenti di tracciamento, dati societari (P.IVA) in footer.
6. [ ] **Casper (API)**: l'endpoint ignora `history`; usa `gemini-1.5-flash` (verificare che sia ancora disponibile); la chiave è passata nell'URL; il messaggio utente entra nel prompt senza protezioni; manca rate limit; manca il contesto sul parco auto reale. Sostituire `any` nel `catch`.
7. [ ] **Qualità**: aggiungere test e CI, togliere asset di default da `public/`. (Fatto: l'admin non è più un unico file da 1.200 righe.)

### Problemi noti (non legati a una voce sopra)

- `npm run lint` dà 2 errori in `CasperChat.tsx` (`Date.now()` chiamato durante il render, righe ~143 e ~165) e vari warning di import inutilizzati (`servizi/page.tsx`, `CasperChat.tsx`).
- `CarContext` tratta un elenco auto vuoto come "nessun dato" e ripristina le auto demo: se si cancellano tutte le auto, al ricaricamento tornano.
- Numeri di telefono: i placeholder (`390000000000`, `393000000000`) in servizi, modale auto e Casper sono stati sostituiti con quello reale, letto da `src/config/site.ts`. **Il numero è ancora scritto a mano** nei link di `ContactSection.tsx` (card telefono, WhatsApp), `Footer.tsx` e `Navbar.tsx`: vanno spostati nello stesso file.
- Nessun commit nel repository: tutti i file sono ancora "untracked".
