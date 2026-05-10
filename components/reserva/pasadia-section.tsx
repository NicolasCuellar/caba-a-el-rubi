"use client"

import Image from "next/image"
import { Sun, Users, Clock, Percent, Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"

const highlights = [
  { icon: Clock, label: "10 a.m. - 6 p.m." },
  { icon: Users, label: "Max. 4 personas por cabaña" },
  { icon: Percent, label: "25% dto. grupos +10 personas" },
  { icon: Building2, label: "Ideal para empresas" },
]

export function PasadiaSection() {
  const handleReservarPasadia = () => {
    window.location.hash = "#formulario-pasadia"
    setTimeout(() => {
      document.getElementById("formulario-pasadia")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      })
    }, 50)
  }

  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="mx-auto max-w-6xl px-6">
        <div className="overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/5 via-card to-accent/5 shadow-lg">
          <div className="grid md:grid-cols-2">
            {/* Content */}
            <div className="flex flex-col justify-center p-8 md:p-12">
              <p className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-accent">
                Experiencia de Dia
              </p>
              <h2 className="font-serif text-3xl font-bold text-foreground md:text-4xl text-balance">
                Pasadia
              </h2>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                Paquete de uso de la cabaña por el dia para grupos o empresas, sin pernocte. 
                Disfruta de nuestras instalaciones, la naturaleza y el aire fresco de la montaña 
                en un ambiente relajado y privado.
              </p>

              {/* Price */}
              <div className="mt-6 inline-flex items-baseline gap-2">
                <span className="font-serif text-4xl font-bold text-primary">$50.000</span>
                <span className="text-muted-foreground">/ persona</span>
              </div>

              {/* Discount badge */}
              <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-2 text-sm text-accent w-fit">
                <Percent className="h-4 w-4" />
                <span className="font-medium">25% de descuento para grupos de mas de 10 personas</span>
              </div>

              {/* Highlights */}
              <div className="mt-8 grid grid-cols-2 gap-4">
                {highlights.map((item) => (
                  <div key={item.label} className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <item.icon className="h-5 w-5 text-primary" />
                    </div>
                    <span className="text-sm text-foreground">{item.label}</span>
                  </div>
                ))}
              </div>

              {/* Note */}
              <p className="mt-6 text-xs text-muted-foreground italic">
                * Grupos mas grandes deben solicitar cabañas adicionales. Consulta disponibilidad.
              </p>

              {/* CTA */}
              <div className="mt-8">
                <Button size="lg" className="font-medium" onClick={handleReservarPasadia}>
                  Reservar Pasadía
                </Button>
              </div>
            </div>

            {/* Visual */}
            <div className="relative hidden min-h-[420px] md:block">
              <Image
                src="/images/mariposa.jpeg"
                alt="Mariposa decorativa en la naturaleza"
                fill
                className="object-cover"
                sizes="(min-width: 768px) 50vw, 100vw"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-transparent to-accent/20" />
              <div className="absolute inset-0 flex items-end justify-start p-8">
                <div className="rounded-2xl bg-background/60 p-4 backdrop-blur-md">
                  <Sun className="h-10 w-10 text-primary/70" />
                  <p className="mt-3 font-serif text-2xl font-bold text-foreground">
                    Disfruta el Dia
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Sin prisa, sin pernocte
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
