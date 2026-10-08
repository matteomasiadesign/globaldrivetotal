-- =====================================================================
-- GLOBAL DRIVE — SCHEMA COMPLETO (Supabase / Postgres 15+)
--
-- Da eseguire UNA volta, per intero, nell'SQL Editor di un progetto Supabase
-- NUOVO E VUOTO. È un'unica transazione: se qualcosa fallisce non resta niente
-- a metà. Prima di eseguirlo: Authentication → Sign In / Providers →
-- disattiva "Allow new users to sign up" (gli utenti si creano a mano).
--
-- Copre tutto ciò che oggi vive in localStorage / file:
--   sito pubblico   cars, car_images, site_settings, leads, casper_*
--   agenda/doc      appointments, vehicle_documents
--   gestionale      veicoli, movimenti, contatti, impostazioni, storico,
--                   sale_contracts (+ viste dei conti e della liquidazione IVA)
--   noleggio        noleggio_veicoli / _prenotazioni / _tariffe / _preventivi
--   sistema         staff_profiles (ruoli), storage, rate limit, notifiche
--
-- CONVENZIONI
--  * Tabelle del sito = nomi inglesi; tabelle del gestionale = nomi italiani,
--    come i tipi TypeScript in src/lib/gestionale/types.ts (camelCase → snake_case).
--  * I valori testuali a stati chiusi sono ESATTAMENTE quelli del codice
--    ("In vendita", "Da saldare", "test_drive"…), protetti da CHECK: i tipi
--    TypeScript si generano 1:1 e non serve nessuna tabella di conversione.
--  * Il codice usa "" per "vuoto" e le date come stringhe "YYYY-MM-DD"; il
--    database usa NULL per le date vuote. Lo strato di accesso ai dati
--    (GestionaleContext / AdminContext) converte "" ⇄ NULL.
--  * Gli id diventano uuid: gli id di prova ("vw-golf-8-life") spariscono
--    con i dati demo.
--  * Appuntamenti: il codice ha date + time separati, qui c'è un solo
--    starts_at (timestamptz, fuso Europe/Rome); local_date e local_time sono
--    colonne generate pronte da leggere.
--
-- ACCESSO (RLS attiva su ogni tabella, nulla è leggibile dal pubblico tranne
-- il catalogo e i testi del sito)
--  * Login unico: Supabase Auth, quello di /admin. Nessun altro login.
--  * staff_profiles lega ogni utente Auth a un ruolo: 'admin' o 'operatore'.
--    Un utente appena creato è INATTIVO finché un admin non lo attiva
--    (vedi in fondo: come creare i due utenti).
--  * admin: tutto. operatore: sito, richieste, agenda, documenti, noleggio e
--    anagrafica; NIENTE conti (veicoli, movimenti, contratti, impostazioni,
--    storico), perché lì ci sono prezzi d'acquisto e margini.
--  * Le richieste del sito si scrivono SOLO dal server con la service role
--    key (route /api/leads): nessuna policy anon su leads.
-- =====================================================================

begin;

create extension if not exists btree_gist;   -- serve al vincolo anti-doppia-prenotazione

-- ---------------------------------------------------------------------
-- 0. Utilità comuni
-- ---------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 1. Staff e ruoli
-- ---------------------------------------------------------------------

create table public.staff_profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null default '',
  full_name   text not null default '',
  role        text not null default 'operatore' check (role in ('admin', 'operatore')),
  active      boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger trg_staff_profiles_updated before update on public.staff_profiles
  for each row execute function public.set_updated_at();

-- Ogni nuovo utente Auth ottiene un profilo INATTIVO: finché un admin non lo
-- attiva non vede niente.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into public.staff_profiles (id, email, full_name)
  values (new.id, coalesce(new.email, ''), coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Funzioni usate da tutte le policy. security definer: leggono staff_profiles
-- senza ricadere nelle sue stesse policy.
create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.staff_profiles where id = auth.uid() and active);
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.staff_profiles where id = auth.uid() and active and role = 'admin');
$$;

alter table public.staff_profiles enable row level security;
create policy "staff_profiles: ognuno vede il proprio, admin tutti" on public.staff_profiles
  for select to authenticated using (id = auth.uid() or (select public.is_admin()));
create policy "staff_profiles: solo admin modifica" on public.staff_profiles
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "staff_profiles: solo admin elimina" on public.staff_profiles
  for delete to authenticated using ((select public.is_admin()));

-- ---------------------------------------------------------------------
-- 2. Catalogo pubblico: auto e foto
-- ---------------------------------------------------------------------

create table public.cars (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique,                       -- per /catalogo/[slug]; lo genera il trigger
  brand         text not null,
  model         text not null,
  version       text not null default '',
  year          int  not null check (year between 1950 and 2100),
  mileage       int  not null check (mileage >= 0),          -- km
  price         numeric(10,2) not null check (price >= 0),   -- prezzo di listino sul sito
  fuel          text not null check (fuel in ('Benzina', 'Diesel', 'Ibrida', 'Elettrica')),
  transmission  text not null check (transmission in ('Automatico', 'Manuale')),
  power         int  not null default 0 check (power >= 0),  -- CV
  category      text not null check (category in
                  ('Utilitaria', 'Berlina', 'SUV', 'Station Wagon', 'Monovolume', 'Coupé', 'Cabrio', 'Sportiva')),
  status        text not null default 'Disponibile' check (status in ('Disponibile', 'In Trattativa', 'Venduta')),
  featured      boolean not null default false,    -- in vetrina in home (vale solo se non è nascosta)
  hidden        boolean not null default false,    -- nascosta dal catalogo pubblico
  description   text not null default '',
  features      text[] not null default '{}',
  location      text not null default '',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index idx_cars_catalog on public.cars (hidden, status, price);
create trigger trg_cars_updated before update on public.cars
  for each row execute function public.set_updated_at();

-- Slug leggibile e unico, se l'app non lo passa.
create or replace function public.cars_set_slug()
returns trigger language plpgsql as $$
begin
  if new.slug is null or new.slug = '' then
    new.slug := trim(both '-' from lower(regexp_replace(
      concat_ws(' ', new.brand, new.model, new.version, new.year::text), '[^a-zA-Z0-9]+', '-', 'g')))
      || '-' || substr(new.id::text, 1, 6);
  end if;
  return new;
end;
$$;
create trigger trg_cars_slug before insert on public.cars
  for each row execute function public.cars_set_slug();

create table public.car_images (
  id            uuid primary key default gen_random_uuid(),
  car_id        uuid not null references public.cars(id) on delete cascade,
  storage_path  text not null,                     -- percorso nel bucket car-photos
  position      int  not null default 0,           -- 0 = copertina
  alt           text not null default '',
  created_at    timestamptz not null default now(),
  -- Riordino delle foto: UPDATE in una transazione (il vincolo è differibile). Non usare upsert(onConflict).
  unique (car_id, position) deferrable initially deferred
);
create index idx_car_images_car on public.car_images (car_id, position);

alter table public.cars enable row level security;
alter table public.car_images enable row level security;

create policy "cars: il pubblico vede le visibili" on public.cars
  for select to anon, authenticated using (not hidden);
create policy "cars: staff vede tutte" on public.cars
  for select to authenticated using ((select public.is_staff()));
create policy "cars: staff inserisce" on public.cars
  for insert to authenticated with check ((select public.is_staff()));
create policy "cars: staff modifica" on public.cars
  for update to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "cars: solo admin elimina" on public.cars
  for delete to authenticated using ((select public.is_admin()));

create policy "car_images: il pubblico vede quelle delle auto visibili" on public.car_images
  for select to anon, authenticated
  using (exists (select 1 from public.cars c where c.id = car_id and not c.hidden));
create policy "car_images: staff vede tutte" on public.car_images
  for select to authenticated using ((select public.is_staff()));
create policy "car_images: staff inserisce" on public.car_images
  for insert to authenticated with check ((select public.is_staff()));
create policy "car_images: staff modifica" on public.car_images
  for update to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "car_images: staff elimina" on public.car_images
  for delete to authenticated using ((select public.is_staff()));

-- Vista comoda per il sito: auto visibili con i percorsi delle foto in ordine.
create view public.public_cars with (security_invoker = true) as
select c.*,
       coalesce((select array_agg(i.storage_path order by i.position)
                   from public.car_images i where i.car_id = c.id), '{}') as image_paths
  from public.cars c
 where not c.hidden;
grant select on public.public_cars to anon, authenticated;

-- ---------------------------------------------------------------------
-- 3. Contenuti del sito (/admin/sito)
-- ---------------------------------------------------------------------

-- Una sola riga: l'oggetto SiteSettings (src/types/site.ts) è annidato
-- (servizi, statistiche, recensioni), quindi sta in jsonb. Il codice completa
-- i campi mancanti con i default di src/config/site.ts.
create table public.site_settings (
  id          int primary key default 1 check (id = 1),
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);
insert into public.site_settings (id) values (1);
create trigger trg_site_settings_updated before update on public.site_settings
  for each row execute function public.set_updated_at();

alter table public.site_settings enable row level security;
create policy "site_settings: lettura pubblica" on public.site_settings
  for select to anon, authenticated using (true);
create policy "site_settings: staff modifica" on public.site_settings
  for update to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));

