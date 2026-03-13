"use client"

import { useRef, useEffect, useState } from "react"
import { UtensilsCrossed, Heart, PartyPopper } from "lucide-react"

const services = [
  {
    icon: UtensilsCrossed,
    title: "Desayunos Especiales",
    description:
      "Comienza tu dia con un desayuno preparado con ingredientes frescos de la region, servido en la comodidad de tu cabana.",
  },
  {
    icon: Heart,
    title: "Decoracion Romantica",
    description:
      "Sorprende a esa persona especial con una decoracion romantica con petalos, velas y detalles para un momento inolvidable.",
  },
  {
    icon: PartyPopper,
    title: "Decoracion de Cumpleanos",
    description:
      "Celebra tu cumpleanos en un entorno magico. Nos encargamos de la decoracion para que solo te preocupes por disfrutar.",
  },
]

export function ServicesSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true)
      },
      { threshold: 0.2 }
    )
    if (sectionRef.current) observer.observe(sectionRef.current)
    return () => observer.disconnect()
  }, [])

  return (
    <section ref={sectionRef} className="py-20 md:py-28 bg-card">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-16 text-center">
          <p className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-accent">
            Experiencias
          </p>
          <h2 className="font-serif text-3xl font-bold text-foreground md:text-4xl text-balance">
            Algunos de nuestros servicios adicionales
          </h2>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          {services.map((service, i) => (
            <div
              key={service.title}
              className={`group rounded-xl border border-border bg-background p-8 text-center transition-all duration-500 hover:shadow-lg hover:-translate-y-1 ${
                visible ? "animate-fade-in-up" : "opacity-0"
              }`}
              style={{ animationDelay: `${i * 0.15}s` }}
            >
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 transition-colors duration-300 group-hover:bg-primary/20">
                <service.icon className="h-7 w-7 text-primary" />
              </div>
              <h3 className="mb-3 font-serif text-xl font-semibold text-foreground">
                {service.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {service.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
