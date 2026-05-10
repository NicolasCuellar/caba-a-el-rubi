"use client"

import { useRef, useEffect, useState } from "react"
import { Leaf, Sparkles, HandHeart, ShieldCheck } from "lucide-react"

const values = [
  {
    icon: Leaf,
    title: "Naturaleza y Sostenibilidad",
    text: "Cuidamos nuestro entorno. Cada detalle esta pensado para convivir en armonia con la naturaleza.",
  },
  {
    icon: Sparkles,
    title: "Experiencia Personalizada",
    text: "Cada estadia es unica. Nos adaptamos a tus necesidades para crear momentos memorables.",
  },
  {
    icon: HandHeart,
    title: "Atencion Cercana",
    text: "Te recibimos como en casa. Nuestro equipo esta siempre disponible para hacer tu estadia perfecta.",
  },
  {
    icon: ShieldCheck,
    title: "Privacidad y Confort",
    text: "Espacios privados, seguros y confortables donde puedes relajarte sin preocupaciones.",
  },
]

export function ValuesSection() {
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
            Nuestro Compromiso
          </p>
          <h2 className="font-serif text-3xl font-bold text-foreground md:text-4xl text-balance">
            Valores que nos definen
          </h2>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {values.map((value, i) => (
            <div
              key={value.title}
              className={`group flex flex-col items-center rounded-xl border border-border bg-background p-8 text-center transition-all duration-500 hover:border-primary/30 hover:shadow-md ${
                visible ? "animate-fade-in-up" : "opacity-0"
              }`}
              style={{ animationDelay: `${i * 0.12}s` }}
            >
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform duration-300 group-hover:scale-110">
                <value.icon className="h-6 w-6" />
              </div>
              <h3 className="mb-3 font-serif text-lg font-semibold text-foreground">
                {value.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {value.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
