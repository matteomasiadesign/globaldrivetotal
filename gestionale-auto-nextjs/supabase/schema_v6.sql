-- ============================================================
-- SCHEMA GESTIONALE AUTO — v6 (dati aziendali per i contratti)
-- Esegui dopo schema_v2/v3/v4/v5.sql. Non cancella dati.
-- ============================================================

alter table impostazioni add column if not exists ragione_sociale text default '';
alter table impostazioni add column if not exists partita_iva text default '';
alter table impostazioni add column if not exists indirizzo_azienda text default '';
