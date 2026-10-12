"use client";

import React, { useState } from "react";
import { useCars } from "@/context/CarContext";
import { useAdmin, type NewAppointment } from "@/context/AdminContext";
import { APPOINTMENT_STATUSES, APPOINTMENT_TYPES, eur, isOpenAppointment } from "@/lib/admin/constants";
import { formatLongDate, fromDateStr } from "@/lib/admin/dates";
import type { Appointment, AppointmentStatus, AppointmentType } from "@/types/admin";
import { useGestionale } from "@/context/GestionaleContext";
import Combobox from "./ui/Combobox";
import Drawer from "./ui/Drawer";
import { Field, Section } from "./ui/Field";
import { inputCls, textareaCls } from "./ui/styles";
import { useToast } from "./ui/Toast";

export interface AppointmentEditorOptions {
  /** Appuntamento da modificare; se assente se ne crea uno nuovo. */
  appointment?: Appointment;
  /** Campi precompilati (dalla richiesta di un cliente o dalla scheda auto). */
  prefill?: Partial<NewAppointment>;
  /** Richiesta da cui nasce: passa a "in gestione" quando si salva. */
  leadId?: string;
}

const DEFAULT_LOCATION = "Showroom";

export default function AppointmentDrawer({
  appointment,
  prefill,
  leadId,
  onClose,
}: AppointmentEditorOptions & { onClose: () => void }) {
  const { cars } = useCars();
  const { today, leads, addAppointment, updateAppointment, updateLead } = useAdmin();
  const toast = useToast();
  const { contatti } = useGestionale();

  const initial = appointment ?? prefill;
  const isEdit = Boolean(appointment);

  const [clientName, setClientName] = useState(initial?.clientName ?? "");
  const [clientPhone, setClientPhone] = useState(initial?.clientPhone ?? "");
  const [clientEmail, setClientEmail] = useState(initial?.clientEmail ?? "");
  const [date, setDate] = useState(initial?.date ?? today);
  const [time, setTime] = useState(initial?.time ?? "10:00");
  const [durationMinutes, setDurationMinutes] = useState(initial?.durationMinutes ?? 45);
  const [type, setType] = useState<AppointmentType>(initial?.type ?? "Test Drive");
  // Se l'auto della richiesta nel frattempo è stata eliminata resta solo il nome.
  const [carId, setCarId] = useState(
    cars.some((c) => c.id === initial?.carId) ? (initial?.carId ?? "") : ""
  );
  const [location, setLocation] = useState(initial?.location ?? DEFAULT_LOCATION);
  const [locationTouched, setLocationTouched] = useState(Boolean(initial?.location));
  const [notes, setNotes] = useState(initial?.notes ?? "");
  // "Da confermare" quando l'orario va ancora concordato col cliente: compare in Oggi e in Agenda.
  const [status, setStatus] = useState<AppointmentStatus>(appointment?.status ?? prefill?.status ?? "Confermato");

  function pickCar(id: string) {
    setCarId(id);
    // La sede segue l'auto finché non la si scrive a mano.
    const car = cars.find((c) => c.id === id);
    if (car && !locationTouched) setLocation(car.location);
  }

  function submit() {
    const car = cars.find((c) => c.id === carId);
    const payload: NewAppointment = {
      clientName: clientName.trim(),
      clientPhone: clientPhone.trim(),
      clientEmail: clientEmail.trim(),
      date,
      time,
      durationMinutes,
      type,
      carId: carId || undefined,
      carName: car ? `${car.brand} ${car.model}` : initial?.carName,
      location: location.trim() || DEFAULT_LOCATION,
      status,
      notes: notes.trim() || undefined,
      leadId: appointment?.leadId ?? leadId,
    };

    const when = `${formatLongDate(fromDateStr(date))} alle ${time}`;
    if (appointment) {
      updateAppointment(appointment.id, payload);
      toast(`Appuntamento aggiornato: ${when}`);
    } else {
      addAppointment(payload);
      if (leadId) {
        const lead = leads.find((l) => l.id === leadId);
        if (lead?.status === "nuovo") updateLead(leadId, { status: "in_gestione" });
      }
      toast(`Appuntamento fissato: ${when}`);
    }
    onClose();
  }

  return (
    <Drawer
      title={isEdit ? "Modifica appuntamento" : "Nuovo appuntamento"}
      subtitle={leadId && !isEdit ? "Dalla richiesta del cliente" : undefined}
      submitLabel={isEdit ? "Salva modifiche" : "Fissa appuntamento"}
      onSubmit={submit}
      onClose={onClose}
    >
      <Section title="Cliente" columns={2}>
        {contatti.length > 0 && (
          <Field label="Dall'anagrafica" className="sm:col-span-2" hint="Sceglilo per compilare nome, telefono ed email.">
            <Combobox
              value=""
              placeholder="Cerca un cliente per nome o telefono…"
              ariaLabel="Cliente dall'anagrafica"
              opzioni={contatti.map((c) => ({ value: c.id, label: c.nome || "Senza nome", dettaglio: c.telefono }))}
              onChange={(id) => {
                const c = contatti.find((x) => x.id === id);
                if (!c) return;
                setClientName(c.nome);
                setClientPhone(c.telefono);
                setClientEmail(c.email);
              }}
            />
          </Field>
        )}
        <Field label="Nome e cognome" className="sm:col-span-2">
          <input
            required
            autoFocus={!clientName}
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Telefono">
          <input
            required
            type="tel"
            value={clientPhone}
            onChange={(e) => setClientPhone(e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Email (facoltativa)">
          <input
            type="email"
            value={clientEmail}
            onChange={(e) => setClientEmail(e.target.value)}
            className={inputCls}
          />
        </Field>
      </Section>

      <Section title="Quando" columns={3}>
        <Field label="Data">
          <input
            required
            type="date"
            min={isEdit ? undefined : today}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Ora">
          <input
            required
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Durata">
          <select
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(Number(e.target.value))}
            className={inputCls}
          >
            <option value={30}>30 min</option>
            <option value={45}>45 min</option>
            <option value={60}>1 ora</option>
            <option value={90}>1 ora e mezza</option>
          </select>
        </Field>
      </Section>

      <Section title="Incontro" columns={2}>
        <Field label="Tipo">
          <select
            value={type}
            onChange={(e) => setType(e.target.value as AppointmentType)}
            className={inputCls}
          >
            {/* Un appuntamento salvato con un tipo non più proposto lo tiene finché non lo si cambia. */}
            {(APPOINTMENT_TYPES.includes(type) ? APPOINTMENT_TYPES : [type, ...APPOINTMENT_TYPES]).map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Stato">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as AppointmentStatus)}
            className={inputCls}
          >
            {APPOINTMENT_STATUSES.filter((s) => isEdit || isOpenAppointment(s)).map((s) => (
              <option key={s} value={s}>
                {s === "In Attesa" ? "Da confermare" : s}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Luogo">
          <input
            value={location}
            onChange={(e) => {
              setLocation(e.target.value);
              setLocationTouched(true);
            }}
            className={inputCls}
          />
        </Field>
        <Field label="Vettura" className="sm:col-span-2">
          <Combobox
            value={carId}
            vuoto="Nessuna (consulenza generale)"
            placeholder="Cerca marca o modello…"
            ariaLabel="Vettura"
            opzioni={cars.map((c) => ({ value: c.id, label: `${c.brand} ${c.model}`, dettaglio: `${c.version} · ${eur(c.price)}` }))}
            onChange={pickCar}
          />
        </Field>
        <Field label="Note interne" className="sm:col-span-2">
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={textareaCls}
          />
        </Field>
      </Section>
    </Drawer>
  );
}
