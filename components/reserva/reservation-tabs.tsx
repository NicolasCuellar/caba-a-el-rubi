"use client"

/**
 * /components/reserva/reservation-tabs.tsx
 *
 * Envuelve ReservationForm y PasadiaForm en dos pestañas:
 *   - "Alojamiento"  → ReservationForm  (reserva normal con pernocte)
 *   - "Pasadía"      → PasadiaForm      (RF-17, grupos/empresas 10am–6pm)
 */

import { useState } from "react"
import { Moon, Sun } from "lucide-react"
import { ReservationForm } from "@/components/reserva/reservation-form"
import { PasadiaForm }     from "@/components/reserva/pasadia-form"

type Tab = "alojamiento" | "pasadia"

export function ReservationTabs() {
  const [tab, setTab] = useState<Tab>("alojamiento")

  return (
    <div id="formulario">
      {/* ── Selector de tabs ─────────────────────────────────────────── */}
      <div className="bg-primary pt-16 md:pt-24 pb-0">
        <div className="mx-auto max-w-2xl px-6">
          <div className="flex rounded-xl overflow-hidden border border-white/20 bg-white/10 p-1 gap-1">

            <button
              type="button"
              onClick={() => setTab("alojamiento")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                tab === "alojamiento"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-white/70 hover:text-white hover:bg-white/10"
              }`}
            >
              <Moon className="h-4 w-4" />
              Alojamiento
            </button>

            <button
              type="button"
              onClick={() => setTab("pasadia")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                tab === "pasadia"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-white/70 hover:text-white hover:bg-white/10"
              }`}
            >
              <Sun className="h-4 w-4" />
              Pasadía
            </button>

          </div>
        </div>
      </div>

      {/* ── Contenido del tab activo ──────────────────────────────────── */}
      {tab === "alojamiento" && <ReservationForm />}
      {tab === "pasadia"     && <PasadiaForm />}
    </div>
  )
}