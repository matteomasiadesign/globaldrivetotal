"use client";

import React, { useState } from "react";
import { useAdmin } from "@/context/AdminContext";
import { eur } from "@/lib/admin/constants";
import { addDays } from "@/lib/admin/dates";
import type { SaleDocumentDraft } from "@/types/admin";
import type { Car } from "@/types/car";
import Drawer from "./ui/Drawer";
import { Field, Section, Switch } from "./ui/Field";
import { inputCls } from "./ui/styles";

const PAYMENT_METHODS = [
  "Bonifico Bancario Istantaneo",
  "Finanziamento Agevolato",
  "Assegno Circolare",
  "Leasing Strumentale",
];

const WARRANTIES = [
  "12 Mesi Garanzia Legale di Conformità",
  "24 Mesi Global Drive Total Care",
  "36 Mesi Garanzia Ufficiale Estesa",
];

// Dati del contratto di vendita per l'auto scelta. Nulla è precompilato con
// dati finti: l'auto e il prezzo arrivano dalla scheda, il resto lo scrivi tu.
export default function ContractDrawer({
  car,
  onPreview,
  onClose,
}: {
  car: Car;
  onPreview: (draft: SaleDocumentDraft) => void;
  onClose: () => void;
}) {
  const { today } = useAdmin();

  const [f, setF] = useState({
    buyerName: "",
    buyerTaxCode: "",
    buyerAddress: "",
    buyerPhone: "",
    buyerEmail: "",
    plateNumber: "",
    vinNumber: "",
    salePrice: String(car.price),
    depositAmount: "",
    paymentMethod: PAYMENT_METHODS[0],
    hasTradeIn: false,
    tradeInModel: "",
    tradeInValue: "",
    warrantyDuration: WARRANTIES[1],
    deliveryDate: addDays(today, 7),
  });
  const set = <K extends keyof typeof f>(key: K, value: (typeof f)[K]) =>
    setF((prev) => ({ ...prev, [key]: value }));

  const price = Number(f.salePrice) || 0;
  const deposit = Number(f.depositAmount) || 0;
  const tradeIn = f.hasTradeIn ? Number(f.tradeInValue) || 0 : 0;
  const balance = Math.max(0, price - deposit - tradeIn);

  function submit() {
    onPreview({
      buyerName: f.buyerName.trim(),
      buyerTaxCode: f.buyerTaxCode.trim().toUpperCase(),
      buyerAddress: f.buyerAddress.trim(),
      buyerPhone: f.buyerPhone.trim(),
      buyerEmail: f.buyerEmail.trim(),
      carId: car.id,
      plateNumber: f.plateNumber.trim().toUpperCase(),
      vinNumber: f.vinNumber.trim().toUpperCase(),
      salePrice: price,
      depositAmount: deposit,
      balanceAmount: balance,
      paymentMethod: f.paymentMethod,
      tradeInModel: f.hasTradeIn ? f.tradeInModel.trim() : "",
      tradeInValue: tradeIn,
      warrantyDuration: f.warrantyDuration,
      deliveryDate: f.deliveryDate,
      templateType: "contratto_vendita",
    });
  }

  return (
    <Drawer
      title="Contratto di vendita"
      subtitle={`${car.brand} ${car.model} · ${car.version}`}
      submitLabel="Vedi anteprima"
      onSubmit={submit}
      onClose={onClose}
      width="max-w-xl"
    >
      <Section title="Acquirente" columns={2}>
        <Field label="Nome e cognome / ragione sociale" className="sm:col-span-2">
          <input
            required
            autoFocus
            value={f.buyerName}
            onChange={(e) => set("buyerName", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Codice fiscale / P.IVA">
          <input
            required
            value={f.buyerTaxCode}
            onChange={(e) => set("buyerTaxCode", e.target.value)}
            className={`${inputCls} font-mono uppercase`}
          />
        </Field>
        <Field label="Telefono">
          <input
            required
            type="tel"
            value={f.buyerPhone}
            onChange={(e) => set("buyerPhone", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Indirizzo di residenza / sede" className="sm:col-span-2">
          <input
            value={f.buyerAddress}
            onChange={(e) => set("buyerAddress", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Email" className="sm:col-span-2">
          <input
            type="email"
            value={f.buyerEmail}
            onChange={(e) => set("buyerEmail", e.target.value)}
            className={inputCls}
          />
        </Field>
      </Section>

      <Section title="Veicolo" columns={2}>
        <Field label="Targa">
          <input
            value={f.plateNumber}
            onChange={(e) => set("plateNumber", e.target.value)}
            className={`${inputCls} font-mono uppercase`}
          />
        </Field>
        <Field label="Numero di telaio (VIN)">
          <input
            value={f.vinNumber}
            onChange={(e) => set("vinNumber", e.target.value)}
            className={`${inputCls} font-mono uppercase`}
          />
        </Field>
      </Section>

      <Section title="Condizioni" columns={2}>
        <Field label="Prezzo concordato (€)">
          <input
            required
            type="number"
            min={0}
            value={f.salePrice}
            onChange={(e) => set("salePrice", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Acconto / caparra (€)">
          <input
            type="number"
            min={0}
            value={f.depositAmount}
            onChange={(e) => set("depositAmount", e.target.value)}
            className={inputCls}
          />
        </Field>

        <div className="flex items-center justify-between gap-3 rounded-lg border border-adm-line bg-adm-bg px-3.5 py-2.5 sm:col-span-2">
          <div>
            <p className="text-sm font-medium text-white">Permuta usato</p>
            <p className="text-xs text-adm-muted">Il cliente consegna un&apos;auto in permuta</p>
          </div>
          <Switch
            checked={f.hasTradeIn}
            onChange={(v) => set("hasTradeIn", v)}
            label="Permuta usato"
          />
        </div>
        {f.hasTradeIn && (
          <>
            <Field label="Auto in permuta">
              <input
                required
                placeholder="BMW Serie 3 320d 2020"
                value={f.tradeInModel}
                onChange={(e) => set("tradeInModel", e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Valutazione (€)">
              <input
                required
                type="number"
                min={0}
                value={f.tradeInValue}
                onChange={(e) => set("tradeInValue", e.target.value)}
                className={inputCls}
              />
            </Field>
          </>
        )}

        <div className="flex items-center justify-between rounded-lg border border-blue-500/30 bg-blue-500/10 px-3.5 py-2.5 sm:col-span-2">
          <span className="text-sm text-slate-200">Saldo alla consegna</span>
          <span className="text-lg font-semibold tabular-nums text-white">{eur(balance)}</span>
        </div>

        <Field label="Pagamento del saldo">
          <select
            value={f.paymentMethod}
            onChange={(e) => set("paymentMethod", e.target.value)}
            className={inputCls}
          >
            {PAYMENT_METHODS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </Field>
        <Field label="Consegna prevista">
          <input
            type="date"
            value={f.deliveryDate}
            onChange={(e) => set("deliveryDate", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Garanzia" className="sm:col-span-2">
          <select
            value={f.warrantyDuration}
            onChange={(e) => set("warrantyDuration", e.target.value)}
            className={inputCls}
          >
            {WARRANTIES.map((w) => (
              <option key={w}>{w}</option>
            ))}
          </select>
        </Field>
      </Section>
    </Drawer>
  );
}
