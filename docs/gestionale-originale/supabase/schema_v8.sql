-- ============================================================
-- SCHEMA GESTIONALE AUTO — v8 (dati legali cliente da contratto)
-- Esegui dopo schema_v7.sql. Non cancella dati.
-- ============================================================

alter table contatti add column if not exists codice_fiscale text default '';
alter table contatti add column if not exists residenza text default '';
alter table contatti add column if not exists nascita_sede text default '';
