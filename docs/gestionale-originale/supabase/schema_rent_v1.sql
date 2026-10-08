-- ============================================================
-- SCHEMA GLOBAL RENT — v1 (struttura base)
-- Stessa base Supabase di Global Drive: stesso login, stesso
-- sistema di ruoli, ma tabelle proprie (prefisso rent_) per
-- non mescolare mai i dati delle due attività.
-- ============================================================

-- ---------------------------------------------------------
-- Accesso per attività: per ora tutti gli utenti esistenti
-- mantengono accesso a entrambe (potrai restringere in seguito
-- assegnando accesso_rent = false a chi non deve vederlo).
-- ---------------------------------------------------------
alter table profiles add column if not exists accesso_drive boolean default true;
alter table profiles add column if not exists accesso_rent boolean default true;

-- ---------------------------------------------------------
-- Flotta a noleggio
-- ---------------------------------------------------------
create table if not exists rent_veicoli (
  id uuid primary key default gen_random_uuid(),
  marca text default '',
  modello text default '',
  targa text default '',
  categoria text default 'Economy' check (categoria in ('Economy', 'Compatta', 'Berlina', 'SUV', 'Furgone', 'Altro')),
  km_attuali numeric default 0,
  tariffa_giornaliera numeric default 0,
  stato text default 'Disponibile' check (stato in ('Disponibile', 'Noleggiata', 'In manutenzione', 'Fuori servizio')),
  data_revisione date,
  data_bollo date,
  data_assicurazione date,
  data_tagliando date,
  note text default '',
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

alter table rent_veicoli enable row level security;
create policy "Autenticati leggono rent_veicoli" on rent_veicoli for select using (auth.role() = 'authenticated');
create policy "Autenticati inseriscono rent_veicoli" on rent_veicoli for insert with check (auth.role() = 'authenticated');
create policy "Autenticati modificano rent_veicoli" on rent_veicoli for update using (auth.role() = 'authenticated');
create policy "Solo admin elimina rent_veicoli" on rent_veicoli for delete using (
  exists (select 1 from profiles where id = auth.uid() and ruolo = 'admin')
);

-- ---------------------------------------------------------
-- Clienti noleggio (patente e documento, non servivano in Drive)
-- ---------------------------------------------------------
create table if not exists rent_clienti (
  id uuid primary key default gen_random_uuid(),
  nome text not null default '',
  telefono text default '',
  email text default '',
  numero_patente text default '',
  scadenza_patente date,
  numero_documento text default '',
  note text default '',
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

alter table rent_clienti enable row level security;
create policy "Autenticati leggono rent_clienti" on rent_clienti for select using (auth.role() = 'authenticated');
create policy "Autenticati inseriscono rent_clienti" on rent_clienti for insert with check (auth.role() = 'authenticated');
create policy "Autenticati modificano rent_clienti" on rent_clienti for update using (auth.role() = 'authenticated');
create policy "Solo admin elimina rent_clienti" on rent_clienti for delete using (
  exists (select 1 from profiles where id = auth.uid() and ruolo = 'admin')
);

-- ---------------------------------------------------------
-- Prenotazioni / noleggi
-- Il vincolo "no_sovrapposizioni" impedisce a livello di
-- database di prenotare due volte la stessa auto sullo stesso
-- periodo, anche se due persone lo fanno nello stesso istante.
-- ---------------------------------------------------------
create extension if not exists btree_gist;

create table if not exists rent_prenotazioni (
  id uuid primary key default gen_random_uuid(),
  veicolo_id uuid references rent_veicoli(id) on delete cascade,
  cliente_id uuid references rent_clienti(id),
  data_inizio date not null,
  data_fine date not null,
  km_ritiro numeric,
  km_riconsegna numeric,
  carburante_ritiro text default '',
  carburante_riconsegna text default '',
  tariffa_applicata numeric default 0,
  cauzione numeric default 0,
  extra text default '',
  stato text default 'Prenotata' check (stato in ('Prenotata', 'In corso', 'Conclusa', 'Annullata')),
  note text default '',
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  check (data_fine >= data_inizio)
);

-- Vincolo anti-sovrapposizione: due prenotazioni attive sulla
-- stessa auto non possono avere periodi che si sovrappongono.
alter table rent_prenotazioni add constraint no_sovrapposizioni
  exclude using gist (
    veicolo_id with =,
    daterange(data_inizio, data_fine, '[]') with &&
  ) where (stato in ('Prenotata', 'In corso'));

alter table rent_prenotazioni enable row level security;
create policy "Autenticati leggono rent_prenotazioni" on rent_prenotazioni for select using (auth.role() = 'authenticated');
create policy "Autenticati inseriscono rent_prenotazioni" on rent_prenotazioni for insert with check (auth.role() = 'authenticated');
create policy "Autenticati modificano rent_prenotazioni" on rent_prenotazioni for update using (auth.role() = 'authenticated');
create policy "Solo admin elimina rent_prenotazioni" on rent_prenotazioni for delete using (
  exists (select 1 from profiles where id = auth.uid() and ruolo = 'admin')
);
