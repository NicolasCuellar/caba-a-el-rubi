"use client"

import { useRef, useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Users, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

const cabins = [
  {
    name: "Cabana A",
    slug: "cabana-a",
    image: "/images/cabin-a.jpg",
    capacity: "2 - 4 personas",
    price: "$180.000",
    description: "Ideal para parejas o familias pequenas, con vista a las montanas.",
  },
  {
    name: "Cabana B",
    slug: "cabana-b",
    image: "/images/cabin-b.jpg",
    capacity: "2 - 6 personas",
    price: "$250.000",
    description: "Espaciosa y con balcon, perfecta para grupos de amigos.",
  },
  {
    name: "Cabana C",
    slug: "cabana-c",
    image: "/images/cabin-c.jpg",
    capacity: "2 - 8 personas",
    price: "$320.000",
    description: "Nuestra cabana premium con todas las comodidades y lujo.",
  },
]

export function CabinsSection() {
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
    <section ref={sectionRef} className="py-20 md:py-28 bg-secondary/50">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-16 text-center">
          <p className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-accent">
            Alojamiento
          </p>
          <h2 className="font-serif text-3xl font-bold text-foreground md:text-4xl text-balance">
            Nuestras Cabanas
          </h2>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          {cabins.map((cabin, i) => (
            <div
              key={cabin.slug}
              className={`group overflow-hidden rounded-xl border border-border bg-card transition-all duration-500 hover:shadow-xl hover:-translate-y-1 ${
                visible ? "animate-fade-in-up" : "opacity-0"
              }`}
              style={{ animationDelay: `${i * 0.15}s` }}
            >
              <div className="relative h-56 overflow-hidden">
                <Image
                  src={cabin.image}
                  alt={`${cabin.name} en La Cabana El Rubi`}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute bottom-3 right-3 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground">
                  {"Desde " + cabin.price + " / noche"}
                </div>
              </div>
              <div className="p-6">
                <h3 className="mb-2 font-serif text-xl font-bold text-foreground">
                  {cabin.name}
                </h3>
                <div className="mb-3 flex items-center gap-2 text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span className="text-sm">{cabin.capacity}</span>
                </div>
                <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
                  {cabin.description}
                </p>
                <Button
                  asChild
                  variant="outline"
                  className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                >
                  <Link href={`/reserva#${cabin.slug}`}>
                    Ver mas
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
