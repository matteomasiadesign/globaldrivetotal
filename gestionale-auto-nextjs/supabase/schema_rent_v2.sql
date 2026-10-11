-- ============================================================
-- SCHEMA GLOBAL RENT — v2 (luoghi, tariffe per periodo, preventivi)
-- Esegui DOPO schema_rent_v1.sql. Non cancella dati.
-- ============================================================

-- ---------------------------------------------------------
-- Punto di ritiro e di consegna sulla prenotazione vera
-- ---------------------------------------------------------
alter table rent_prenotazioni add column if not exists luogo_ritiro text default '';
alter table rent_prenotazioni add column if not exists luogo_riconsegna text default '';

-- ---------------------------------------------------------
-- Tariffe per periodo (per categoria di auto): permette di
-- definire "alta stagione", "bassa stagione", weekend speciali,
-- ecc. Se per un periodo/categoria non c'è una tariffa specifica,
-- si usa la tariffa giornaliera base impostata sull'auto.
-- ---------------------------------------------------------
create table if not exists rent_tariffe (
  id uuid primary key default gen_random_uuid(),
  categoria text not null check (categoria in ('Economy', 'Compatta', 'Berlina', 'SUV', 'Furgone', 'Altro')),
  nome_periodo text default '',
  data_inizio date not null,
  data_fine date not null,
  tariffa_giornaliera numeric not null default 0,
  note text default '',
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  check (data_fine >= data_inizio)
);

alter table rent_tariffe enable row level security;
create policy "Autenticati leggono rent_tariffe" on rent_tariffe for select using (auth.role() = 'authenticated');
create policy "Autenticati inseriscono rent_tariffe" on rent_tariffe for insert with check (auth.role() = 'authenticated');
create policy "Autenticati modificano rent_tariffe" on rent_tariffe for update using (auth.role() = 'authenticated');
create policy "Solo admin elimina rent_tariffe" on rent_tariffe for delete using (
  exists (select 1 from profiles where id = auth.uid() and ruolo = 'admin')
);

-- ---------------------------------------------------------
-- Preventivi: come le prenotazioni ma non impegnano l'auto
-- (nessun vincolo anti-sovrapposizione), pensati per essere
-- calcolati e poi eventualmente convertiti in prenotazione vera.
-- ---------------------------------------------------------
create table if not exists rent_preventivi (
  id uuid primary key default gen_random_uuid(),
  veicolo_id uuid references rent_veicoli(id) on delete set null,
  cliente_id uuid references rent_clienti(id) on delete set null,
  cliente_nome_libero text default '',
  categoria text default 'Economy',
  data_inizio date not null,
  data_fine date not null,
  luogo_ritiro text default '',
  luogo_riconsegna text default '',
  tariffa_applicata numeric not null default 0,
  giorni numeric not null default 1,
  totale numeric not null default 0,
  stato text default 'Bozza' check (stato in ('Bozza', 'Inviato', 'Accettato', 'Rifiutato', 'Scaduto')),
  note text default '',
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  check (data_fine >= data_inizio)
);

alter table rent_preventivi enable row level security;
create policy "Autenticati leggono rent_preventivi" on rent_preventivi for select using (auth.role() = 'authenticated');
create policy "Autenticati inseriscono rent_preventivi" on rent_preventivi for insert with check (auth.role() = 'authenticated');
create policy "Autenticati modificano rent_preventivi" on rent_preventivi for update using (auth.role() = 'authenticated');
create policy "Autenticati eliminano rent_preventivi" on rent_preventivi for delete using (auth.role() = 'authenticated');
