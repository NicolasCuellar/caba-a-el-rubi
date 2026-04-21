import type { Metadata } from "next"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
 
import { ReservaBanner } from "@/components/reserva/reserva-banner"
import { LocationSection } from "@/components/reserva/location-section"
import { CabinASection } from "@/components/reserva/cabin-a-section"
import { CabinBSection } from "@/components/reserva/cabin-b-section"
import { CabinCSection } from "@/components/reserva/cabin-c-section"
import { AdditionalServicesSection } from "@/components/reserva/additional-services-section"
import { ReservationTabs } from "@/components/reserva/reservation-tabs"
 
export const metadata: Metadata = {
  title: "Reserva tu Cabana | La Cabana El Rubi - Villarestrepo",
  description:
    "Reserva tu cabana en Villarestrepo, Tolima. Conoce nuestras opciones de alojamiento, servicios adicionales y completa tu solicitud de reserva.",
}
 
export default function ReservaPage() {
  return (
    <>
      <Navbar />
      <main>
        <ReservaBanner />
        <LocationSection />
        <CabinASection />
        <CabinBSection />
        <CabinCSection />
        <AdditionalServicesSection />
        <ReservationTabs />
      </main>
      <Footer />
    </>
  )
}
 