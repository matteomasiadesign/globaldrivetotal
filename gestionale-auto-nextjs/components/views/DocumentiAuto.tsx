"use client";

import { useState, useRef } from "react";
import { Upload, FileText, Image as ImageIcon, Trash2, ExternalLink } from "lucide-react";
import type { Documento, TipoDocumento } from "@/lib/calc";
import { TIPI_DOCUMENTO } from "@/lib/calc";
import { createClient } from "@/lib/supabase/client";

export default function DocumentiAuto({ autoId, documenti, onUploaded, onDeleted }: {
  autoId: string; documenti: Documento[]; onUploaded: (doc: Documento) => void; onDeleted: (id: string) => void;
}) {
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [tipoSelezionato, setTipoSelezionato] = useState<TipoDocumento>("Foto");
  const [caricando, setCaricando] = useState(false);
  const [erroreLocale, setErroreLocale] = useState<string | null>(null);

  async function handleFile(file: File) {
    setCaricando(true);
    setErroreLocale(null);
    const path = `${autoId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
    const { error: uploadError } = await supabase.storage.from("veicoli-documenti").upload(path, file);
    if (uploadError) { setErroreLocale("Caricamento non riuscito: " + uploadError.message); setCaricando(false); return; }
    const { data, error } = await supabase.from("documenti").insert({
      auto_id: autoId, nome_file: file.name, tipo: tipoSelezionato, storage_path: path,
    }).select().single();
    if (error || !data) { setErroreLocale("Salvataggio riferimento file non riuscito."); setCaricando(false); return; }
    onUploaded({ id: data.id, autoId, nomeFile: data.nome_file, tipo: data.tipo, storagePath: data.storage_path });
    setCaricando(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleApri(doc: Documento) {
    const { data, error } = await supabase.storage.from("veicoli-documenti").createSignedUrl(doc.storagePath, 3600);
    if (error || !data) { setErroreLocale("Impossibile aprire il file."); return; }
    window.open(data.signedUrl, "_blank");
  }

  async function handleElimina(doc: Documento) {
    await supabase.storage.from("veicoli-documenti").remove([doc.storagePath]);
    const { error } = await supabase.from("documenti").delete().eq("id", doc.id);
    if (error) { setErroreLocale("Impossibile eliminare il file."); return; }
    onDeleted(doc.id);
  }

  return (
    <div className="ga-card" style={{ padding: 20 }}>
      <div className="ga-display" style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Foto e documenti</div>

      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        <select className="ga-input" style={{ width: 170 }} value={tipoSelezionato} onChange={(e) => setTipoSelezionato(e.target.value as TipoDocumento)}>
          {TIPI_DOCUMENTO.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <input ref={fileRef} type="file" style={{ display: "none" }} onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
        <button className="ga-btn" disabled={caricando} onClick={() => fileRef.current?.click()}>
          <Upload size={14} /> {caricando ? "Carico…" : "Carica file"}
        </button>
      </div>
      {erroreLocale && <div style={{ fontSize: 12, color: "var(--bad)", marginBottom: 10 }}>{erroreLocale}</div>}

      {documenti.length === 0 ? (
        <div style={{ fontSize: 13, color: "var(--muted)", padding: "10px 0", textAlign: "center" }}>Nessun file caricato per questa auto.</div>
      ) : (
        <div style={{ display: "grid", gap: 6 }}>
          {documenti.map((doc) => (
            <div key={doc.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8 }}>
              {doc.tipo === "Foto" ? <ImageIcon size={16} style={{ color: "var(--muted)", flexShrink: 0 }} /> : <FileText size={16} style={{ color: "var(--muted)", flexShrink: 0 }} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{doc.nomeFile}</div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>{doc.tipo}</div>
              </div>
              <button onClick={() => handleApri(doc)} style={{ border: "none", background: "none", cursor: "pointer", color: "var(--muted)", display: "flex" }} title="Apri"><ExternalLink size={14} /></button>
              <button onClick={() => handleElimina(doc)} style={{ border: "none", background: "none", cursor: "pointer", color: "var(--muted)", display: "flex" }} title="Elimina"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
