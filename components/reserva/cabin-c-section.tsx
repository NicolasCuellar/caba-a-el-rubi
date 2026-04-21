"use client"

import { useRef, useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Users, Wifi, Coffee, Bath, TreePine, Flame, Star, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

const features = [
  { icon: Users, label: "2 - 8 personas" },
  { icon: Wifi, label: "Wi-Fi premium" },
  { icon: Coffee, label: "Cocina gourmet" },
  { icon: Bath, label: "Jacuzzi privado" },
  { icon: TreePine, label: "Terraza panoramica" },
  { icon: Flame, label: "Chimenea" },
]

const story = [
  {
    title: "Despierta con vistas",
    text: "Cada manana te reciben las montanas a traves de los ventanales. El canto de los pajaros y el aroma a cafe fresco crean el despertar perfecto.",
  },
  {
    title: "Comodidad sin limites",
    text: "Disfruta del jacuzzi privado, la chimenea para las noches frescas y una terraza panoramica que te dejara sin palabras.",
  },
  {
    title: "Momentos inolvidables",
    text: "Desde cenas bajo las estrellas hasta caminatas al amanecer, esta cabana es el escenario perfecto para crear recuerdos que duraran toda la vida.",
  },
]

export function CabinCSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true)
      },
      { threshold: 0.15 }
    )
    if (sectionRef.current) observer.observe(sectionRef.current)
    return () => observer.disconnect()
  }, [])

  return (
    <section id="cabana-c" ref={sectionRef} className="overflow-hidden">
      {/* Full-width immersive hero */}
      <div className="relative flex min-h-[50vh] items-center justify-center">
        <Image
          src="/images/cabin-c.jpg"
          alt="Cabana C premium con ventanales y vista a la montana"
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-foreground/55" />
        <div className="relative z-10 flex flex-col items-center px-6 text-center">
          <div className="mb-4 flex items-center gap-2 rounded-full border border-primary-foreground/30 bg-primary-foreground/10 px-4 py-1.5 backdrop-blur-sm">
            <Star className="h-4 w-4 text-accent" />
            <span className="text-xs font-semibold text-primary-foreground">Cabana Premium</span>
          </div>
          <h2 className="mb-3 font-serif text-4xl font-bold text-primary-foreground md:text-5xl">
            Cabana C
          </h2>
          <p className="max-w-md text-base font-light text-primary-foreground/80">
            Nuestra experiencia mas exclusiva. Lujo, naturaleza y confort en perfecta armonia.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground">
            <Sparkles className="h-4 w-4" />
            {"Desde $320.000 / noche"}
          </div>
        </div>
      </div>

      {/* Storytelling content */}
      <div className="bg-card py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-6">
          {/* Story timeline */}
          <div className="mb-16 grid gap-8 md:grid-cols-3">
            {story.map((item, i) => (
              <div
                key={item.title}
                className={`relative pl-8 ${visible ? "animate-fade-in-up" : "opacity-0"}`}
                style={{ animationDelay: `${i * 0.2}s` }}
              >
                <div className="absolute left-0 top-0 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {i + 1}
                </div>
                <h3 className="mb-2 font-serif text-lg font-semibold text-foreground">
                  {item.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{item.text}</p>
              </div>
            ))}
          </div>

          {/* Features + images */}
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="relative col-span-1 row-span-2 overflow-hidden rounded-xl">
                <Image
                  src="/images/cabin-c-interior.jpg"
                  alt="Cabana C jacuzzi con vista"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="relative overflow-hidden rounded-xl">
                <Image
                  src="/images/cabin-b-interior.jpg"
                  alt="Cabana C sala de estar"
                  width={400}
                  height={250}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="relative overflow-hidden rounded-xl">
                <Image
                  src="/images/cabin-a-interior.jpg"
                  alt="Cabana C dormitorio"
                  width={400}
                  height={250}
                  className="h-full w-full object-cover"
                />
              </div>
            </div>

            <div className="flex flex-col justify-center">
              <h3 className="mb-6 font-serif text-2xl font-bold text-foreground">
                Todo lo que necesitas
              </h3>
              <div className="mb-8 grid grid-cols-2 gap-3">
                {features.map((f) => (
                  <div
                    key={f.label}
                    className="flex items-center gap-3 rounded-lg border border-border bg-background p-4"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <f.icon className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm font-medium text-foreground">{f.label}</span>
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
      </div>
    </section>
  )
}
