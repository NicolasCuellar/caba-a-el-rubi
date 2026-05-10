"use client"

import { MapPin, Car, Thermometer, Mountain } from "lucide-react"

const details = [
  {
    icon: Car,
    title: "Desde Ibague",
    text: "A solo 30 minutos en vehiculo por la via a Villarestrepo.",
  },
  {
    icon: MapPin,
    title: "Punto de referencia",
    text: "Sobre la via principal de Villarestrepo, a 500m del parque central.",
  },
  {
    icon: Thermometer,
    title: "Clima",
    text: "Temperatura promedio de 18-22 C. Clima fresco y agradable todo el año.",
  },
  {
    icon: Mountain,
    title: "Altitud",
    text: "A 1.800 metros sobre el nivel del mar, rodeado de montanas.",
  },
]

export function LocationSection() {
  return (
    <section className="py-16 md:py-24 bg-card">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-12 text-center">
          <p className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-accent">
            Ubicacion
          </p>
          <h2 className="font-serif text-3xl font-bold text-foreground md:text-4xl text-balance">
            Como llegar
          </h2>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Details */}
          <div className="grid gap-4 sm:grid-cols-2">
            {details.map((d) => (
              <div
                key={d.title}
                className="flex gap-4 rounded-xl border border-border bg-background p-5"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <d.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="mb-1 text-sm font-semibold text-foreground">
                    {d.title}
                  </h3>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {d.text}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Map */}
          <div className="overflow-hidden rounded-xl border border-border">
            <iframe
              src="https://www.google.com/maps?q=Caba%C3%B1a%20El%20Rub%C3%AD%2C%20Via%20Ibagu%C3%A9%20%23Kilometro%2012%2C%20Villa%20Restrepo%2C%20Ibagu%C3%A9%2C%20Tolima&output=embed"
              width="100%"
              height="100%"
              className="min-h-[300px]"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Ubicacion de La Cabaña El Rubi en Villarestrepo"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