-- ---------------------------------------------------------------------
-- 4. Anagrafica unica (clienti, fornitori, clienti del noleggio)
-- ---------------------------------------------------------------------

-- leads è definita più sotto; contatti.lead_id viene aggiunto dopo.
create table public.contatti (
  id               uuid primary key default gen_random_uuid(),
  tipo             text not null default 'Cliente' check (tipo in ('Cliente', 'Fornitore', 'Entrambi')),
  nome             text not null default '',
  telefono         text not null default '',
  email            text not null default '',
  codice_fiscale   text not null default '',
  residenza        text not null default '',
  nascita_sede     text not null default '',
  numero_patente   text not null default '',       -- solo noleggio
  scadenza_patente date,
  numero_documento text not null default '',
  note             text not null default '',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index idx_contatti_nome on public.contatti (lower(nome));
create index idx_contatti_telefono on public.contatti (telefono);
create trigger trg_contatti_updated before update on public.contatti
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 5. Richieste dei clienti (form del sito + Casper)
-- ---------------------------------------------------------------------

create table public.leads (
  id                  uuid primary key default gen_random_uuid(),
  type                text not null check (type in ('contatto', 'test_drive', 'commissione', 'conto_vendita', 'casper')),
  status              text not null default 'nuovo' check (status in ('nuovo', 'in_gestione', 'completato', 'scartato')),
  phone               text not null check (length(trim(phone)) >= 6),
  name                text,
  email               text,
  message             text,
  car_id              uuid references public.cars(id) on delete set null,
  car_label           text,                        -- copia testuale: resta se l'auto viene eliminata
  contatto_id         uuid references public.contatti(id) on delete set null,   -- creato da "Salva in anagrafica"
  details             jsonb,                       -- budget, anno minimo, km, prezzo desiderato…
  source_path         text,                        -- pagina di partenza, es. "/catalogo"
  privacy_accepted_at timestamptz,                 -- vuoto finché i form non hanno la checkbox
  assigned_to         uuid references public.staff_profiles(id) on delete set null,
  internal_notes      text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index idx_leads_status on public.leads (status, created_at desc);
create index idx_leads_car on public.leads (car_id);
create index idx_leads_phone on public.leads (phone, created_at desc);   -- per scoprire i doppi invii
create trigger trg_leads_updated before update on public.leads
  for each row execute function public.set_updated_at();

-- Se la richiesta cita un'auto che non esiste più il collegamento si toglie, ma la richiesta si salva.
-- (Un id che non è un uuid va scartato prima, in src/lib/leads/validate.ts.)
create or replace function public.leads_fix_car()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  if new.car_id is not null and not exists (select 1 from public.cars where id = new.car_id) then
    new.car_id := null;
  end if;
  return new;
end;
$$;
create trigger trg_leads_fixcar before insert on public.leads
  for each row execute function public.leads_fix_car();

alter table public.contatti add column lead_id uuid references public.leads(id) on delete set null;

alter table public.leads enable row level security;
create policy "leads: staff legge" on public.leads
  for select to authenticated using ((select public.is_staff()));
create policy "leads: staff modifica" on public.leads
  for update to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "leads: solo admin elimina" on public.leads
  for delete to authenticated using ((select public.is_admin()));
-- Nessuna policy di INSERT: i lead arrivano dal server con la service role key.

alter table public.contatti enable row level security;
create policy "contatti: staff legge" on public.contatti
  for select to authenticated using ((select public.is_staff()));
create policy "contatti: staff inserisce" on public.contatti
  for insert to authenticated with check ((select public.is_staff()));
create policy "contatti: staff modifica" on public.contatti
  for update to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "contatti: solo admin elimina" on public.contatti
  for delete to authenticated using ((select public.is_admin()));

-- Conversazioni di Casper: solo con consenso e per un tempo limitato (GDPR).
create table public.casper_conversations (
  id          uuid primary key default gen_random_uuid(),
  session_id  text not null,
  consent_at  timestamptz not null,
  lead_id     uuid references public.leads(id) on delete set null,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '30 days'
);
create index idx_casper_conv_expires on public.casper_conversations (expires_at);

create table public.casper_messages (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid not null references public.casper_conversations(id) on delete cascade,
  role             text not null check (role in ('user', 'casper')),
  content          text not null,
  car_ids          uuid[] not null default '{}',
  created_at       timestamptz not null default now()
);
create index idx_casper_msg_conv on public.casper_messages (conversation_id, created_at);

alter table public.casper_conversations enable row level security;
alter table public.casper_messages enable row level security;
create policy "casper_conversations: solo admin legge" on public.casper_conversations
  for select to authenticated using ((select public.is_admin()));
create policy "casper_messages: solo admin legge" on public.casper_messages
  for select to authenticated using ((select public.is_admin()));
-- Scrittura: solo server (service role).

create or replace function public.purge_expired_casper()
returns int language plpgsql security definer set search_path = public, pg_temp as $$
declare n int;
begin
  delete from public.casper_conversations where expires_at < now();
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke all on function public.purge_expired_casper() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 6. Agenda
-- ---------------------------------------------------------------------

create table public.appointments (
  id                uuid primary key default gen_random_uuid(),
  lead_id           uuid references public.leads(id) on delete set null,   -- "Fissa in agenda" da una richiesta
  client_name       text not null,
  client_phone      text not null default '',
  client_email      text not null default '',
  starts_at         timestamptz not null,
  duration_minutes  int not null default 60 check (duration_minutes > 0),
  type              text not null check (type in
                      ('Test Drive', 'Trattativa / Acquisto', 'Consegna Vettura',
                       'Perizia Permuta', 'Consulenza Finanziamento', 'Ritiro Documenti')),
  car_id            uuid references public.cars(id) on delete set null,
  car_label         text not null default '',
  location          text not null default '',
  status            text not null default 'In Attesa' check (status in ('Confermato', 'In Attesa', 'Completato', 'Annullato')),
  notes             text not null default '',
  created_by        uuid references public.staff_profiles(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  -- Giorno e ora locali (Europe/Rome), nella forma che usa il codice.
  local_date        date generated always as ((starts_at at time zone 'Europe/Rome')::date) stored,
  local_time        time generated always as ((starts_at at time zone 'Europe/Rome')::time) stored
);
create index idx_appointments_starts on public.appointments (starts_at);
create index idx_appointments_day on public.appointments (local_date, status);
create index idx_appointments_lead on public.appointments (lead_id);
create trigger trg_appointments_updated before update on public.appointments
  for each row execute function public.set_updated_at();

alter table public.appointments enable row level security;
create policy "appointments: staff gestisce" on public.appointments
  for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));

-- ---------------------------------------------------------------------
-- 7. Documenti delle auto (dossier)
-- ---------------------------------------------------------------------

create table public.vehicle_documents (
  id                uuid primary key default gen_random_uuid(),
  -- Un documento appartiene all'auto del catalogo (car_id) oppure, per le auto fuori catalogo, alla
  -- scheda economica (veicolo_id). Quando un'auto esce dal catalogo i suoi documenti passano alla scheda.
  car_id            uuid references public.cars(id) on delete cascade,
  veicolo_id        uuid,   -- FK verso veicoli aggiunta più sotto, dopo la creazione della tabella
  title             text not null,
  category          text not null check (category in
                      ('Contratto di Vendita', 'Libretto / DUC', 'Certificato Proprietà',
                       'Tagliandi & Manutenzione', 'Perizia 110 Punti', 'Garanzia & Assicurazione', 'Altro')),
  -- 'upload' = file caricato nel bucket vehicle-documents (nel codice di oggi non c'è ancora).
  source            text not null default 'google_drive' check (source in ('google_drive', 'generated_html', 'local_pdf', 'upload')),
  file_url          text,                          -- link Drive o risorsa esterna
  drive_folder_url  text,
  storage_path      text,                          -- se source = 'upload' / 'local_pdf'
  file_name         text,
  file_size_bytes   bigint,
  notes             text not null default '',
  created_by        uuid references public.staff_profiles(id) on delete set null,
  created_at        timestamptz not null default now(),
  check (car_id is not null or veicolo_id is not null)
);
create index idx_vehicle_documents_car on public.vehicle_documents (car_id, category);
create index idx_vehicle_documents_veicolo on public.vehicle_documents (veicolo_id, category);

alter table public.vehicle_documents enable row level security;
create policy "vehicle_documents: staff legge" on public.vehicle_documents
  for select to authenticated
  using ((select public.is_staff()) and (category <> 'Contratto di Vendita' or (select public.is_admin())));
create policy "vehicle_documents: staff inserisce" on public.vehicle_documents
  for insert to authenticated with check ((select public.is_staff()));
create policy "vehicle_documents: staff modifica" on public.vehicle_documents
  for update to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "vehicle_documents: solo admin elimina" on public.vehicle_documents
  for delete to authenticated using ((select public.is_admin()));

-- ---------------------------------------------------------------------
-- 8. GESTIONALE — impostazioni, categorie, schede economiche, movimenti
-- ---------------------------------------------------------------------

-- Parametri di calcolo (una riga). I dati dell'azienda NON stanno qui:
-- si leggono da site_settings (/admin/sito).
create table public.impostazioni (
  id                          int primary key default 1 check (id = 1),
  anno_gestione               int not null default extract(year from now())::int,
  aliquota_iva                numeric(5,4) not null default 0.22,
  maggiorazione_trimestrale   numeric(5,4) not null default 0.01,
  commissione_predefinita     numeric(5,4) not null default 0.07,
  soglia_roi                  numeric(5,4) not null default 0.15,
  soglia_giorni_stock         int not null default 60,
  pec_azienda                 text not null default '',
  prossimo_numero_contratto   int not null default 1 check (prossimo_numero_contratto >= 1),
  updated_at                  timestamptz not null default now()
);
insert into public.impostazioni (id) values (1);
create trigger trg_impostazioni_updated before update on public.impostazioni
  for each row execute function public.set_updated_at();

-- Categorie dei movimenti: un elenco modificabile invece di un elenco fisso nel codice.
create table public.categorie_movimento (
  nome   text primary key,
  ordine int not null default 0
);
insert into public.categorie_movimento (nome, ordine)
select nome, ord from unnest(array[
  'Acquisto veicolo', 'Pratiche / Minivoltura', 'Trasporto', 'Meccanica / Tagliando', 'Carrozzeria',
  'Pneumatici / Assetto', 'Lavaggio / Detailing', 'Garanzia', 'Pubblicità', 'Ricambi', 'Commercialista',
  'Assicurazioni', 'Software / Canoni', 'Personale', 'Banca / Commissioni', 'Utenze / Telefonia',
  'Costi generali', 'Altro', 'Vendita veicolo', 'Intermediazione conto vendita'
]) with ordinality as t(nome, ord);

-- Scheda economica di un'auto. Se car_id è valorizzato è un'auto del catalogo
-- (relazione 1:1); può esistere anche senza (appena acquistata, archiviata…).
create table public.veicoli (
  id                       uuid primary key default gen_random_uuid(),
  car_id                   uuid unique references public.cars(id) on delete set null,
  fornitore_id             uuid references public.contatti(id) on delete set null,   -- da chi è stata acquistata
  acquirente_id            uuid references public.contatti(id) on delete set null,   -- a chi è stata venduta
  marca                    text not null default '',
  modello                  text not null default '',
  targa                    text not null default '',
  versione                 text not null default '',
  chilometraggio           int not null default 0 check (chilometraggio >= 0),
  alimentazione            text not null default '' check (alimentazione in
                             ('', 'Benzina', 'Diesel', 'GPL', 'Metano', 'Ibrida', 'Elettrica')),
  servizio                 text not null default 'Vendita diretta' check (servizio in
                             ('Vendita diretta', 'Conto vendita', 'Auto su commissione')),
  stato                    text not null default 'In valutazione' check (stato in
                             ('In valutazione', 'Acquistata', 'In preparazione', 'In vendita', 'Prenotata', 'Venduta', 'Archiviata')),
  fatturata                boolean not null default false,
  passaggio_proprieta      boolean not null default false,
  garanzia                 boolean not null default false,
  data_acquisto            date,
  data_vendita             date,
  prezzo_acquisto          numeric(12,2) not null default 0 check (prezzo_acquisto >= 0),
  prezzo_vendita           numeric(12,2) check (prezzo_vendita is null or prezzo_vendita >= 0),   -- prezzo realmente incassato
  commissione_percentuale  numeric(5,4) not null default 0.07 check (commissione_percentuale between 0 and 1),
  numero_fattura           text not null default '',
  note                     text not null default '',
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  check (data_vendita is null or data_acquisto is null or data_vendita >= data_acquisto)
);
create unique index uq_veicoli_targa on public.veicoli (upper(targa)) where targa <> '';
alter table public.vehicle_documents
  add constraint vehicle_documents_veicolo_fk foreign key (veicolo_id) references public.veicoli(id) on delete cascade;
create index idx_veicoli_stato on public.veicoli (stato);
create index idx_veicoli_fornitore on public.veicoli (fornitore_id);
create index idx_veicoli_acquirente on public.veicoli (acquirente_id);
create index idx_veicoli_vendita on public.veicoli (data_vendita);
create trigger trg_veicoli_updated before update on public.veicoli
  for each row execute function public.set_updated_at();

-- Libro cassa/banca. auto_id nullo = costo generale dell'attività.
create table public.movimenti (
  id                    uuid primary key default gen_random_uuid(),
  data                  date not null default current_date,
  auto_id               uuid references public.veicoli(id) on delete cascade,
  contatto_id           uuid references public.contatti(id) on delete set null,
  descrizione           text not null default '',
  fornitore_cliente     text not null default '',   -- testo libero (resta se il contatto viene eliminato)
  tipo                  text not null default 'Uscita' check (tipo in ('Entrata', 'Uscita')),
  categoria             text not null default 'Altro' references public.categorie_movimento(nome) on update cascade,
  natura_costo          text not null default 'Variabile diretto auto' check (natura_costo in
                          ('Fisso', 'Variabile diretto auto', 'Variabile generale')),
  pagamento             text not null default 'CONTO' check (pagamento in ('CONTO', 'CASH', 'Carta', 'Bonifico', 'Altro')),
  imponibile            numeric(12,2) not null default 0,
  iva                   numeric(12,2) not null default 0,
  totale                numeric(12,2) generated always as (imponibile + iva) stored,
  iva_detraibile        boolean not null default false,
  data_scadenza         date,
  stato_pagamento       text not null default 'Saldato' check (stato_pagamento in ('Saldato', 'Da saldare')),
  data_saldo            date,
  numero_documento      text not null default '',
  riconciliato          boolean not null default false,
  riferimento_estratto  text not null default '',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index idx_movimenti_auto on public.movimenti (auto_id);
create index idx_movimenti_data on public.movimenti (data);
create index idx_movimenti_da_saldare on public.movimenti (data_scadenza) where stato_pagamento = 'Da saldare';
create index idx_movimenti_banca on public.movimenti (data) where pagamento in ('CONTO', 'Bonifico') and not riconciliato;
create trigger trg_movimenti_updated before update on public.movimenti
  for each row execute function public.set_updated_at();

-- Registro dei contratti di vendita. Numero progressivo per anno, senza buchi
-- né doppioni (lo assegna register_sale). Dei dati personali dell'acquirente
-- resta solo il collegamento al contatto; il PDF è facoltativo e sta nel
-- bucket privato "contratti". Definire per quanto tempo conservarli (GDPR).
create table public.sale_contracts (
  id                   uuid primary key default gen_random_uuid(),
  numero               int not null,
  anno                 int not null,
  veicolo_id           uuid not null references public.veicoli(id) on delete restrict,
  contatto_id          uuid references public.contatti(id) on delete set null,
  prezzo_vendita       numeric(12,2) not null check (prezzo_vendita >= 0),
  data_vendita         date not null,
  data_consegna        date,
  strumento_pagamento  text not null default '',
  estensione_garanzia  boolean not null default false,
  luogo_data           text not null default '',
  pdf_path             text,
  created_by           uuid references public.staff_profiles(id) on delete set null,
  created_at           timestamptz not null default now(),
  unique (anno, numero)
);
create index idx_sale_contracts_veicolo on public.sale_contracts (veicolo_id);

-- Accesso: SOLO admin su tutto il gestionale economico.
alter table public.impostazioni enable row level security;
alter table public.categorie_movimento enable row level security;
alter table public.veicoli enable row level security;
alter table public.movimenti enable row level security;
alter table public.sale_contracts enable row level security;

create policy "impostazioni: admin legge" on public.impostazioni
  for select to authenticated using ((select public.is_admin()));
create policy "impostazioni: admin modifica" on public.impostazioni
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "categorie_movimento: admin gestisce" on public.categorie_movimento
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "veicoli: admin gestisce" on public.veicoli
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "movimenti: admin gestisce" on public.movimenti
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "sale_contracts: admin legge" on public.sale_contracts
  for select to authenticated using ((select public.is_admin()));
create policy "sale_contracts: admin allega il pdf" on public.sale_contracts
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
-- I contratti nascono solo con register_sale(); l'UPDATE serve a collegare pdf_path.

-- ---------------------------------------------------------------------
-- 9. Catalogo ⇄ scheda economica: stato e visibilità sempre allineati
--    (stesse regole di catalogoDaStato / statoDaCatalogo in src/lib/gestionale/calc.ts)
-- ---------------------------------------------------------------------

-- Ogni auto del catalogo ha la sua scheda economica, creata qui così anche un
-- 'operatore' (che non vede i conti) può aggiungere auto.
create or replace function public.cars_create_scheda()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into public.veicoli (car_id, marca, modello, versione, chilometraggio, alimentazione, stato)
  values (
    new.id, new.brand, new.model, new.version, new.mileage, new.fuel,
    case
      when new.status = 'Venduta' then 'Venduta'
      when new.hidden then 'In preparazione'
      when new.status = 'In Trattativa' then 'Prenotata'
      else 'In vendita'
    end
  )
  on conflict (car_id) do nothing;
  return new;
end;
$$;
create trigger trg_cars_create_scheda after insert on public.cars
  for each row execute function public.cars_create_scheda();

-- scheda → catalogo. Gli stati prima della vendita nascondono l'auto dal sito.
create or replace function public.veicoli_sync_car()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if pg_trigger_depth() > 1 or new.car_id is null or new.stato is not distinct from old.stato then
    return null;
  end if;
  update public.cars set
    status   = case new.stato when 'Prenotata' then 'In Trattativa' when 'Venduta' then 'Venduta' else 'Disponibile' end,
    hidden   = case when new.stato in ('In vendita', 'Prenotata') then false
                    when new.stato = 'Venduta' then hidden
                    else true end,
    featured = case when new.stato in ('In vendita', 'Prenotata') then featured else false end
  where id = new.car_id;
  return null;
end;
$$;
create trigger trg_veicoli_sync_car after update of stato on public.veicoli
  for each row execute function public.veicoli_sync_car();

-- catalogo → scheda. Cambia la scheda solo se lo stato pubblico non coincide già.
create or replace function public.cars_sync_veicolo()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v public.veicoli;
  pubblico text;
begin
  if pg_trigger_depth() > 1 or new.status is not distinct from old.status then
    return null;
  end if;
  select * into v from public.veicoli where car_id = new.id;
  if not found then
    return null;
  end if;
  pubblico := case v.stato when 'Prenotata' then 'In Trattativa' when 'Venduta' then 'Venduta' else 'Disponibile' end;
  if pubblico is distinct from new.status then
    update public.veicoli set stato = case new.status
        when 'In Trattativa' then 'Prenotata' when 'Venduta' then 'Venduta' else 'In vendita' end
      where id = v.id;
  end if;
  return null;
end;
$$;
create trigger trg_cars_sync_veicolo after update of status on public.cars
  for each row execute function public.cars_sync_veicolo();

-- Dati tecnici: se cambiano nel catalogo si riallineano nella scheda (anche quando a salvare
-- è un 'operatore', che non può scrivere in veicoli).
create or replace function public.cars_sync_dati()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  update public.veicoli
     set marca = new.brand, modello = new.model, versione = new.version,
         chilometraggio = new.mileage, alimentazione = new.fuel
   where car_id = new.id;
  return null;
end;
$$;
create trigger trg_cars_sync_dati after update of brand, model, version, mileage, fuel on public.cars
  for each row execute function public.cars_sync_dati();

-- Visibilità: nascondere un'auto in vendita la riporta "In preparazione"; mostrarla la pubblica.
create or replace function public.cars_sync_visibilita()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare v public.veicoli;
begin
  if pg_trigger_depth() > 1 or new.hidden is not distinct from old.hidden then
    return null;
  end if;
  select * into v from public.veicoli where car_id = new.id;
  if not found then
    return null;
  end if;
  if new.hidden and v.stato in ('In vendita', 'Prenotata') then
    update public.veicoli set stato = 'In preparazione' where id = v.id;
  elsif not new.hidden and v.stato in ('In valutazione', 'Acquistata', 'In preparazione') then
    update public.veicoli set stato = case new.status
        when 'In Trattativa' then 'Prenotata' when 'Venduta' then 'Venduta' else 'In vendita' end
      where id = v.id;
  end if;
  return null;
end;
$$;
create trigger trg_cars_sync_visibilita after update of hidden on public.cars
  for each row execute function public.cars_sync_visibilita();

-- Eliminare un'auto dal catalogo archivia la sua scheda (se non è venduta): i conti restano.
create or replace function public.cars_archivia_scheda()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  update public.veicoli set stato = 'Archiviata' where car_id = old.id and stato <> 'Venduta';
  -- Il dossier non si perde con l'auto (contratto di vendita compreso): passa alla scheda economica.
  update public.vehicle_documents d
     set veicolo_id = v.id, car_id = null
    from public.veicoli v
   where v.car_id = old.id and d.car_id = old.id;
  return old;
end;
$$;
create trigger trg_cars_archivia before delete on public.cars
  for each row execute function public.cars_archivia_scheda();

-- Un contatto eliminato non deve far perdere il nome sulle prenotazioni e sui preventivi.
create or replace function public.contatti_conserva_nome()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  update public.noleggio_prenotazioni set cliente_nome_libero = old.nome
   where contatto_id = old.id and cliente_nome_libero = '';
  update public.noleggio_preventivi set cliente_nome_libero = old.nome
   where contatto_id = old.id and cliente_nome_libero = '';
  return old;
end;
$$;

-- ---------------------------------------------------------------------
-- 10. Vendita: un solo passaggio atomico (numero contratto, cliente, auto)
-- ---------------------------------------------------------------------

-- Registra una vendita in un solo passaggio (stesse regole di registraVendita nel codice):
--   * numero del contratto progressivo PER ANNO di vendita, senza buchi né doppioni
--   * cliente collegato in anagrafica (quello scelto, o per nome, o nuovo; un fornitore diventa "Entrambi")
--   * auto venduta (il trigger aggiorna il catalogo), con acquirente
--   * incasso atteso tra i movimenti (da saldare): prezzo, oppure commissione + IVA per il conto vendita
--   * richieste aperte dello stesso telefono chiuse
-- Il PDF va generato DOPO, con numero e anno restituiti, così il numero stampato è quello vero.
-- p_acquirente: {"nome","nascitaSede","codiceFiscale","residenza","telefono","email"}
create or replace function public.register_sale(
  p_veicolo_id           uuid,
  p_prezzo_vendita       numeric,
  p_data_vendita         date,
  p_acquirente           jsonb,
  p_contatto_id          uuid default null,
  p_data_consegna        date default null,
  p_strumento_pagamento  text default '',
  p_estensione_garanzia  boolean default false,
  p_luogo_data           text default ''
) returns public.sale_contracts
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_nome      text := trim(coalesce(p_acquirente ->> 'nome', ''));
  v_tel       text := regexp_replace(coalesce(p_acquirente ->> 'telefono', ''), '\D', '', 'g');
  v_veicolo   public.veicoli;
  v_imp       public.impostazioni;
  v_contatto  uuid := p_contatto_id;
  v_anno      int := extract(year from p_data_vendita)::int;
  v_numero    int;
  v_imponibile numeric;
  v_categoria text;
  v_contratto public.sale_contracts;
begin
  if not (select public.is_admin()) then
    raise exception 'Solo un admin può registrare una vendita' using errcode = '42501';
  end if;
  if p_prezzo_vendita is null or p_prezzo_vendita <= 0 then
    raise exception 'Il prezzo di vendita deve essere maggiore di zero';
  end if;
  select * into v_veicolo from public.veicoli where id = p_veicolo_id for update;
  if not found then
    raise exception 'Scheda auto non trovata';
  end if;
  select * into v_imp from public.impostazioni where id = 1;

  -- Numero progressivo dell'anno di vendita; il lock serializza due contratti nello stesso istante.
  perform pg_advisory_xact_lock(hashtext('sale_contract:' || v_anno));
  select coalesce(max(numero), 0) + 1 into v_numero from public.sale_contracts where anno = v_anno;
  update public.impostazioni set prossimo_numero_contratto = v_numero + 1 where id = 1;   -- anteprima per l'interfaccia

  -- Cliente in anagrafica.
  if v_contatto is null and v_nome <> '' then
    select id into v_contatto from public.contatti where lower(trim(nome)) = lower(v_nome) limit 1;
  end if;
  if v_contatto is null and v_nome <> '' then
    insert into public.contatti (tipo, nome, telefono, email, codice_fiscale, residenza, nascita_sede)
    values ('Cliente', v_nome,
            coalesce(p_acquirente ->> 'telefono', ''), coalesce(p_acquirente ->> 'email', ''),
            coalesce(p_acquirente ->> 'codiceFiscale', ''), coalesce(p_acquirente ->> 'residenza', ''),
            coalesce(p_acquirente ->> 'nascitaSede', ''))
    returning id into v_contatto;
  elsif v_contatto is not null then
    -- Si completano solo i dati che mancano; un fornitore che compra diventa "Entrambi".
    update public.contatti set
      tipo           = case when tipo = 'Fornitore' then 'Entrambi' else tipo end,
      telefono       = coalesce(nullif(telefono, ''), p_acquirente ->> 'telefono', ''),
      email          = coalesce(nullif(email, ''), p_acquirente ->> 'email', ''),
      codice_fiscale = coalesce(nullif(codice_fiscale, ''), p_acquirente ->> 'codiceFiscale', ''),
      residenza      = coalesce(nullif(residenza, ''), p_acquirente ->> 'residenza', ''),
      nascita_sede   = coalesce(nullif(nascita_sede, ''), p_acquirente ->> 'nascitaSede', '')
    where id = v_contatto;
  end if;

  -- L'auto risulta venduta; il trigger aggiorna il catalogo.
  update public.veicoli
     set prezzo_vendita = p_prezzo_vendita, data_vendita = p_data_vendita,
         stato = 'Venduta', acquirente_id = v_contatto
   where id = p_veicolo_id;

  -- Incasso atteso (una sola volta per auto).
  v_categoria := case when v_veicolo.servizio = 'Conto vendita' then 'Intermediazione conto vendita' else 'Vendita veicolo' end;
  if not exists (select 1 from public.movimenti
                  where auto_id = p_veicolo_id and tipo = 'Entrata' and categoria = v_categoria) then
    v_imponibile := case when v_veicolo.servizio = 'Conto vendita'
                         then p_prezzo_vendita * v_veicolo.commissione_percentuale else p_prezzo_vendita end;
    insert into public.movimenti (
      data, auto_id, contatto_id, descrizione, fornitore_cliente, tipo, categoria, natura_costo,
      pagamento, imponibile, iva, stato_pagamento, numero_documento)
    values (
      p_data_vendita, p_veicolo_id, v_contatto,
      'Vendita ' || trim(concat_ws(' ', v_veicolo.marca, v_veicolo.modello, v_veicolo.targa)),
      v_nome, 'Entrata', v_categoria, 'Variabile generale',
      case p_strumento_pagamento when 'Bonifico bancario' then 'Bonifico' when 'Contanti' then 'CASH' else 'CONTO' end,
      v_imponibile,
      case when v_veicolo.servizio = 'Conto vendita' then v_imponibile * v_imp.aliquota_iva else 0 end,
      'Da saldare', v_veicolo.numero_fattura);
  end if;

  -- La richiesta di chi ha comprato è chiusa.
  if v_tel <> '' then
    update public.leads set status = 'completato'
     where status in ('nuovo', 'in_gestione') and regexp_replace(phone, '\D', '', 'g') = v_tel;
  end if;

  insert into public.sale_contracts (
    numero, anno, veicolo_id, contatto_id, prezzo_vendita, data_vendita, data_consegna,
    strumento_pagamento, estensione_garanzia, luogo_data, created_by)
  values (
    v_numero, v_anno, p_veicolo_id, v_contatto, p_prezzo_vendita, p_data_vendita, p_data_consegna,
    coalesce(p_strumento_pagamento, ''), coalesce(p_estensione_garanzia, false), coalesce(p_luogo_data, ''), auth.uid())
  returning * into v_contratto;

  return v_contratto;
end;
$$;
revoke all on function public.register_sale(uuid, numeric, date, jsonb, uuid, date, text, boolean, text) from public, anon;
grant execute on function public.register_sale(uuid, numeric, date, jsonb, uuid, date, text, boolean, text) to authenticated;

-- ---------------------------------------------------------------------
-- 11. Conti calcolati (stessa formula di computeVeicolo in src/lib/gestionale/calc.ts)
-- ---------------------------------------------------------------------

create view public.veicoli_conti with (security_invoker = true) as
with base as (
  select v.*,
         i.aliquota_iva,
         coalesce((select sum(m.totale) from public.movimenti m
                    where m.auto_id = v.id and m.tipo = 'Uscita'
                      and m.natura_costo = 'Variabile diretto auto' and m.categoria <> 'Acquisto veicolo'), 0) as costi_diretti_calc,
         (v.prezzo_vendita is not null and v.prezzo_vendita <> 0) as ha_vendita
    from public.veicoli v
   cross join public.impostazioni i
   where i.id = 1
), c1 as (
  select base.*,
         case when servizio = 'Conto vendita' then costi_diretti_calc
              else coalesce(prezzo_acquisto, 0) + costi_diretti_calc end as costo_totale,
         case when servizio = 'Conto vendita' and ha_vendita then prezzo_vendita * commissione_percentuale end as commissione_imponibile,
         case when servizio <> 'Conto vendita' and ha_vendita then greatest(0, prezzo_vendita - prezzo_acquisto) end as margine_regime_iva
    from base
), c2 as (
  select c1.*,
         commissione_imponibile * aliquota_iva as iva_commissione,
         margine_regime_iva * (aliquota_iva / (1 + aliquota_iva)) as iva_regime_margine,
         case when servizio = 'Conto vendita' then commissione_imponibile - costi_diretti_calc
              when ha_vendita then prezzo_vendita - costo_totale end as margine_gestionale
    from c1
), c3 as (
  select c2.*,
         case when servizio = 'Conto vendita' then margine_gestionale
              else margine_gestionale - coalesce(iva_regime_margine, 0) end as risultato_dopo_iva,
         case when data_acquisto is null then null
              else greatest(0, coalesce(data_vendita, current_date) - data_acquisto) end as giorni_stock
    from c2
)
select id, car_id, servizio, stato, data_vendita,
       costi_diretti_calc as costi_diretti,
       costo_totale,
       commissione_imponibile,
       iva_commissione,
       commissione_imponibile + iva_commissione as totale_fattura_intermediazione,
       margine_gestionale,
       margine_regime_iva,
       iva_regime_margine,
       risultato_dopo_iva,
       risultato_dopo_iva / nullif(costo_totale, 0) as roi,
       giorni_stock,
       risultato_dopo_iva / nullif(giorni_stock, 0) as margine_giorno
  from c3;

-- Liquidazione IVA per anno e trimestre (stessa logica di liquidazioneTrimestre).
create view public.liquidazione_iva with (security_invoker = true) as
with vendite as (
  select extract(year from c.data_vendita)::int as anno,
         extract(quarter from c.data_vendita)::int as trimestre,
         sum(case when c.servizio <> 'Conto vendita' then coalesce(c.iva_regime_margine, 0) else 0 end) as iva_margine,
         sum(case when c.servizio = 'Conto vendita' then coalesce(c.iva_commissione, 0) else 0 end) as iva_commissioni
    from public.veicoli_conti c
   where c.data_vendita is not null
   group by 1, 2
), acquisti as (
  select extract(year from m.data)::int as anno,
         extract(quarter from m.data)::int as trimestre,
         sum(m.iva) as iva_detraibile
    from public.movimenti m
   where m.iva_detraibile and m.tipo = 'Uscita'
   group by 1, 2
), unite as (
  select coalesce(v.anno, a.anno) as anno,
         coalesce(v.trimestre, a.trimestre) as trimestre,
         coalesce(v.iva_margine, 0) as iva_margine,
         coalesce(v.iva_commissioni, 0) as iva_commissioni,
         coalesce(a.iva_detraibile, 0) as iva_detraibile
    from vendite v
    full join acquisti a on a.anno = v.anno and a.trimestre = v.trimestre
), saldi as (
  select u.*, greatest(0, u.iva_margine + u.iva_commissioni - u.iva_detraibile) as saldo_base
    from unite u
)
select s.anno, s.trimestre, s.iva_margine, s.iva_commissioni, s.iva_detraibile, s.saldo_base,
       s.saldo_base * i.maggiorazione_trimestrale as maggiorazione,
       s.saldo_base * (1 + i.maggiorazione_trimestrale) as totale_da_versare
  from saldi s
 cross join public.impostazioni i
 where i.id = 1;

grant select on public.veicoli_conti, public.liquidazione_iva to authenticated;
revoke all on public.veicoli_conti, public.liquidazione_iva from anon;

-- ---------------------------------------------------------------------
-- 12. NOLEGGIO (Global Rent)
-- ---------------------------------------------------------------------
-- I clienti del noleggio sono i contatti (con patente e documento).

create table public.noleggio_veicoli (
  id                    uuid primary key default gen_random_uuid(),
  marca                 text not null default '',
  modello               text not null default '',
  targa                 text not null default '',
  categoria             text not null default 'Economy' check (categoria in
                          ('Economy', 'Compatta', 'Berlina', 'SUV', 'Furgone', 'Altro')),
  km_attuali            int not null default 0 check (km_attuali >= 0),
  tariffa_giornaliera   numeric(10,2) not null default 0 check (tariffa_giornaliera >= 0),
  stato                 text not null default 'Disponibile' check (stato in
                          ('Disponibile', 'Noleggiata', 'In manutenzione', 'Fuori servizio')),
  data_revisione        date,
  data_bollo            date,
  data_assicurazione    date,
  data_tagliando        date,
  note                  text not null default '',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create unique index uq_noleggio_veicoli_targa on public.noleggio_veicoli (upper(targa)) where targa <> '';
create trigger trg_noleggio_veicoli_updated before update on public.noleggio_veicoli
  for each row execute function public.set_updated_at();

create table public.noleggio_prenotazioni (
  id                     uuid primary key default gen_random_uuid(),
  veicolo_id             uuid not null references public.noleggio_veicoli(id) on delete cascade,
  contatto_id            uuid references public.contatti(id) on delete set null,
  cliente_nome_libero    text not null default '',     -- se il contatto non c'è ancora o è stato eliminato
  data_inizio            date not null,
  data_fine              date not null,
  tariffa_applicata      numeric(10,2) not null default 0 check (tariffa_applicata >= 0),
  cauzione               numeric(10,2) not null default 0 check (cauzione >= 0),
  stato                  text not null default 'Prenotata' check (stato in ('Prenotata', 'In corso', 'Conclusa', 'Annullata')),
  luogo_ritiro           text not null default '',
  luogo_riconsegna       text not null default '',
  km_ritiro              int,
  km_riconsegna          int,
  carburante_ritiro      text not null default '',
  carburante_riconsegna  text not null default '',
  extra                  text not null default '',
  note                   text not null default '',
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  check (data_fine >= data_inizio),
  -- Lo stesso veicolo non può avere due prenotazioni attive che si sovrappongono. L'auto è occupata
  -- dal giorno di ritiro a quello di riconsegna ESCLUSO: si può ritirare lo stesso giorno in cui un
  -- altro cliente la riporta (cambio nello stesso giorno) o più avanti. Un noleggio di un solo giorno
  -- occupa quel giorno (come fineOccupazione() in src/lib/gestionale/rent.ts).
  exclude using gist (
    veicolo_id with =,
    daterange(data_inizio, greatest(data_fine, data_inizio + 1), '[)') with &&
  ) where (stato in ('Prenotata', 'In corso'))
);
create index idx_noleggio_pren_periodo on public.noleggio_prenotazioni (data_inizio, data_fine);
create index idx_noleggio_pren_contatto on public.noleggio_prenotazioni (contatto_id);
create trigger trg_noleggio_prenotazioni_updated before update on public.noleggio_prenotazioni
  for each row execute function public.set_updated_at();

create table public.noleggio_tariffe (
  id                    uuid primary key default gen_random_uuid(),
  categoria             text not null check (categoria in ('Economy', 'Compatta', 'Berlina', 'SUV', 'Furgone', 'Altro')),
  nome_periodo          text not null default '',
  data_inizio           date not null,
  data_fine             date not null,
  tariffa_giornaliera   numeric(10,2) not null default 0 check (tariffa_giornaliera >= 0),
  created_at            timestamptz not null default now(),
  check (data_fine >= data_inizio)
);
create index idx_noleggio_tariffe on public.noleggio_tariffe (categoria, data_inizio, data_fine);

create table public.noleggio_preventivi (
  id                    uuid primary key default gen_random_uuid(),
  veicolo_id            uuid references public.noleggio_veicoli(id) on delete set null,
  contatto_id           uuid references public.contatti(id) on delete set null,
  cliente_nome_libero   text not null default '',
  categoria             text not null default 'Economy' check (categoria in
                          ('Economy', 'Compatta', 'Berlina', 'SUV', 'Furgone', 'Altro')),
  data_inizio           date not null,
  data_fine             date not null,
  luogo_ritiro          text not null default '',
  luogo_riconsegna      text not null default '',
  tariffa_applicata     numeric(10,2) not null default 0,
  giorni                int not null default 1 check (giorni >= 0),
  totale                numeric(12,2) not null default 0,
  stato                 text not null default 'Bozza' check (stato in ('Bozza', 'Inviato', 'Accettato', 'Rifiutato', 'Scaduto')),
  note                  text not null default '',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  check (data_fine >= data_inizio)
);
create trigger trg_noleggio_preventivi_updated before update on public.noleggio_preventivi
  for each row execute function public.set_updated_at();

create trigger trg_contatti_conserva_nome before delete on public.contatti
  for each row execute function public.contatti_conserva_nome();

alter table public.noleggio_veicoli enable row level security;
alter table public.noleggio_prenotazioni enable row level security;
alter table public.noleggio_tariffe enable row level security;
alter table public.noleggio_preventivi enable row level security;

create policy "noleggio_veicoli: staff legge" on public.noleggio_veicoli
  for select to authenticated using ((select public.is_staff()));
create policy "noleggio_veicoli: staff inserisce" on public.noleggio_veicoli
  for insert to authenticated with check ((select public.is_staff()));
create policy "noleggio_veicoli: staff modifica" on public.noleggio_veicoli
  for update to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "noleggio_veicoli: solo admin elimina" on public.noleggio_veicoli
  for delete to authenticated using ((select public.is_admin()));

create policy "noleggio_prenotazioni: staff gestisce" on public.noleggio_prenotazioni
  for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "noleggio_tariffe: staff gestisce" on public.noleggio_tariffe
  for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "noleggio_preventivi: staff gestisce" on public.noleggio_preventivi
  for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));

-- ---------------------------------------------------------------------
-- 13. Storico modifiche (chi ha fatto cosa) — lo scrive solo il database
-- ---------------------------------------------------------------------

create table public.storico (
  id               uuid primary key default gen_random_uuid(),
  tabella          text not null check (tabella in ('auto', 'movimenti', 'contatti', 'noleggio')),
  azione           text not null check (azione in ('Creato', 'Modificato', 'Eliminato')),
  oggetto          text not null default '',        -- "Fiat Panda · GB208RM", "Tagliando"…
  dettaglio        text not null default '',        -- "stato: In vendita → Venduta"
  record_id        uuid,
  dati_precedenti  jsonb,
  dati_nuovi       jsonb,
  utente_id        uuid references auth.users(id) on delete set null,
  utente           text not null default '',
  quando           timestamptz not null default now()
);
create index idx_storico_quando on public.storico (quando desc);
create index idx_storico_tabella on public.storico (tabella, quando desc);

alter table public.storico enable row level security;
create policy "storico: solo admin legge" on public.storico
  for select to authenticated using ((select public.is_admin()));

create or replace function public.log_storico()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_old     jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  v_new     jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
  v_row     jsonb := coalesce(v_new, v_old);
  v_tab     text;
  v_obj     text;
  v_det     text := '';
  v_n       int := 0;
  v_tot     int := 0;
  r         record;
  v_utente  text;
begin
  v_tab := case tg_table_name
    when 'veicoli' then 'auto'
    when 'movimenti' then 'movimenti'
    when 'contatti' then 'contatti'
    else 'noleggio' end;

  v_obj := case tg_table_name
    when 'veicoli' then concat_ws(' · ',
              nullif(trim(concat_ws(' ', v_row ->> 'marca', v_row ->> 'modello')), ''), nullif(v_row ->> 'targa', ''))
    when 'movimenti' then coalesce(nullif(v_row ->> 'descrizione', ''), v_row ->> 'categoria')
    when 'contatti' then nullif(v_row ->> 'nome', '')
    when 'noleggio_veicoli' then concat_ws(' · ',
              nullif(trim(concat_ws(' ', v_row ->> 'marca', v_row ->> 'modello')), ''), nullif(v_row ->> 'targa', ''))
    when 'noleggio_prenotazioni' then 'Prenotazione dal ' || coalesce(v_row ->> 'data_inizio', '')
    else tg_table_name end;

  if tg_op = 'UPDATE' then
    for r in
      select e.key, e.value from jsonb_each(v_new) e
       where e.key not in ('updated_at', 'totale') and (v_old -> e.key) is distinct from e.value
    loop
      v_tot := v_tot + 1;
      if v_n < 3 then
        v_det := v_det || case when v_det = '' then '' else ' · ' end
                 || replace(r.key, '_', ' ') || ': '
                 || coalesce(nullif(trim(both '"' from (v_old -> r.key)::text), 'null'), '—') || ' → '
                 || coalesce(nullif(trim(both '"' from r.value::text), 'null'), '—');
        v_n := v_n + 1;
      end if;
    end loop;
    if v_tot = 0 then
      return null;                                  -- è cambiato solo updated_at: niente da registrare
    end if;
    if v_tot > 3 then
      v_det := v_det || ' · e altri ' || (v_tot - 3);
    end if;
  end if;

  select coalesce(nullif(full_name, ''), email) into v_utente from public.staff_profiles where id = auth.uid();

  insert into public.storico (tabella, azione, oggetto, dettaglio, record_id, dati_precedenti, dati_nuovi, utente_id, utente)
  values (
    v_tab,
    case tg_op when 'INSERT' then 'Creato' when 'UPDATE' then 'Modificato' else 'Eliminato' end,
    coalesce(v_obj, ''), v_det, (v_row ->> 'id')::uuid, v_old, v_new, auth.uid(), coalesce(v_utente, 'Sistema'));
  return null;
end;
$$;

create trigger trg_storico_veicoli after insert or update or delete on public.veicoli
  for each row execute function public.log_storico();
create trigger trg_storico_movimenti after insert or update or delete on public.movimenti
  for each row execute function public.log_storico();
create trigger trg_storico_contatti after insert or update or delete on public.contatti
  for each row execute function public.log_storico();
create trigger trg_storico_noleggio_veicoli after insert or update or delete on public.noleggio_veicoli
  for each row execute function public.log_storico();
create trigger trg_storico_noleggio_prenotazioni after insert or update or delete on public.noleggio_prenotazioni
  for each row execute function public.log_storico();

-- ---------------------------------------------------------------------
-- 14. Notifiche allo staff (coda) e rate limit condiviso
-- ---------------------------------------------------------------------

-- Ogni nuova richiesta mette in coda una notifica; un worker (Edge Function o
-- il server) la invia con il provider scelto (es. Resend) e la segna 'inviata'.
create table public.outbox_notifiche (
  id          uuid primary key default gen_random_uuid(),
  tipo        text not null check (tipo in ('nuovo_lead')),
  payload     jsonb not null default '{}'::jsonb,
  stato       text not null default 'da_inviare' check (stato in ('da_inviare', 'inviata', 'errore')),
  tentativi   int not null default 0,
  errore      text,
  created_at  timestamptz not null default now(),
  sent_at     timestamptz
);
create index idx_outbox_da_inviare on public.outbox_notifiche (created_at) where stato = 'da_inviare';
alter table public.outbox_notifiche enable row level security;
-- Nessuna policy: lo usa solo il server con la service role key.

create or replace function public.enqueue_lead_notification()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into public.outbox_notifiche (tipo, payload)
  values ('nuovo_lead', jsonb_build_object(
    'lead_id', new.id, 'type', new.type, 'phone', new.phone, 'name', new.name,
    'car_label', new.car_label, 'message', new.message));
  return new;
end;
$$;
create trigger trg_leads_notify after insert on public.leads
  for each row execute function public.enqueue_lead_notification();

-- Rate limit a finestra fissa, condiviso tra tutte le istanze del server
-- (sostituisce quello in memoria di src/lib/leads/rateLimit.ts).
create table public.rate_limit_hits (
  key           text not null,                     -- es. "leads:" || indirizzo IP
  window_start  timestamptz not null,
  hits          int not null default 0,
  primary key (key, window_start)
);
alter table public.rate_limit_hits enable row level security;

-- true = richiesta consentita. Esempio: select check_rate_limit('leads:1.2.3.4', 5, interval '10 minutes');
create or replace function public.check_rate_limit(p_key text, p_max int, p_window interval)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare v_hits int;
begin
  insert into public.rate_limit_hits (key, window_start, hits)
  values (p_key, date_bin(p_window, now(), timestamptz 'epoch'), 1)
  on conflict (key, window_start) do update set hits = public.rate_limit_hits.hits + 1
  returning hits into v_hits;
  return v_hits <= p_max;
end;
$$;
revoke all on function public.check_rate_limit(text, int, interval) from public, anon, authenticated;

create or replace function public.purge_rate_limit()
returns void language sql security definer set search_path = public, pg_temp as $$
  delete from public.rate_limit_hits where window_start < now() - interval '1 day';
$$;
revoke all on function public.purge_rate_limit() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 15. Storage
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('car-photos',        'car-photos',        true,  10485760, array['image/jpeg', 'image/png', 'image/webp']),   -- foto del catalogo (lettura pubblica)
  ('vehicle-documents', 'vehicle-documents', false, 26214400, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']),
  ('contratti',         'contratti',         false, 26214400, array['application/pdf'])
on conflict (id) do nothing;
-- Nota: le foto di un'auto nascosta sono raggiungibili da chi ne conosce il percorso. Per tenerle
-- davvero private servirebbe un bucket non pubblico con URL firmati.

create policy "car-photos: lettura pubblica" on storage.objects
  for select to anon, authenticated using (bucket_id = 'car-photos');
create policy "car-photos: staff carica" on storage.objects
  for insert to authenticated with check (bucket_id = 'car-photos' and (select public.is_staff()));
create policy "car-photos: staff modifica" on storage.objects
  for update to authenticated using (bucket_id = 'car-photos' and (select public.is_staff()));
create policy "car-photos: staff elimina" on storage.objects
  for delete to authenticated using (bucket_id = 'car-photos' and (select public.is_staff()));

create policy "vehicle-documents: staff legge" on storage.objects
  for select to authenticated using (bucket_id = 'vehicle-documents' and (select public.is_staff()));
create policy "vehicle-documents: staff carica" on storage.objects
  for insert to authenticated with check (bucket_id = 'vehicle-documents' and (select public.is_staff()));
create policy "vehicle-documents: staff sostituisce" on storage.objects
  for update to authenticated using (bucket_id = 'vehicle-documents' and (select public.is_staff()));
create policy "vehicle-documents: solo admin elimina" on storage.objects
  for delete to authenticated using (bucket_id = 'vehicle-documents' and (select public.is_admin()));

create policy "contratti: solo admin" on storage.objects
  for all to authenticated
  using (bucket_id = 'contratti' and (select public.is_admin()))
  with check (bucket_id = 'contratti' and (select public.is_admin()));

commit;

-- =====================================================================
-- DOPO L'ESECUZIONE
--
-- 1) Crea i due utenti: Authentication → Users → Add user (email + password).
-- 2) Attivali e dai il ruolo (l'email deve coincidere):
--
--      update public.staff_profiles
--         set role = 'admin', active = true, full_name = 'Nome Cognome'
--       where email = 'primo@esempio.it';
--
--      update public.staff_profiles
--         set role = 'operatore', active = true, full_name = 'Nome Cognome'
--       where email = 'secondo@esempio.it';
--
--    (se entrambi devono vedere anche i conti, mettili tutti e due 'admin')
-- 3) Variabili d'ambiente del sito: NEXT_PUBLIC_SUPABASE_URL,
--    NEXT_PUBLIC_SUPABASE_ANON_KEY e, SOLO sul server, SUPABASE_SERVICE_ROLE_KEY
--    (serve a /api/leads, al rate limit e alla coda notifiche; mai nel browser).
-- 4) Pulizie periodiche (pg_cron o Edge Function schedulata):
--      select public.purge_expired_casper();
--      select public.purge_rate_limit();
-- 5) Tipi TypeScript: supabase gen types typescript --project-id <id>
-- =====================================================================
