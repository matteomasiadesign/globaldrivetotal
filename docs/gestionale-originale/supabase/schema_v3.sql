-- ============================================================
-- SCHEMA GESTIONALE AUTO — v3 (Blocco 1: contatti + audit log)
-- Esegui questo file DOPO schema_v2.sql (non lo sostituisce,
-- lo estende: non perdi i dati già inseriti).
-- ============================================================

-- ---------------------------------------------------------
-- Anagrafica clienti e fornitori
-- ---------------------------------------------------------
create table if not exists contatti (
  id uuid primary key default gen_random_uuid(),
  tipo text not null default 'Cliente' check (tipo in ('Cliente', 'Fornitore', 'Entrambi')),
  nome text not null default '',
  telefono text default '',
  email text default '',
  note text default '',
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

alter table contatti enable row level security;
create policy "Autenticati leggono contatti" on contatti for select using (auth.role() = 'authenticated');
create policy "Autenticati inseriscono contatti" on contatti for insert with check (auth.role() = 'authenticated');
create policy "Autenticati modificano contatti" on contatti for update using (auth.role() = 'authenticated');
create policy "Solo admin elimina contatti" on contatti for delete using (
  exists (select 1 from profiles where id = auth.uid() and ruolo = 'admin')
);

-- Collegamenti facoltativi: da chi ho acquistato / a chi ho venduto
alter table veicoli add column if not exists fornitore_id uuid references contatti(id);
alter table veicoli add column if not exists cliente_id uuid references contatti(id);
-- Collegamento facoltativo sul movimento (in alternativa al testo libero già esistente)
alter table movimenti add column if not exists contatto_id uuid references contatti(id);

-- ---------------------------------------------------------
-- Storico modifiche (audit log): registra automaticamente
-- ogni inserimento/modifica/eliminazione su veicoli e movimenti.
-- ---------------------------------------------------------
create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  tabella text not null,
  record_id uuid,
  azione text not null check (azione in ('INSERT', 'UPDATE', 'DELETE')),
  dati_precedenti jsonb,
  dati_nuovi jsonb,
  utente_id uuid references auth.users(id),
  utente_email text,
  avvenuto_il timestamptz default now()
);
create index if not exists idx_audit_tabella on audit_log(tabella, avvenuto_il desc);

create or replace function public.log_audit()
returns trigger as $$
declare
  email_utente text;
begin
  select email into email_utente from profiles where id = auth.uid();
  if (tg_op = 'DELETE') then
    insert into audit_log (tabella, record_id, azione, dati_precedenti, utente_id, utente_email)
    values (tg_table_name, old.id, 'DELETE', to_jsonb(old), auth.uid(), email_utente);
    return old;
  elsif (tg_op = 'UPDATE') then
    insert into audit_log (tabella, record_id, azione, dati_precedenti, dati_nuovi, utente_id, utente_email)
    values (tg_table_name, new.id, 'UPDATE', to_jsonb(old), to_jsonb(new), auth.uid(), email_utente);
    return new;
  elsif (tg_op = 'INSERT') then
    insert into audit_log (tabella, record_id, azione, dati_nuovi, utente_id, utente_email)
    values (tg_table_name, new.id, 'INSERT', to_jsonb(new), auth.uid(), email_utente);
    return new;
  end if;
  return null;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_audit_veicoli on veicoli;
create trigger trg_audit_veicoli
  after insert or update or delete on veicoli
  for each row execute procedure public.log_audit();

drop trigger if exists trg_audit_movimenti on movimenti;
create trigger trg_audit_movimenti
  after insert or update or delete on movimenti
  for each row execute procedure public.log_audit();

alter table audit_log enable row level security;
create policy "Solo admin legge lo storico" on audit_log for select using (
  exists (select 1 from profiles where id = auth.uid() and ruolo = 'admin')
);

-- ---------------------------------------------------------
-- IMPORTANTE — chiudi la registrazione libera:
-- Vai su Supabase → Authentication → Sign In / Providers →
-- disattiva "Allow new users to sign up".
-- Da quel momento crei tu gli account per i collaboratori da
-- Authentication → Users → Add user (poi imposta il ruolo con:
--   update profiles set ruolo = 'venditore' where email = '...';
-- oppure 'admin').
-- ---------------------------------------------------------
