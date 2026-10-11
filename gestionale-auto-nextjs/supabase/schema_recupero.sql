-- ============================================================
-- SCRIPT DI RECUPERO — completa tutto lo schema (v3+v4+v5)
-- Sicuro da eseguire anche se alcune parti sono già presenti:
-- non cancella e non duplica nulla di quello che hai già.
-- ============================================================

-- ---------- CONTATTI ----------
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

drop policy if exists "Autenticati leggono contatti" on contatti;
create policy "Autenticati leggono contatti" on contatti for select using (auth.role() = 'authenticated');
drop policy if exists "Autenticati inseriscono contatti" on contatti;
create policy "Autenticati inseriscono contatti" on contatti for insert with check (auth.role() = 'authenticated');
drop policy if exists "Autenticati modificano contatti" on contatti;
create policy "Autenticati modificano contatti" on contatti for update using (auth.role() = 'authenticated');
drop policy if exists "Solo admin elimina contatti" on contatti;
create policy "Solo admin elimina contatti" on contatti for delete using (
  exists (select 1 from profiles where id = auth.uid() and ruolo = 'admin')
);

alter table veicoli add column if not exists fornitore_id uuid references contatti(id);
alter table veicoli add column if not exists cliente_id uuid references contatti(id);
alter table movimenti add column if not exists contatto_id uuid references contatti(id);

-- ---------- STORICO MODIFICHE (audit log) ----------
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
create trigger trg_audit_veicoli after insert or update or delete on veicoli for each row execute procedure public.log_audit();
drop trigger if exists trg_audit_movimenti on movimenti;
create trigger trg_audit_movimenti after insert or update or delete on movimenti for each row execute procedure public.log_audit();

alter table audit_log enable row level security;
drop policy if exists "Solo admin legge lo storico" on audit_log;
create policy "Solo admin legge lo storico" on audit_log for select using (
  exists (select 1 from profiles where id = auth.uid() and ruolo = 'admin')
);

-- ---------- SCADENZARIO / REGISTRO IVA / RICONCILIAZIONE ----------
alter table movimenti add column if not exists data_scadenza date;
alter table movimenti add column if not exists stato_pagamento text default 'Saldato'
  check (stato_pagamento in ('Saldato', 'Da saldare'));
alter table movimenti add column if not exists data_saldo date;
alter table movimenti add column if not exists numero_documento text default '';
alter table veicoli add column if not exists numero_fattura text default '';
alter table movimenti add column if not exists riconciliato boolean default false;
alter table movimenti add column if not exists riferimento_estratto text default '';

-- ---------- DOCUMENTI (foto/allegati) ----------
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

drop policy if exists "Autenticati leggono documenti" on documenti;
create policy "Autenticati leggono documenti" on documenti for select using (auth.role() = 'authenticated');
drop policy if exists "Autenticati inseriscono documenti" on documenti;
create policy "Autenticati inseriscono documenti" on documenti for insert with check (auth.role() = 'authenticated');
drop policy if exists "Autenticati eliminano documenti" on documenti;
create policy "Autenticati eliminano documenti" on documenti for delete using (auth.role() = 'authenticated');

insert into storage.buckets (id, name, public)
values ('veicoli-documenti', 'veicoli-documenti', false)
on conflict (id) do nothing;

drop policy if exists "Autenticati leggono i file" on storage.objects;
create policy "Autenticati leggono i file" on storage.objects for select using (bucket_id = 'veicoli-documenti' and auth.role() = 'authenticated');
drop policy if exists "Autenticati caricano file" on storage.objects;
create policy "Autenticati caricano file" on storage.objects for insert with check (bucket_id = 'veicoli-documenti' and auth.role() = 'authenticated');
drop policy if exists "Autenticati eliminano file" on storage.objects;
create policy "Autenticati eliminano file" on storage.objects for delete using (bucket_id = 'veicoli-documenti' and auth.role() = 'authenticated');

-- ---------------------------------------------------------
-- IMPORTANTE — se non l'hai già fatto, chiudi la registrazione libera:
-- Supabase → Authentication → Sign In / Providers →
-- disattiva "Allow new users to sign up".
-- ---------------------------------------------------------
