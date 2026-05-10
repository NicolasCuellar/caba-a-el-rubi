import type { Metadata } from "next"
import Image from "next/image"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"

import { ContactChannels } from "@/components/contacto/contact-channels"
import { ContactForm } from "@/components/contacto/contact-form"

export const metadata: Metadata = {
  title: "Contacto | La Cabana El Rubi - Villarestrepo, Tolima",
  description:
    "Contactanos por WhatsApp, telefono, email o Instagram. Estamos listos para ayudarte a planificar tu escapada en Villarestrepo.",
}

export default function ContactoPage() {
  return (
    <>
      <Navbar />
      <main>
        {/* Hero banner */}
        <section className="relative flex h-[40vh] min-h-[300px] items-center justify-center overflow-hidden">
          <Image
            src="/images/contacto.jpeg"
            alt="Recepcion La Cabana El Rubi"
            fill
            className="object-cover"
            priority
            quality={85}
          />
          <div className="absolute inset-0 bg-foreground/50" />
          <div className="relative z-10 flex flex-col items-center px-6 text-center">
            <p className="mb-3 text-sm font-medium uppercase tracking-[0.3em] text-primary-foreground/80">
              Hablemos
            </p>
            <h1 className="mb-3 font-serif text-4xl font-bold text-primary-foreground md:text-5xl text-balance">
              Contacto
            </h1>
            <p className="max-w-md text-base font-light text-primary-foreground/80">
              Estamos listos para ayudarte a planificar tu escapada perfecta.
            </p>
          </div>
        </section>

        <ContactChannels />
        <ContactForm />

        {/* Map full width */}
        <section className="h-[400px] w-full">
          <iframe
            src="https://www.google.com/maps?q=Caba%C3%B1a%20El%20Rub%C3%AD%2C%20Via%20Ibagu%C3%A9%20%23Kilometro%2012%2C%20Villa%20Restrepo%2C%20Ibagu%C3%A9%2C%20Tolima&output=embed"
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Ubicacion de La Cabana El Rubi"
          />
        </section>
      </main>
      <Footer />
    </>
  )
}
