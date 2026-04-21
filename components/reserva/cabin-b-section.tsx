"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Users, Wifi, Coffee, Bath, TreePine, Flame } from "lucide-react"
import { Button } from "@/components/ui/button"

const tabs = [
  {
    key: "general",
    label: "General",
    content:
      "Nuestra Cabana B es la opcion perfecta para grupos de amigos o familias. Con espacios amplios, balcon con vista al valle y una sala de estar comoda, tendras todo lo necesario para un fin de semana inolvidable.",
  },
  {
    key: "servicios",
    label: "Servicios",
    content:
      "Incluye Wi-Fi, cocina equipada, bano privado, agua caliente 24h, ropa de cama, toallas y un area de BBQ compartida. Tambien puedes agregar servicios adicionales como desayunos o decoraciones especiales.",
  },
  {
    key: "entorno",
    label: "Entorno",
    content:
      "Rodeada de naturaleza, con senderos para caminatas, aves exoticas y la tranquilidad absoluta de Villarestrepo. El balcon ofrece una vista privilegiada del valle y las montanas.",
  },
]

const features = [
  { icon: Users, label: "2 - 6 personas" },
  { icon: Wifi, label: "Wi-Fi gratis" },
  { icon: Coffee, label: "Cocina completa" },
  { icon: Bath, label: "Bano privado" },
  { icon: TreePine, label: "Balcon con vista" },
  { icon: Flame, label: "Area BBQ" },
]

export function CabinBSection() {
  const [activeTab, setActiveTab] = useState("general")

  return (
    <section id="cabana-b" className="py-16 md:py-24 bg-card">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-10 text-center">
          <p className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-accent">
            Alojamiento
          </p>
          <h2 className="font-serif text-3xl font-bold text-foreground md:text-4xl">
            Cabana B
          </h2>
        </div>

        {/* Split layout: info left, image right */}
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Info */}
          <div className="flex flex-col justify-center lg:order-1">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-1.5 text-xs font-semibold text-accent w-fit">
              {"Desde $250.000 / noche"}
            </div>
            <h3 className="mb-4 font-serif text-2xl font-bold text-foreground">
              Espaciosa y con vistas espectaculares
            </h3>

            {/* Tabs */}
            <div className="mb-4 flex gap-1 rounded-lg bg-secondary p-1">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 rounded-md px-3 py-2 text-xs font-medium transition-all ${
                    activeTab === tab.key
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <p className="mb-6 min-h-[80px] text-sm leading-relaxed text-muted-foreground">
              {tabs.find((t) => t.key === activeTab)?.content}
            </p>

            {/* Features */}
            <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {features.map((f) => (
                <div
                  key={f.label}
                  className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2.5"
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

          {/* Images */}
          <div className="grid grid-cols-2 gap-3 lg:order-2">
            <div className="relative col-span-2 mx-auto w-[75%] overflow-hidden rounded-xl">
              <Image
                src="/images/cabaña zafiro .Png"
                alt="Cabana B exterior con balcon y vista al valle"
                width={800}
                height={500}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="relative overflow-hidden rounded-xl">
              <Image
                src="/images/zafiro exterior.jpeg"
                alt="Cabana B interior sala de estar"
                width={400}
                height={300}
                className="h-48 w-full object-cover"
              />
            </div>
            <div className="relative overflow-hidden rounded-xl">
              <Image
                src="/images/zafiro exterior 2.jpeg"
                alt="Cabana B dormitorio"
                width={400}
                height={300}
                className="h-48 w-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
