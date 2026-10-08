-- ============================================================
-- SCHEMA GESTIONALE AUTO — v5 (Blocco 3: foto/documenti)
-- Esegui DOPO schema_v2/v3/v4.sql. Non cancella dati.
-- ============================================================

-- ---------------------------------------------------------
-- Tabella documenti: riferimenti ai file caricati su Storage
-- ---------------------------------------------------------
create table if not exists documenti (
  id uuid primary key default gen_random_uuid(),
  auto_id uuid references veicoli(id) on delete cascade,
  nome_file text not null,
  tipo text default 'Altro' check (tipo in ('Foto', 'Libretto', 'Fattura acquisto', 'Fattura vendita', 'Assicurazione', 'Altro')),
  storage_path text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);
create index if not exists idx_documenti_auto on documenti(auto_id);

alter table documenti enable row level security;
create policy "Autenticati leggono documenti" on documenti for select using (auth.role() = 'authenticated');
create policy "Autenticati inseriscono documenti" on documenti for insert with check (auth.role() = 'authenticated');
create policy "Autenticati eliminano documenti" on documenti for delete using (auth.role() = 'authenticated');

-- ---------------------------------------------------------
-- Storage bucket per foto e documenti (privato: solo utenti
-- autenticati del tuo team possono caricare/vedere i file).
-- ---------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('veicoli-documenti', 'veicoli-documenti', false)
on conflict (id) do nothing;

create policy "Autenticati leggono i file"
  on storage.objects for select using (bucket_id = 'veicoli-documenti' and auth.role() = 'authenticated');
create policy "Autenticati caricano file"
  on storage.objects for insert with check (bucket_id = 'veicoli-documenti' and auth.role() = 'authenticated');
create policy "Autenticati eliminano file"
  on storage.objects for delete using (bucket_id = 'veicoli-documenti' and auth.role() = 'authenticated');
