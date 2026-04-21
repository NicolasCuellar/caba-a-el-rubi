"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Users, Wifi, Coffee, Bath, TreePine, ChevronLeft, ChevronRight, CarFront, PawPrint, Flame } from "lucide-react"
import { Button } from "@/components/ui/button"

const images = [
  { src: "/images/cabaña rubi.png", alt: "Cabana A exterior" },
  { src: "/images/habitacion rubi.jpeg", alt: "Cabana A interior" }, //cabin-a-interior.jpg
]

const features = [
  { icon: Users, label: "2 - 4 personas" },
  { icon: Wifi, label: "Wi-Fi gratis" },
  { icon: Coffee, label: "Cocina equipada" },
  { icon: Bath, label: "Bano privado" },
  { icon: TreePine, label: "Vista a la montana" },
]

export function CabinASection() {
  const [current, setCurrent] = useState(0)

  const next = () => setCurrent((c) => (c + 1) % images.length)
  const prev = () => setCurrent((c) => (c - 1 + images.length) % images.length)

  return (
    <section id="cabana-a" className="py-16 md:py-24 bg-secondary/30">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-10 text-center">
          <p className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-accent">
            Alojamiento
          </p>
          <h2 className="font-serif text-3xl font-bold text-foreground md:text-4xl">
            Cabana A
          </h2>
        </div>

        {/* Carousel + Info */}
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Image carousel */}
          <div className="relative overflow-hidden rounded-xl">
            <div className="relative aspect-[4/3]">
              {images.map((img, i) => (
                <Image
                  key={img.src}
                  src={img.src}
                  alt={img.alt}
                  fill
                  className={`object-cover transition-opacity duration-500 ${
                    i === current ? "opacity-100" : "opacity-0"
                  }`}
                />
              ))}
            </div>
            <button
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-card/80 backdrop-blur-sm text-foreground transition-colors hover:bg-card"
              aria-label="Imagen anterior"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-card/80 backdrop-blur-sm text-foreground transition-colors hover:bg-card"
              aria-label="Imagen siguiente"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            {/* Dots */}
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={`h-2 w-2 rounded-full transition-all ${
                    i === current ? "bg-accent w-6" : "bg-card/60"
                  }`}
                  aria-label={`Ver imagen ${i + 1}`}
                />
              ))}
            </div>
          </div>

          {/* Info */}
          <div className="flex flex-col justify-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-1.5 text-xs font-semibold text-accent w-fit">
              {"Desde $180.000 / noche"}
            </div>
            <h3 className="mb-4 font-serif text-2xl font-bold text-foreground">
              Ideal para parejas o familias pequenas
            </h3>
            <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
              Nuestra Cabana A ofrece un espacio acogedor con todo lo necesario para una estadia
              confortable. Disfruta de la vista a las montanas desde tu ventana mientras te
              desconectas de la rutina diaria.
            </p>

            {/* Features */}
            <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {features.map((f) => (
                <div
                  key={f.label}
                  className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5"
                >
                  <f.icon className="h-4 w-4 text-primary" />
                  <span className="text-xs font-medium text-foreground">{f.label}</span>
                </div>
              ))}
            </div>

            <Button
              asChild
              size="lg"
              className="bg-accent text-accent-foreground hover:bg-accent/90 w-fit px-8"
            >
              <Link href="#formulario">Reservar esta cabana</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
