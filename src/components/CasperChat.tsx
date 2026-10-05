"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useCars } from "@/context/CarContext";
import { Car } from "@/types/car";
import CasperCallbackForm from "@/components/CasperCallbackForm";
import { useSite } from "@/context/SiteContext";
import {
  Ghost,
  X,
  Send,
  Sparkles,
  Phone,
  MessageSquare,
  ArrowRight,
  RotateCcw,
  Sliders,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Bot,
} from "lucide-react";

interface ChatMessage {
  id: string;
  sender: "casper" | "user";
  text: string;
  recommendedCars?: Car[];
  commissionProposal?: {
    model: string;
    budget: string;
    reason: string;
  };
  ctaType?: "whatsapp" | "commission" | "catalog";
  timestamp: string;
}

const TEASER_KEY = "gd_casper_teaser_seen";

export default function CasperChat({
  onSelectCar,
}: {
  onSelectCar?: (car: Car) => void;
}) {
  const { cars } = useCars();
  const { site, whatsappUrl } = useSite();
  const [isOpen, setIsOpen] = useState(false);
  const [showTeaser, setShowTeaser] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const initialGreeting: ChatMessage = {
    id: "welcome",
    sender: "casper",
    text: "Ciao! Sono **Casper**, il tuo consulente virtuale di Global Drive. 👻\n\nRaccontami cosa desideri: il tuo budget, la tipologia di vettura o come intendi utilizzarla. Posso trovare la vettura perfetta nel nostro stock oppure consigliarti quale modello richiedere **su commissione** in base al mercato attuale!",
    timestamp: "Adesso",
  };

  const [messages, setMessages] = useState<ChatMessage[]>([initialGreeting]);

  const quickPrompts = [
    "Cerco una sportiva con più di 500 CV",
    "Vorrei un SUV di prestigio",
    "Cerco un'auto su commissione con budget €40k-€60k",
    "Quali vetture avete in pronta consegna?",
  ];

  // Il fumetto compare dopo qualche secondo, resta poco e non torna se l'utente
  // l'ha chiuso o ha già aperto la chat: così non copre i contenuti appena si
  // arriva sulla pagina.
  useEffect(() => {
    const show = setTimeout(() => {
      try {
        if (sessionStorage.getItem(TEASER_KEY)) return;
      } catch {}
      setShowTeaser(true);
    }, 5000);
    const hide = setTimeout(() => setShowTeaser(false), 19000);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, []);

  const dismissTeaser = () => {
    setShowTeaser(false);
    try {
      sessionStorage.setItem(TEASER_KEY, "1");
    } catch {}
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, isTyping]);

  const generateCasperResponse = (userText: string): Omit<ChatMessage, "id" | "sender" | "timestamp"> => {
    const text = userText.toLowerCase();
    const visibleCars = cars.filter((c) => !c.hidden);

    // 1. Sportive / Alte Prestazioni / 500 CV
    if (text.includes("sportiv") || text.includes("cv") || text.includes("cavall") || text.includes("veloce")) {
      const sportsCars = visibleCars.filter(
        (c) => c.category === "Sportiva" || c.category === "Coupé" || c.power >= 500
      );

      if (sportsCars.length > 0) {
        return {
          text: `Ho individuato nel nostro parco auto delle autentiche gemme ad altissime prestazioni! 🔥\n\nEcco le migliori opzioni disponibili e pronte per essere provate in sede:`,
          recommendedCars: sportsCars.slice(0, 2),
          ctaType: "whatsapp",
        };
      }
    }

    // 2. SUV / Spazio / Famiglia
    if (text.includes("suv") || text.includes("famigli") || text.includes("spazio") || text.includes("viagg") || text.includes("duster") || text.includes("renegade") || text.includes("trazione")) {
      const suvs = visibleCars.filter((c) => c.category === "SUV");
      if (suvs.length > 0) {
        return {
          text: `Per comfort, sicurezza e versatilità nel Nord Sardegna abbiamo selezionato questi straordinari SUV con trazione integrale e dotazioni complete:`,
          recommendedCars: suvs.slice(0, 2),
          ctaType: "whatsapp",
        };
      }
    }

    // 3. Auto su Commissione / Budget specifico / Auto non in lista
    if (text.includes("commission") || text.includes("cercami") || text.includes("trovami") || text.includes("40") || text.includes("50") || text.includes("60") || text.includes("golf") || text.includes("tiguan") || text.includes("bmw serie") || text.includes("mercedes a")) {
      return {
        text: `Ottima idea! Con il servizio **Auto su Commissione** di Global Drive possiamo scovare esattamente l'esemplare che desideri selezionando le migliori opportunità sul mercato.\n\n💡 **Il mio consiglio per il mercato attuale:**\nIn questa fascia possiamo selezionare veicoli con storico e documentazione verificati, garanzia legale ed eventuali garanzie aggiuntive, con consegna a domicilio nel Nord Sardegna.`,
        commissionProposal: {
          model: text.includes("golf") ? "Volkswagen Golf" : text.includes("tiguan") ? "Volkswagen Tiguan" : "Vettura su Misura",
          budget: text.includes("50") ? "€ 50.000 - € 60.000" : "Budget Personalizzato",
          reason: "Ottima tenuta del valore residuo sul mercato e facilità di reperimento con chilometraggio certificato.",
        },
        ctaType: "commission",
      };
    }

    // 4. Budget generale o prezzi
    if (text.includes("budget") || text.includes("prezzo") || text.includes("cost") || text.includes("euro") || text.includes("€")) {
      return {
        text: `Abbiamo auto per diverse fasce di prezzo.\n\nPuoi esplorare l'intero catalogo o possiamo impostare una ricerca su commissione tarata esattamente sulla tua disponibilità economica.`,
        recommendedCars: visibleCars.slice(0, 2),
        ctaType: "catalog",
      };
    }

    // 5. Risposta di consulenza generica intelligente
    return {
      text: `Capisco perfettamente le tue esigenze. In base a quanto mi hai descritto, posso consigliarti due strade:\n\n1. Scegliere una delle nostre vetture **in pronta consegna** controllate prima della consegna.\n2. Attivare una **ricerca su commissione**, dove ci occupiamo noi di trovare l'auto ideale verificando documenti, perizia e trattativa sul prezzo.`,
      recommendedCars: visibleCars.slice(0, 1),
      ctaType: "whatsapp",
    };
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || inputMessage;
    if (!query.trim()) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: query,
      timestamp: "Ora",
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage("");
    setIsTyping(true);

    try {
      // Prova a chiamare l'API Gemini se configurata
      const res = await fetch("/api/casper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: query }),
      });
      const data = await res.json();

      if (data.success && data.reply) {
        const localMatches = generateCasperResponse(query);
        const casperMsg: ChatMessage = {
          id: `casper-${Date.now()}`,
          sender: "casper",
          text: data.reply,
          recommendedCars: localMatches.recommendedCars,
          commissionProposal: localMatches.commissionProposal,
          ctaType: localMatches.ctaType,
          timestamp: "Ora",
        };
        setMessages((prev) => [...prev, casperMsg]);
        setIsTyping(false);
        return;
      }
    } catch (e) {
      // In caso di assenza rete o errore API, usa il motore di simulazione locale
    }

    // Motore di simulazione intelligente e reattivo
    setTimeout(() => {
      const responseData = generateCasperResponse(query);
      const casperMsg: ChatMessage = {
        id: `casper-${Date.now()}`,
        sender: "casper",
        ...responseData,
        timestamp: "Ora",
      };
      setMessages((prev) => [...prev, casperMsg]);
      setIsTyping(false);
    }, 850);
  };

  const handleOpenCommissionModal = () => {
    const el = document.getElementById("servizi");
    if (el) el.scrollIntoView({ behavior: "smooth" });
    setIsOpen(false);
  };

  const handleOpenWhatsApp = (customText?: string) => {
    window.open(
      whatsappUrl(
        customText ||
          `Salve ${site.companyName}, stavo parlando con il vostro assistente virtuale Casper sul sito e vorrei maggiori informazioni.`
      ),
      "_blank"
    );
  };

  return (
    <>
      {/* Pulsante flottante + fumetto (in basso a destra, fumetto a sinistra del pulsante) */}
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 sm:bottom-6 sm:right-6">
        {!isOpen && showTeaser && (
          <div
            role="status"
            className="relative max-w-[min(15rem,calc(100vw-6.5rem))] rounded-2xl rounded-br-md border border-blue-500/30 bg-[#0a1128]/95 py-2.5 pl-4 pr-8 text-white shadow-xl shadow-black/50 backdrop-blur-md animate-in fade-in slide-in-from-right-2 duration-300"
          >
            <button
              type="button"
              onClick={() => {
                dismissTeaser();
                setIsOpen(true);
              }}
              className="cursor-pointer text-left text-xs font-semibold leading-snug text-slate-200 hover:text-white"
            >
              Ciao, sono <span className="text-blue-400">Casper</span>! Ti aiuto a trovare l&apos;auto giusta.
            </button>
            <button
              type="button"
              onClick={dismissTeaser}
              aria-label="Chiudi suggerimento"
              className="absolute right-1.5 top-1.5 grid size-5 cursor-pointer place-items-center rounded-full text-slate-500 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="size-3" />
            </button>
          </div>
        )}

        <button
          onClick={() => {
            setIsOpen(!isOpen);
            dismissTeaser();
          }}
          className={`relative flex size-14 shrink-0 cursor-pointer items-center justify-center rounded-full shadow-2xl transition-all duration-500 ${
            isOpen
              ? "rotate-90 border border-white/20 bg-slate-800 text-slate-300 hover:text-white"
              : "bg-gradient-to-tr from-blue-700 via-blue-600 to-cyan-400 text-white shadow-blue-600/50 hover:scale-110 hover:shadow-blue-500/70"
          }`}
          aria-label={isOpen ? "Chiudi assistente Casper" : "Apri assistente Casper"}
        >
          {isOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <div className="relative">
              <Ghost className="w-7 h-7 drop-shadow-md animate-[bounce_3s_ease-in-out_infinite] motion-reduce:animate-none" />
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#060913] animate-pulse motion-reduce:animate-none" />
            </div>
          )}
        </button>
      </div>

      {/* Casper Chat Window */}
      {isOpen && (
        <div className="fixed bottom-[5.5rem] right-3 sm:bottom-24 sm:right-6 z-50 w-[calc(100vw-1.5rem)] sm:w-[420px] h-[min(600px,calc(100dvh-7rem))] rounded-3xl glass-panel bg-[#070d1e]/95 border border-blue-500/30 shadow-2xl shadow-black/80 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-300">
          {/* Header Bar */}
          <div className="px-5 py-4 bg-gradient-to-r from-[#0d1633] to-[#091024] border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/40">
                <Ghost className="w-6 h-6" />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-[#060913]" />
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-extrabold text-white">Casper</h3>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                    AI Assistant
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Global Drive • Consulente Automotive
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setMessages([initialGreeting])}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                title="Ricomincia conversazione"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                title="Chiudi"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
            {messages.map((msg, index) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.sender === "user" ? "items-end" : "items-start"
                }`}
              >
                {/* Bubble Container */}
                <div
                  className={`max-w-[88%] rounded-2xl p-3.5 space-y-2.5 ${
                    msg.sender === "user"
                      ? "bg-blue-600 text-white rounded-tr-none shadow-lg shadow-blue-600/30"
                      : "bg-[#0d1630] text-slate-200 rounded-tl-none border border-white/10"
                  }`}
                >
                  <p className="leading-relaxed whitespace-pre-line font-light">
                    {msg.text}
                  </p>

                  {/* Embedded Recommended Cars from Catalog */}
                  {msg.recommendedCars && msg.recommendedCars.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <p className="text-[10px] uppercase font-bold tracking-wider text-blue-400">
                        Disponibili in Showroom:
                      </p>
                      {msg.recommendedCars.map((car) => (
                        <div
                          key={car.id}
                          className="p-2 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between gap-3 hover:border-blue-500/40 transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="relative w-12 h-9 rounded-lg overflow-hidden flex-shrink-0 bg-slate-800">
                              <Image
                                src={car.images[0] || ""}
                                alt={car.model}
                                fill
                                className="object-cover"
                              />
                            </div>
                            <div>
                              <p className="font-bold text-white text-[11px] line-clamp-1">
                                {car.brand} {car.model}
                              </p>
                              <p className="text-[10px] text-blue-300 font-semibold">
                                € {new Intl.NumberFormat("it-IT").format(car.price)}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              if (onSelectCar) onSelectCar(car);
                              const el = document.getElementById("catalogo");
                              if (el) el.scrollIntoView({ behavior: "smooth" });
                            }}
                            className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold uppercase transition-all"
                          >
                            Vedi
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Embedded Commission Proposal Box */}
                  {msg.commissionProposal && (
                    <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/30 space-y-2">
                      <div className="flex items-center gap-1.5 text-indigo-300 font-bold text-[11px]">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Consiglio di Mercato su Commissione</span>
                      </div>
                      <p className="text-[11px] text-white font-semibold">
                        {msg.commissionProposal.model}
                      </p>
                      <p className="text-[10px] text-slate-300">
                        Budget consigliato: <strong className="text-white">{msg.commissionProposal.budget}</strong>
                      </p>
                      <p className="text-[10px] text-slate-400 italic">
                        {msg.commissionProposal.reason}
                      </p>
                    </div>
                  )}

                  {/* Contextual Action Buttons */}
                  {msg.ctaType && (
                    <div className="pt-2 border-t border-white/10 flex flex-col gap-1.5">
                      {msg.ctaType === "commission" ? (
                        <button
                          type="button"
                          onClick={handleOpenCommissionModal}
                          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] uppercase tracking-wider transition-all"
                        >
                          <Sliders className="w-3 h-3" />
                          <span>Apri Modulo su Commissione</span>
                        </button>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => handleOpenWhatsApp()}
                        className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] uppercase tracking-wider transition-all"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>Scrivi a Global Drive su WhatsApp</span>
                      </button>

                      <CasperCallbackForm context={messages[index - 1]?.text} />
                    </div>
                  )}
                </div>

                <span className="text-[9px] text-slate-500 mt-1 px-1">
                  {msg.timestamp}
                </span>
              </div>
            ))}

            {/* Casper Typing Bubble */}
            {isTyping && (
              <div className="flex items-center gap-2 p-3 rounded-2xl bg-[#0d1630] border border-white/10 w-24">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Carousel */}
          {messages.length <= 2 && (
            <div className="px-4 py-2 border-t border-white/5 bg-black/20 flex gap-2 overflow-x-auto pb-2 scrollbar-none">
              {quickPrompts.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => handleSendMessage(prompt)}
                  className="px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-[10px] whitespace-nowrap transition-colors flex-shrink-0"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-[#0a1126] border-t border-white/10 flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Chiedi a Casper (es. Cerco un SUV da 60k...)"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim()}
              className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white transition-all shadow-md shadow-blue-600/30 cursor-pointer disabled:cursor-not-allowed"
              aria-label="Invia messaggio"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
