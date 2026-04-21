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
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15904.92!2d-75.295!3d4.473!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8e38c4e2f5e9c0af%3A0x1234567890abcdef!2sVillarestrepo%2C%20Ibagu%C3%A9%2C%20Tolima!5e0!3m2!1ses!2sco!4v1700000000000!5m2!1ses!2sco"
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
