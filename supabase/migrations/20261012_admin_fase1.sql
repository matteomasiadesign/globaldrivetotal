-- =====================================================================
-- GLOBAL DRIVE — MIGRAZIONE 2026-10-12 (correzioni dell'admin, fase 1)
--
-- Per il database su cui è GIÀ stato eseguito supabase/schema.sql. Da eseguire
-- una volta, per intero, nell'SQL Editor di Supabase (è una transazione unica;
-- rieseguirla non fa danni). schema.sql è già aggiornato con le stesse modifiche,
-- quindi su un progetto nuovo basta quello.
--
-- Cosa cambia (le stesse regole del codice):
--  1. Impostazioni: margine_con_spese (regime del margine con le spese di
--     riparazione/accessorie, art. 36 DL 41/1995) e pagamenti_banca (metodi di
--     pagamento da riconciliare in Banca). Si cambiano da /admin/impostazioni.
--  2. veicoli_conti e liquidazione_iva usano margine_con_spese; con il margine
--     sulle spese, l'IVA di quelle spese non si detrae.
--  3. Un'auto venduta e poi archiviata resta "Venduta" (nascosta) nel catalogo
--     e mantiene la data di vendita.
--  4. register_sale: l'incasso ha scadenza (consegna o vendita), un contratto
--     ristampato tiene il suo numero, le richieste si chiudono anche per contatto.
--  5. Appuntamenti: nuovo tipo "Valutazione auto" (per conto vendita e acquisti).
-- =====================================================================

begin;

-- 1. Impostazioni -------------------------------------------------------------

alter table public.impostazioni
  add column if not exists margine_con_spese boolean not null default true,
  add column if not exists pagamenti_banca text[] not null default array['CONTO', 'Bonifico', 'Carta'];

alter table public.impostazioni drop constraint if exists impostazioni_pagamenti_banca_check;
alter table public.impostazioni add constraint impostazioni_pagamenti_banca_check
  check (pagamenti_banca <@ array['CONTO', 'CASH', 'Carta', 'Bonifico', 'Altro']);

-- 5. Appuntamenti ---------------------------------------------------------------

alter table public.appointments drop constraint if exists appointments_type_check;
alter table public.appointments add constraint appointments_type_check check (type in
  ('Test Drive', 'Trattativa / Acquisto', 'Consegna Vettura', 'Valutazione auto', 'Ritiro Documenti',
   'Perizia Permuta', 'Consulenza Finanziamento'));   -- gli ultimi due solo per i dati già salvati

-- 3. Catalogo ⇄ scheda ----------------------------------------------------------

-- >>> veicoli_sync_car
create or replace function public.veicoli_sync_car()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if pg_trigger_depth() > 1 or new.car_id is null or new.stato is not distinct from old.stato then
    return null;
  end if;
  -- Un'auto venduta e poi archiviata resta venduta (nascosta), non torna disponibile.
  update public.cars set
    status   = case
                 when new.stato = 'Prenotata' then 'In Trattativa'
                 when new.stato = 'Venduta' or (new.stato = 'Archiviata' and new.data_vendita is not null) then 'Venduta'
                 else 'Disponibile' end,
    hidden   = case when new.stato in ('In vendita', 'Prenotata') then false
                    when new.stato = 'Venduta' then hidden
                    else true end,
    featured = case when new.stato in ('In vendita', 'Prenotata') then featured else false end
  where id = new.car_id;
  return null;
end;
$$;
-- <<<

-- >>> cars_sync_veicolo
create or replace function public.cars_sync_veicolo()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v public.veicoli;
  pubblico text;
begin
  if pg_trigger_depth() > 1 or new.status is not distinct from old.status then
    return null;
  end if;
  select * into v from public.veicoli where car_id = new.id;
  if not found then
    return null;
  end if;
  pubblico := case
                when v.stato = 'Prenotata' then 'In Trattativa'
                when v.stato = 'Venduta' or (v.stato = 'Archiviata' and v.data_vendita is not null) then 'Venduta'
                else 'Disponibile' end;
  if pubblico is distinct from new.status then
    update public.veicoli set stato = case new.status
        when 'In Trattativa' then 'Prenotata' when 'Venduta' then 'Venduta' else 'In vendita' end
      where id = v.id;
  end if;
  return null;
