-- =====================================================================
-- GLOBAL DRIVE — MIGRAZIONE 2 (export, import, allegati, noleggio nei conti)
--
-- Per il database su cui sono già stati eseguiti schema.sql e
-- 20261012_admin_fase1.sql. Una volta, per intero, nell'SQL Editor di Supabase
-- (rieseguirla non fa danni). schema.sql contiene già tutto: un progetto nuovo
-- usa solo quello.
--
--  1. Movimenti: allegato (fattura o ricevuta) nel bucket vehicle-documents.
--  2. Noleggio: km e carburante esistevano già; nuovo collegamento all'incasso
--     registrato quando il noleggio si conclude.
--  3. Impostazioni: le tariffe del noleggio comprendono l'IVA (default sì).
--  4. Categorie dei movimenti «Noleggio» e «Altre entrate».
--  5. Liquidazione IVA: conta anche l'IVA delle altre entrate (noleggi, servizi),
--     cioè le entrate con categoria diversa da vendita e intermediazione.
-- =====================================================================

begin;

alter table public.movimenti
  add column if not exists allegato_path text not null default '',
  add column if not exists allegato_nome text not null default '';

alter table public.noleggio_prenotazioni
  add column if not exists movimento_id uuid references public.movimenti(id) on delete set null;

alter table public.impostazioni
  add column if not exists noleggio_iva_inclusa boolean not null default true;

insert into public.categorie_movimento (nome, ordine) values ('Noleggio', 21), ('Altre entrate', 22)
on conflict (nome) do nothing;

-- >>> liquidazione_iva
create or replace view public.liquidazione_iva with (security_invoker = true) as
with vendite as (
  select extract(year from c.data_vendita)::int as anno,
         extract(quarter from c.data_vendita)::int as trimestre,
         sum(case when c.servizio <> 'Conto vendita' then coalesce(c.iva_regime_margine, 0) else 0 end) as iva_margine,
         sum(case when c.servizio = 'Conto vendita' then coalesce(c.iva_commissione, 0) else 0 end) as iva_commissioni
    from public.veicoli_conti c
   where c.data_vendita is not null
   group by 1, 2
), acquisti as (
  -- Con il margine sulle spese, l'IVA delle spese delle auto in regime del margine non si detrae.
  select extract(year from m.data)::int as anno,
         extract(quarter from m.data)::int as trimestre,
         sum(m.iva) as iva_detraibile
    from public.movimenti m
    left join public.veicoli v on v.id = m.auto_id
   cross join public.impostazioni i
   where i.id = 1
     and m.iva_detraibile and m.tipo = 'Uscita'
     and not (i.margine_con_spese and m.auto_id is not null and m.natura_costo = 'Variabile diretto auto'
              and m.categoria <> 'Acquisto veicolo' and coalesce(v.servizio, '') <> 'Conto vendita')
   group by 1, 2
), altre as (
  -- IVA a debito delle entrate che non sono vendite di auto (noleggi, servizi…).
  select extract(year from m.data)::int as anno,
         extract(quarter from m.data)::int as trimestre,
         sum(m.iva) as iva_altre_entrate
    from public.movimenti m
   where m.tipo = 'Entrata' and m.categoria not in ('Vendita veicolo', 'Intermediazione conto vendita')
   group by 1, 2
), periodi as (
  select anno, trimestre from vendite
  union select anno, trimestre from acquisti
  union select anno, trimestre from altre
), unite as (
  select p.anno, p.trimestre,
         coalesce(v.iva_margine, 0) as iva_margine,
         coalesce(v.iva_commissioni, 0) as iva_commissioni,
         coalesce(o.iva_altre_entrate, 0) as iva_altre_entrate,
         coalesce(a.iva_detraibile, 0) as iva_detraibile
    from periodi p
    left join vendite v on v.anno = p.anno and v.trimestre = p.trimestre
    left join acquisti a on a.anno = p.anno and a.trimestre = p.trimestre
    left join altre o on o.anno = p.anno and o.trimestre = p.trimestre
), saldi as (
  select u.*, greatest(0, u.iva_margine + u.iva_commissioni + u.iva_altre_entrate - u.iva_detraibile) as saldo_base
    from unite u
)
select s.anno, s.trimestre, s.iva_margine, s.iva_commissioni, s.iva_detraibile, s.saldo_base,
       s.saldo_base * i.maggiorazione_trimestrale as maggiorazione,
       s.saldo_base * (1 + i.maggiorazione_trimestrale) as totale_da_versare,
       s.iva_altre_entrate
  from saldi s
 cross join public.impostazioni i
 where i.id = 1;
-- <<<

commit;
