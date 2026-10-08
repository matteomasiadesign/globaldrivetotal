-- ============================================================
-- SCHEMA GESTIONALE AUTO — v4 (Blocco 2: scadenzario, registro
-- IVA, riconciliazione bancaria)
-- Esegui DOPO schema_v2.sql e schema_v3.sql. Non cancella dati.
-- ============================================================

-- ---------------------------------------------------------
-- Scadenzario incassi/pagamenti: ogni movimento può avere una
-- scadenza diversa dalla data di registrazione, ed essere
-- "Da saldare" finché non viene effettivamente incassato/pagato.
-- ---------------------------------------------------------
alter table movimenti add column if not exists data_scadenza date;
alter table movimenti add column if not exists stato_pagamento text default 'Saldato'
  check (stato_pagamento in ('Saldato', 'Da saldare'));
alter table movimenti add column if not exists data_saldo date;

-- ---------------------------------------------------------
-- Registro IVA: numero documento per tracciare fatture emesse
-- e ricevute in ordine progressivo.
-- ---------------------------------------------------------
alter table movimenti add column if not exists numero_documento text default '';
alter table veicoli add column if not exists numero_fattura text default '';

-- ---------------------------------------------------------
-- Riconciliazione bancaria: marca i movimenti già confrontati
-- con l'estratto conto.
-- ---------------------------------------------------------
alter table movimenti add column if not exists riconciliato boolean default false;
alter table movimenti add column if not exists riferimento_estratto text default '';
