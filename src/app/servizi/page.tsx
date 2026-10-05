import ServicesSection from "@/components/ServicesSection";

export default function ServiziPage() {
  return (
    <div className="pt-28 pb-24 min-h-screen bg-[#060913] text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-3xl sm:text-6xl font-black text-white tracking-tight">
            I Nostri Servizi
          </h1>
          <p className="text-base sm:text-lg text-slate-400 mt-4 leading-relaxed font-light">
            Auto usate garantite, ricerca su commissione e conto vendita:
            trasparenza e assistenza dalla scelta fino alla consegna.
          </p>
        </div>

        <ServicesSection />
      </div>
    </div>
  );
}
