-- ============================================================
-- SCHEMA GESTIONALE AUTO — v7 (dati per i contratti di vendita)
-- Esegui dopo schema_v6.sql. Non cancella dati.
-- ============================================================

alter table veicoli add column if not exists chilometraggio numeric default 0;
alter table veicoli add column if not exists alimentazione text default '';
alter table veicoli add column if not exists versione text default '';

alter table impostazioni add column if not exists telefono_azienda text default '';
alter table impostazioni add column if not exists email_azienda text default '';
alter table impostazioni add column if not exists pec_azienda text default '';
alter table impostazioni add column if not exists prossimo_numero_contratto int default 1;