end;
$$;
-- <<<

-- La data di vendita si toglie solo se la vendita viene annullata, non se l'auto si archivia.
create or replace function public.veicoli_data_vendita()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  if new.stato = 'Venduta' and old.stato <> 'Venduta' and new.data_vendita is null then
    new.data_vendita := current_date;
  elsif old.stato = 'Venduta' and new.stato not in ('Venduta', 'Archiviata')
        and new.data_vendita is not distinct from old.data_vendita then
    new.data_vendita := null;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_veicoli_data_vendita on public.veicoli;
create trigger trg_veicoli_data_vendita before update of stato on public.veicoli
  for each row execute function public.veicoli_data_vendita();

-- 4. Vendita --------------------------------------------------------------------

-- >>> register_sale
create or replace function public.register_sale(
  p_veicolo_id           uuid,
  p_prezzo_vendita       numeric,
  p_data_vendita         date,
  p_acquirente           jsonb,
  p_contatto_id          uuid default null,
  p_data_consegna        date default null,
  p_strumento_pagamento  text default '',
  p_estensione_garanzia  boolean default false,
  p_luogo_data           text default ''
) returns public.sale_contracts
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_nome      text := trim(coalesce(p_acquirente ->> 'nome', ''));
  v_tel       text := regexp_replace(coalesce(p_acquirente ->> 'telefono', ''), '\D', '', 'g');
  v_veicolo   public.veicoli;
  v_imp       public.impostazioni;
  v_contatto  uuid := p_contatto_id;
  v_anno      int := extract(year from p_data_vendita)::int;
  v_numero    int;
  v_imponibile numeric;
  v_iva       numeric;
  v_categoria text;
  v_pagamento text := case p_strumento_pagamento when 'Bonifico bancario' then 'Bonifico' when 'Contanti' then 'CASH' else 'CONTO' end;
  v_incasso   public.movimenti;
  v_contratto public.sale_contracts;
