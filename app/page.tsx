import { Navbar } from "@/components/navbar"
import { HeroSection } from "@/components/home/hero-section"
import { ServicesSection } from "@/components/home/services-section"
import { CabinsSection } from "@/components/home/cabins-section"
import { ValuesSection } from "@/components/home/values-section"
import { ContactCardSection } from "@/components/home/contact-card-section"
import { Footer } from "@/components/footer"


export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <ValuesSection />
        <CabinsSection />
        <ServicesSection />
        <ContactCardSection />
      </main>
      <Footer />
    </>
  )
}
