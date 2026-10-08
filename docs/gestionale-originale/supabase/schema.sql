-- ============================================================
-- SCHEMA GESTIONALE AUTO
-- Incolla ed esegui questo file nell'SQL Editor di Supabase
-- (Dashboard Supabase -> SQL Editor -> New query -> Run)
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------
-- Tabella profili: un profilo per ogni utente registrato,
-- con ruolo admin/venditore. Un venditore non vede margini
-- e costi, solo i dati operativi dell'auto.
-- ---------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  ruolo text not null default 'venditore' check (ruolo in ('admin', 'venditore')),
  created_at timestamptz default now()
);

-- Crea automaticamente un profilo ogni volta che si registra un nuovo utente
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
-- Tabella auto
-- ---------------------------------------------------------
create table if not exists auto (
  id uuid primary key default gen_random_uuid(),
  marca text default '',
  modello text default '',
  targa text default '',
  fonte text default '',
  data_acquisto date,
  data_vendita date,
  garanzia boolean default false,
  prezzo_acquisto numeric default 0,
  prezzo_richiesto numeric default 0,
  prezzo_venduto numeric default 0,
  fatturato boolean default false,
  estera boolean default false,
  pax boolean default false,
  note text default '',
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------------------------------------------------------
-- Tabella spese, collegata a un'auto
-- ---------------------------------------------------------
create table if not exists spese (
  id uuid primary key default gen_random_uuid(),
  auto_id uuid references auto(id) on delete cascade,
  data date,
  metodo text default 'conto' check (metodo in ('conto', 'cash')),
  importo numeric default 0,
  nota text default '',
  created_at timestamptz default now()
);

-- ---------------------------------------------------------
-- Sicurezza (Row Level Security): solo utenti autenticati
-- del tuo team possono leggere/scrivere. Chi non ha fatto
-- login non vede nulla.
-- ---------------------------------------------------------
alter table profiles enable row level security;
alter table auto enable row level security;
alter table spese enable row level security;

create policy "Utenti autenticati leggono i profili" on profiles
  for select using (auth.role() = 'authenticated');

create policy "Utenti autenticati leggono le auto" on auto
  for select using (auth.role() = 'authenticated');
create policy "Utenti autenticati inseriscono auto" on auto
  for insert with check (auth.role() = 'authenticated');
create policy "Utenti autenticati modificano auto" on auto
  for update using (auth.role() = 'authenticated');
create policy "Solo admin elimina auto" on auto
  for delete using (
    exists (select 1 from profiles where id = auth.uid() and ruolo = 'admin')
  );

create policy "Utenti autenticati leggono le spese" on spese
  for select using (auth.role() = 'authenticated');
create policy "Utenti autenticati inseriscono spese" on spese
  for insert with check (auth.role() = 'authenticated');
create policy "Utenti autenticati modificano spese" on spese
  for update using (auth.role() = 'authenticated');
create policy "Utenti autenticati eliminano spese" on spese
  for delete using (auth.role() = 'authenticated');

-- ---------------------------------------------------------
-- Dopo aver eseguito questo file e aver creato il tuo primo
-- utente (registrandoti dall'app), rendilo admin con:
--
--   update profiles set ruolo = 'admin' where email = 'tuaemail@esempio.it';
-- ---------------------------------------------------------