begin
  if not (select public.is_admin()) then
    raise exception 'Solo un admin può registrare una vendita' using errcode = '42501';
  end if;
  if p_prezzo_vendita is null or p_prezzo_vendita <= 0 then
    raise exception 'Il prezzo di vendita deve essere maggiore di zero';
  end if;
  select * into v_veicolo from public.veicoli where id = p_veicolo_id for update;
  if not found then
    raise exception 'Scheda auto non trovata';
  end if;
  select * into v_imp from public.impostazioni where id = 1;

  -- Numero progressivo dell'anno di vendita; il lock serializza due contratti nello stesso istante.
  -- Se l'auto ha già un contratto in quell'anno si ristampa con lo stesso numero.
  perform pg_advisory_xact_lock(hashtext('sale_contract:' || v_anno));
  select numero into v_numero from public.sale_contracts
   where veicolo_id = p_veicolo_id and anno = v_anno order by numero desc limit 1;
  if v_numero is null then
    select coalesce(max(numero), 0) + 1 into v_numero from public.sale_contracts where anno = v_anno;
    -- Il numero di partenza impostato a mano vale per l'anno di gestione.
    if v_anno = v_imp.anno_gestione then
      v_numero := greatest(v_numero, v_imp.prossimo_numero_contratto);
      update public.impostazioni set prossimo_numero_contratto = v_numero + 1 where id = 1;   -- anteprima per l'interfaccia
    end if;
  end if;

  -- Cliente in anagrafica.
  if v_contatto is null and v_nome <> '' then
    select id into v_contatto from public.contatti where lower(trim(nome)) = lower(v_nome) limit 1;
  end if;
  if v_contatto is null and v_nome <> '' then
    insert into public.contatti (tipo, nome, telefono, email, codice_fiscale, residenza, nascita_sede)
    values ('Cliente', v_nome,
            coalesce(p_acquirente ->> 'telefono', ''), coalesce(p_acquirente ->> 'email', ''),
            coalesce(p_acquirente ->> 'codiceFiscale', ''), coalesce(p_acquirente ->> 'residenza', ''),
            coalesce(p_acquirente ->> 'nascitaSede', ''))
    returning id into v_contatto;
  elsif v_contatto is not null then
    -- Si completano solo i dati che mancano; un fornitore che compra diventa "Entrambi".
    update public.contatti set
      tipo           = case when tipo = 'Fornitore' then 'Entrambi' else tipo end,
      telefono       = coalesce(nullif(telefono, ''), p_acquirente ->> 'telefono', ''),
      email          = coalesce(nullif(email, ''), p_acquirente ->> 'email', ''),
      codice_fiscale = coalesce(nullif(codice_fiscale, ''), p_acquirente ->> 'codiceFiscale', ''),
      residenza      = coalesce(nullif(residenza, ''), p_acquirente ->> 'residenza', ''),
      nascita_sede   = coalesce(nullif(nascita_sede, ''), p_acquirente ->> 'nascitaSede', '')
    where id = v_contatto;
  end if;

  -- L'auto risulta venduta; il trigger aggiorna il catalogo.
  update public.veicoli
     set prezzo_vendita = p_prezzo_vendita, data_vendita = p_data_vendita,
         stato = 'Venduta', acquirente_id = v_contatto
   where id = p_veicolo_id;

  -- Incasso atteso (uno per auto), con scadenza alla consegna o alla vendita: così compare
  -- nello scadenzario. Se il contratto si ristampa, l'incasso ancora aperto si allinea.
  v_categoria := case when v_veicolo.servizio = 'Conto vendita' then 'Intermediazione conto vendita' else 'Vendita veicolo' end;
  v_imponibile := case when v_veicolo.servizio = 'Conto vendita'
                       then p_prezzo_vendita * v_veicolo.commissione_percentuale else p_prezzo_vendita end;
  v_iva := case when v_veicolo.servizio = 'Conto vendita' then v_imponibile * v_imp.aliquota_iva else 0 end;
  select * into v_incasso from public.movimenti
   where auto_id = p_veicolo_id and tipo = 'Entrata' and categoria = v_categoria limit 1;
  if not found then
    insert into public.movimenti (
      data, auto_id, contatto_id, descrizione, fornitore_cliente, tipo, categoria, natura_costo,
      pagamento, imponibile, iva, stato_pagamento, data_scadenza, numero_documento)
    values (
      p_data_vendita, p_veicolo_id, v_contatto,
      'Vendita ' || trim(concat_ws(' ', v_veicolo.marca, v_veicolo.modello, v_veicolo.targa)),
      v_nome, 'Entrata', v_categoria, 'Variabile generale',
      v_pagamento, v_imponibile, v_iva,
      'Da saldare', coalesce(p_data_consegna, p_data_vendita), v_veicolo.numero_fattura);
  elsif v_incasso.stato_pagamento = 'Da saldare' then
    update public.movimenti set
      data = p_data_vendita, contatto_id = v_contatto, fornitore_cliente = v_nome, pagamento = v_pagamento,
      imponibile = v_imponibile, iva = v_iva, data_scadenza = coalesce(p_data_consegna, p_data_vendita)
    where id = v_incasso.id;
  end if;

  -- Le richieste aperte di chi ha comprato si chiudono: collegate al contatto o con lo stesso telefono.
  update public.leads set status = 'completato'
   where status in ('nuovo', 'in_gestione')
     and ((v_contatto is not null and contatto_id = v_contatto)
          or (v_tel <> '' and regexp_replace(phone, '\D', '', 'g') = v_tel));

  -- Ristampa: il contratto esistente si aggiorna (il PDF va ricaricato); altrimenti se ne crea uno.
  update public.sale_contracts set
    contatto_id = v_contatto, prezzo_vendita = p_prezzo_vendita, data_vendita = p_data_vendita,
    data_consegna = p_data_consegna, strumento_pagamento = coalesce(p_strumento_pagamento, ''),
    estensione_garanzia = coalesce(p_estensione_garanzia, false), luogo_data = coalesce(p_luogo_data, ''),
    pdf_path = null
  where veicolo_id = p_veicolo_id and anno = v_anno and numero = v_numero
  returning * into v_contratto;
  if not found then
    insert into public.sale_contracts (
      numero, anno, veicolo_id, contatto_id, prezzo_vendita, data_vendita, data_consegna,
      strumento_pagamento, estensione_garanzia, luogo_data, created_by)
    values (
      v_numero, v_anno, p_veicolo_id, v_contatto, p_prezzo_vendita, p_data_vendita, p_data_consegna,
      coalesce(p_strumento_pagamento, ''), coalesce(p_estensione_garanzia, false), coalesce(p_luogo_data, ''), auth.uid())
    returning * into v_contratto;
  end if;

  return v_contratto;
