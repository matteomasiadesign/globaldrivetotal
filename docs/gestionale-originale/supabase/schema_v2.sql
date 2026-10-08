-- ============================================================
-- SCHEMA GESTIONALE AUTO — v2 (con contabilità completa)
-- Esegui questo file nell'SQL Editor di Supabase.
-- Se avevi già eseguito lo schema precedente, esegui prima
-- DROP TABLE IF EXISTS spese, auto, profiles CASCADE;
-- per ripartire pulito (perderai i dati di test già inseriti).
-- ============================================================

create extension if not exists "pgcrypto";

drop table if exists spese cascade;
drop table if exists auto cascade;

-- ---------------------------------------------------------
-- Profili utente con ruolo
-- ---------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  ruolo text not null default 'venditore' check (ruolo in ('admin', 'venditore')),
  created_at timestamptz default now()
);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------
-- Impostazioni: una sola riga con i parametri globali
-- ---------------------------------------------------------
create table if not exists impostazioni (
  id int primary key default 1,
  anno_gestione int not null default 2026,
  aliquota_iva numeric not null default 0.22,
  maggiorazione_trimestrale numeric not null default 0.01,
  commissione_predefinita numeric not null default 0.07,
  soglia_roi numeric not null default 0.15,
  soglia_giorni_stock int not null default 60,
  constraint singleton check (id = 1)
);
insert into impostazioni (id) values (1) on conflict (id) do nothing;

-- ---------------------------------------------------------
-- Veicoli
-- ---------------------------------------------------------
create table if not exists veicoli (
  id uuid primary key default gen_random_uuid(),
  nome text default '',                        -- es. "LANCIA Y CK135MZ" (marca/modello + targa)
  servizio text not null default 'Vendita diretta'
    check (servizio in ('Vendita diretta', 'Conto vendita', 'Auto su commissione')),
  stato text not null default 'In valutazione'
    check (stato in ('In valutazione','Acquistata','In preparazione','In vendita','Prenotata','Venduta','Archiviata')),
  fatturata boolean default false,
  passaggio_proprieta boolean default false,
  garanzia boolean default false,
  data_acquisto date,
  data_vendita date,
  prezzo_acquisto numeric default 0,
  prezzo_vendita numeric,
  commissione_percentuale numeric default 0.07,
  note text default '',
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------------------------------------------------------
-- Movimenti: libro cassa/banca collegato (facoltativamente)
-- a un veicolo. auto_id nullo = costo generale d'azienda.
-- ---------------------------------------------------------
create table if not exists movimenti (
  id uuid primary key default gen_random_uuid(),
  data date not null default current_date,
  auto_id uuid references veicoli(id) on delete cascade,
  descrizione text default '',
  fornitore_cliente text default '',
  tipo text not null default 'Uscita' check (tipo in ('Entrata', 'Uscita')),
  categoria text default 'Altro',
  natura_costo text default 'Variabile diretto auto'
    check (natura_costo in ('Fisso', 'Variabile diretto auto', 'Variabile generale')),
  pagamento text default 'CONTO' check (pagamento in ('CONTO','CASH','Carta','Bonifico','Altro')),
  imponibile numeric default 0,
  iva numeric default 0,
  totale numeric generated always as (imponibile + iva) stored,
  iva_detraibile boolean default false,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create index if not exists idx_movimenti_auto on movimenti(auto_id);
create index if not exists idx_movimenti_data on movimenti(data);

-- ---------------------------------------------------------
-- Sicurezza
-- ---------------------------------------------------------
alter table profiles enable row level security;
alter table impostazioni enable row level security;
alter table veicoli enable row level security;
alter table movimenti enable row level security;

create policy "Autenticati leggono i profili" on profiles for select using (auth.role() = 'authenticated');

create policy "Autenticati leggono impostazioni" on impostazioni for select using (auth.role() = 'authenticated');
create policy "Solo admin modifica impostazioni" on impostazioni for update using (
  exists (select 1 from profiles where id = auth.uid() and ruolo = 'admin')
);

create policy "Autenticati leggono veicoli" on veicoli for select using (auth.role() = 'authenticated');
create policy "Autenticati inseriscono veicoli" on veicoli for insert with check (auth.role() = 'authenticated');
create policy "Autenticati modificano veicoli" on veicoli for update using (auth.role() = 'authenticated');
create policy "Solo admin elimina veicoli" on veicoli for delete using (
  exists (select 1 from profiles where id = auth.uid() and ruolo = 'admin')
);

create policy "Autenticati leggono movimenti" on movimenti for select using (auth.role() = 'authenticated');
create policy "Autenticati inseriscono movimenti" on movimenti for insert with check (auth.role() = 'authenticated');
create policy "Autenticati modificano movimenti" on movimenti for update using (auth.role() = 'authenticated');
create policy "Solo admin elimina movimenti" on movimenti for delete using (
  exists (select 1 from profiles where id = auth.uid() and ruolo = 'admin')
);

-- ---------------------------------------------------------
-- Dopo la prima registrazione, rendi admin il tuo utente:
--   update profiles set ruolo = 'admin' where email = 'tuaemail@esempio.it';
-- ---------------------------------------------------------
