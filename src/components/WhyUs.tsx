"use client";

import React from "react";
import Image from "next/image";
import { useSite } from "@/context/SiteContext";
import { Reveal } from "@/components/ui/Reveal";
import {
  Star,
  ShieldCheck,
  Award,
  Users,
  MapPin,
  Clock,
  Phone,
  Mail,
  CheckCircle,
} from "lucide-react";

export default function WhyUs() {
  const { site } = useSite();
  const { stats, reviews } = site;

  return (
    <section id="showroom" className="py-24 bg-[#060913] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Top Stats Banner */}
        {site.showStats && stats.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-24">
          {stats.map((s, i) => (
            <Reveal key={i} delay={i * 0.1} className="h-full">
            <div
              className="glass-panel h-full p-6 rounded-3xl border border-white/10 text-center relative overflow-hidden group hover:border-blue-500/30 transition-all"
            >
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <p className="text-3xl sm:text-5xl font-black text-white tracking-tight bg-gradient-to-r from-white to-blue-200 bg-clip-text">
                {s.value}
              </p>
              <p className="text-xs sm:text-sm text-slate-400 font-medium mt-2">
                {s.label}
              </p>
            </div>
            </Reveal>
          ))}
        </div>
        )}

        {/* Chi siamo */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-24">
          <Reveal className="space-y-6">
            <h2 className="text-3xl sm:text-5xl font-black text-white leading-tight">
              {site.aboutTitle}
            </h2>
            <p className="text-base text-slate-300 font-light leading-relaxed text-pretty">
              {site.aboutText}
            </p>

            <div className="space-y-3 pt-2">
              {site.aboutBullets.map((item, i) => (
                <div key={i} className="flex items-center gap-3 text-sm text-slate-200">
                  <CheckCircle className="w-5 h-5 text-blue-400 flex-shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <div className="pt-4 flex flex-wrap gap-4 text-xs font-semibold text-slate-300">
              <div className="flex items-center gap-2 bg-white/5 px-4 py-2.5 rounded-xl border border-white/10">
                <MapPin className="w-4 h-4 text-blue-400" />
                <span>{site.location}</span>
              </div>
              <div className="flex items-center gap-2 bg-white/5 px-4 py-2.5 rounded-xl border border-white/10">
                <Clock className="w-4 h-4 text-blue-400" />
                <span>{site.hoursNote}</span>
              </div>
            </div>
          </Reveal>

          {/* Showroom Image Showcase */}
          <Reveal delay={0.15}>
          <div className="relative aspect-[4/3] rounded-3xl overflow-hidden border border-white/15 shadow-2xl group">
            <Image
              src="https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=1600&q=80"
              alt={site.companyName}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#060913] via-transparent to-black/20" />
            <div className="absolute bottom-6 left-6 right-6 p-4 rounded-2xl glass-panel border border-white/15 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-white uppercase tracking-wider">{site.aboutCaptionTitle}</p>
                <p className="text-[11px] text-slate-300">{site.aboutCaptionText}</p>
              </div>
              <a
                href={site.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-blue-400 hover:text-white uppercase tracking-wider transition-colors"
              >
                Indicazioni →
              </a>
            </div>
          </div>
          </Reveal>
        </div>

        {/* Recensioni */}
        {site.showReviews && reviews.length > 0 && (
        <div className="mt-16">
          <Reveal className="text-center max-w-xl mx-auto mb-12">
            <div className="flex justify-center gap-1 mb-2 text-amber-400">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 fill-amber-400" />
              ))}
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-white">
              Cosa Dicono i Nostri Clienti
            </h3>
            <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider">
              Recensioni verificate su Google e Trustpilot
            </p>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {reviews.map((r, i) => (
              <Reveal key={i} delay={i * 0.12} className="h-full">
              <div
                className="glass-panel h-full p-6 rounded-3xl border border-white/10 flex flex-col justify-between space-y-4 hover:border-blue-500/30 transition-all"
              >
                <div className="space-y-3">
                  <div className="flex text-amber-400 gap-1">
                    {[...Array(5)].map((_, idx) => (
                      <Star key={idx} className="w-3.5 h-3.5 fill-amber-400" />
                    ))}
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed italic">
                    &ldquo;{r.quote}&rdquo;
                  </p>
                </div>

                <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-white">{r.author}</p>
                    <p className="text-[10px] text-slate-400">{r.city}</p>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-md">
                    {r.car}
                  </span>
                </div>
              </div>
              </Reveal>
            ))}
          </div>
        </div>
        )}
      </div>
    </section>
  );
}