end;
$$;
-- <<<

-- 2. Conti calcolati --------------------------------------------------------------

-- >>> veicoli_conti
create or replace view public.veicoli_conti with (security_invoker = true) as
with base as (
  select v.*,
         i.aliquota_iva,
         i.margine_con_spese,
         coalesce((select sum(m.totale) from public.movimenti m
                    where m.auto_id = v.id and m.tipo = 'Uscita'
                      and m.natura_costo = 'Variabile diretto auto' and m.categoria <> 'Acquisto veicolo'), 0) as costi_diretti_calc,
         (v.prezzo_vendita is not null and v.prezzo_vendita <> 0) as ha_vendita
    from public.veicoli v
   cross join public.impostazioni i
   where i.id = 1
), c1 as (
  select base.*,
         case when servizio = 'Conto vendita' then costi_diretti_calc
              else coalesce(prezzo_acquisto, 0) + costi_diretti_calc end as costo_totale,
         case when servizio = 'Conto vendita' and ha_vendita then prezzo_vendita * commissione_percentuale end as commissione_imponibile,
         -- Regime del margine: vendita − acquisto, meno le spese dell'auto se margine_con_spese.
         case when servizio <> 'Conto vendita' and ha_vendita
              then greatest(0, prezzo_vendita - prezzo_acquisto
                               - case when margine_con_spese then costi_diretti_calc else 0 end) end as margine_regime_iva
    from base
), c2 as (
  select c1.*,
         commissione_imponibile * aliquota_iva as iva_commissione,
         margine_regime_iva * (aliquota_iva / (1 + aliquota_iva)) as iva_regime_margine,
         case when servizio = 'Conto vendita' then commissione_imponibile - costi_diretti_calc
              when ha_vendita then prezzo_vendita - costo_totale end as margine_gestionale
    from c1
), c3 as (
  select c2.*,
         case when servizio = 'Conto vendita' then margine_gestionale
              else margine_gestionale - coalesce(iva_regime_margine, 0) end as risultato_dopo_iva,
         case when data_acquisto is null then null
              else greatest(0, coalesce(data_vendita, current_date) - data_acquisto) end as giorni_stock
    from c2
)
select id, car_id, servizio, stato, data_vendita,
       costi_diretti_calc as costi_diretti,
       costo_totale,
       commissione_imponibile,
       iva_commissione,
       commissione_imponibile + iva_commissione as totale_fattura_intermediazione,
       margine_gestionale,
       margine_regime_iva,
       iva_regime_margine,
       risultato_dopo_iva,
       risultato_dopo_iva / nullif(costo_totale, 0) as roi,
       giorni_stock,
       risultato_dopo_iva / nullif(giorni_stock, 0) as margine_giorno
  from c3;
-- <<<

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
), unite as (
  select coalesce(v.anno, a.anno) as anno,
         coalesce(v.trimestre, a.trimestre) as trimestre,
         coalesce(v.iva_margine, 0) as iva_margine,
         coalesce(v.iva_commissioni, 0) as iva_commissioni,
         coalesce(a.iva_detraibile, 0) as iva_detraibile
    from vendite v
    full join acquisti a on a.anno = v.anno and a.trimestre = v.trimestre
), saldi as (
  select u.*, greatest(0, u.iva_margine + u.iva_commissioni - u.iva_detraibile) as saldo_base
    from unite u
)
select s.anno, s.trimestre, s.iva_margine, s.iva_commissioni, s.iva_detraibile, s.saldo_base,
       s.saldo_base * i.maggiorazione_trimestrale as maggiorazione,
       s.saldo_base * (1 + i.maggiorazione_trimestrale) as totale_da_versare
  from saldi s
 cross join public.impostazioni i
 where i.id = 1;
-- <<<

commit;
