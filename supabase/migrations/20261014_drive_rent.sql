-- =====================================================================
-- GLOBAL DRIVE — MIGRAZIONE 3 (Global Drive e Global Rent separati)
--
-- Per il database su cui sono già stati eseguiti schema.sql e le migrazioni
-- 20261012_admin_fase1.sql e 20261013_admin_fasi_2_5.sql. Una volta, per intero,
-- nell'SQL Editor di Supabase (rieseguirla non fa danni). schema.sql contiene già
-- tutto: un progetto nuovo usa solo quello.
--
--  1. Veicoli: attività «Vendita» (Global Drive) o «Noleggio» (Global Rent).
--  2. Movimenti: attività a cui appartengono; gli incassi «Noleggio» vanno a Rent.
--  3. Flotta del noleggio: ogni auto ha la sua scheda in veicoli (veicolo_id);
--     quelle che non l'hanno ancora la ricevono qui.
--  4. Liquidazione IVA: le spese del noleggio restano in regime ordinario anche
--     con il margine calcolato sulle spese.
-- =====================================================================

begin;

alter table public.veicoli
  add column if not exists attivita text not null default 'Vendita' check (attivita in ('Vendita', 'Noleggio'));
create index if not exists idx_veicoli_attivita on public.veicoli (attivita);

alter table public.movimenti
  add column if not exists attivita text not null default 'Vendita' check (attivita in ('Vendita', 'Noleggio'));
create index if not exists idx_movimenti_attivita on public.movimenti (attivita);

update public.movimenti m
   set attivita = 'Noleggio'
 where m.attivita = 'Vendita'
   and (m.categoria = 'Noleggio'
        or exists (select 1 from public.noleggio_prenotazioni p where p.movimento_id = m.id));

alter table public.noleggio_veicoli
  add column if not exists veicolo_id uuid unique references public.veicoli(id) on delete cascade;

-- Ogni auto della flotta riceve la sua scheda (o si collega a quella con la stessa targa).
do $$
declare
  r record;
  scheda uuid;
begin
  for r in select * from public.noleggio_veicoli where veicolo_id is null loop
    scheda := null;
    if r.targa <> '' then
      select v.id into scheda from public.veicoli v where upper(v.targa) = upper(r.targa);
    end if;
    if scheda is null then
      insert into public.veicoli (attivita, stato, marca, modello, targa, chilometraggio)
      values ('Noleggio', 'Acquistata', r.marca, r.modello, r.targa, r.km_attuali)
      returning id into scheda;
    else
      update public.veicoli set attivita = 'Noleggio' where id = scheda;
    end if;
    update public.noleggio_veicoli set veicolo_id = scheda where id = r.id;
  end loop;
end $$;

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
  -- Le spese del noleggio (Global Rent) restano in regime ordinario.
  select extract(year from m.data)::int as anno,
         extract(quarter from m.data)::int as trimestre,
         sum(m.iva) as iva_detraibile
    from public.movimenti m
    left join public.veicoli v on v.id = m.auto_id
   cross join public.impostazioni i
   where i.id = 1
     and m.iva_detraibile and m.tipo = 'Uscita'
     and not (i.margine_con_spese and m.attivita <> 'Noleggio' and m.auto_id is not null
              and m.natura_costo = 'Variabile diretto auto'
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
