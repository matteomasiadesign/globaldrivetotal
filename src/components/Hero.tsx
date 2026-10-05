"use client";

import React, { useRef } from "react";
import Image from "next/image";
import { ArrowDown } from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useSite } from "@/context/SiteContext";

export default function Hero() {
  const { site } = useSite();
  const containerRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  // Dissolvenza controllata ed elegante dei contenuti Hero
  const contentY = useTransform(scrollYProgress, [0, 0.55], [0, -50]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.4], [1, 0]);
  const contentScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.96]);

  // Parallasse di sfondo e oscuramento cinematografico progressivo
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);
  const bgScale = useTransform(scrollYProgress, [0, 1], [1, 1.06]);
  const darkEngulfOpacity = useTransform(scrollYProgress, [0, 0.7], [0, 0.75]);

  // Salita della nebbia scura volumetrica dal fondo
  const mistY = useTransform(scrollYProgress, [0, 0.8], ["20%", "0%"]);
  const mistOpacity = useTransform(scrollYProgress, [0, 0.5], [0.65, 1]);

  const scrollToCatalog = () => {
    const el = document.getElementById("catalogo");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const scrollToServices = () => {
    const el = document.getElementById("servizi");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section
      ref={containerRef}
      className="relative w-full h-[100dvh] min-h-[100dvh] max-h-[100dvh] flex items-center justify-center overflow-hidden bg-[#060913] select-none z-10"
    >
      {/* 100% Full Height & Full Width Background Image with subtle Parallax */}
      <motion.div
        style={{ y: bgY, scale: bgScale }}
        className="absolute inset-0 z-0 w-full h-full pointer-events-none will-change-transform"
      >
        <Image
          src="https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=2560&q=90"
          alt="Dark Moody Luxury Car Atmosphere"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center w-full h-full filter brightness-75 contrast-125"
        />

        {/* Cinematic Vignette & Moody Lighting Overlay di base */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#060913] via-[#060913]/55 to-black/60" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#060913]/80 via-transparent to-[#060913]/80" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(0,102,255,0.18)_0%,_transparent_70%)]" />

        {/* Subtle grid pattern for modern tech look */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`,
            backgroundSize: "70px 70px",
          }}
        />
      </motion.div>

      {/* Dynamic Dark Engulfing Layer (Scurisce e inghiotte l'auto con eleganza durante lo scroll) */}
      <motion.div
        style={{ opacity: darkEngulfOpacity }}
        className="absolute inset-0 bg-[#060913] z-[2] pointer-events-none"
      />

      {/* Central Content Box con transizione di dissolvenza sobria in scroll */}
      <motion.div
        style={{
          y: contentY,
          opacity: contentOpacity,
          scale: contentScale,
        }}
        className="relative z-10 max-w-4xl mx-auto px-6 sm:px-8 text-center flex flex-col items-center pt-8 sm:pt-4 will-change-transform"
      >
        {/* Titolo con animazione di apertura graduale e morbido de-blur */}
        <motion.h1
          initial={{ opacity: 0, y: 28, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
          className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white leading-[1.15] mb-4 drop-shadow-2xl"
        >
          {site.heroTitle}
          <br />
          <span className="bg-gradient-to-r from-white via-blue-200 to-blue-500 bg-clip-text text-transparent">
            {site.heroHighlight}
          </span>
        </motion.h1>

        {/* Sottotitolo in apertura sfalsata */}
        <motion.p
          initial={{ opacity: 0, y: 20, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1], delay: 0.35 }}
          className="text-sm sm:text-base md:text-lg text-slate-300 max-w-lg font-light leading-relaxed mb-7 text-pretty"
        >
          {site.heroSubtitle}
        </motion.p>

        {/* Action Buttons in apertura */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.5 }}
          className="flex flex-wrap items-center justify-center gap-3.5"
        >
          <button
            onClick={scrollToCatalog}
            className="inline-flex items-center justify-center gap-2 px-7 py-3 rounded-full text-xs sm:text-sm font-bold uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-500 shadow-xl shadow-blue-600/40 hover:shadow-blue-500/60 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 cursor-pointer"
          >
            <span>Vai al Catalogo</span>
            <ArrowDown className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={scrollToServices}
            className="inline-flex items-center justify-center gap-2 px-7 py-3 rounded-full text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-200 hover:text-white bg-white/5 hover:bg-white/10 border border-white/15 hover:border-white/30 backdrop-blur-md hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 cursor-pointer"
          >
            <span>I Nostri Servizi</span>
          </button>
        </motion.div>
      </motion.div>

      {/* Volumetric Dark Mist / Nebbia Scura che sale dal fondo della Hero */}
      <motion.div
        style={{ y: mistY, opacity: mistOpacity }}
        className="absolute inset-x-0 bottom-0 h-[65vh] z-[5] pointer-events-none flex flex-col justify-end will-change-transform"
      >
        {/* Strato atmosferico di gradiente fluido scuro */}
        <div className="w-full h-full bg-gradient-to-t from-[#060913] via-[#060913]/90 via-45% to-transparent" />

        {/* Nuvole di nebbia organiche volumetriche (soft blurred layers) */}
        <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-[150%] h-[320px] bg-[#060913] rounded-full blur-3xl opacity-95" />
        <div className="absolute -bottom-4 left-1/4 -translate-x-1/2 w-[600px] h-[220px] bg-slate-950/80 rounded-full blur-2xl opacity-90" />
        <div className="absolute -bottom-6 right-1/4 translate-x-1/4 w-[650px] h-[240px] bg-slate-950/80 rounded-full blur-2xl opacity-90" />

        {/* Bagliore notturno profondo molto discreto */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[500px] h-[120px] bg-blue-900/15 rounded-full blur-[80px]" />
      </motion.div>
    </section>
  );
}

