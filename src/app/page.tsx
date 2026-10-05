import Hero from "@/components/Hero";
import FeaturedCars from "@/components/FeaturedCars";
import BrandMarquee from "@/components/BrandMarquee";
import ServicesSection from "@/components/ServicesSection";
import WhyUs from "@/components/WhyUs";
import ContactSection from "@/components/ContactSection";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <Hero />
      <FeaturedCars />
      <BrandMarquee />
      <ServicesSection />
      <WhyUs />
      <ContactSection />
    </div>
  );
}
