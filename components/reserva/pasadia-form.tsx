"use client"

/**
 * /components/reserva/pasadia-form.tsx
 *
 * RF-17: Formulario de solicitud de Paquete Pasadía para grupos / empresas.
 * v2.0 — Cálculo de tarifas centralizado en /lib/tarifas.ts
 */

import { useState, useEffect, useMemo } from "react"
import {
  Send, Check, Loader2, AlertCircle, ChevronLeft,
  Plus, Minus, Users, Building2, Sun,
} from "lucide-react"
import { Button }  from "@/components/ui/button"
import { Input }   from "@/components/ui/input"
import { Label }   from "@/components/ui/label"
import { calcularPasadia, formatCOP, formatFecha, PASADIA } from "@/lib/tarifas"

// ─────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────

const CABANAS: { value: string; label: string }[] = [
  { value: "cabana-a", label: "Cabaña A" },
  { value: "cabana-b", label: "Cabaña B" },
  { value: "cabana-c", label: "Cabaña C" },
]

type DisponibilidadEstado = "idle" | "verificando" | "ocupada" | "libre"

type FormState =
  | "idle"
  | "verificando"
  | "no-disponible"
  | "resumen"
  | "enviando"
  | "enviado"
  | "error"

// ─────────────────────────────────────────────
// Subcomponente: selector de cabaña
// ─────────────────────────────────────────────

function CabanaDistribucion({
  cabana, label, activa, personas, onToggle, onCambiar, disponibilidad,
}: {
  cabana:         string
  label:          string
  activa:         boolean
  personas:       number
  onToggle:       () => void
  onCambiar:      (n: number) => void
  disponibilidad: DisponibilidadEstado
}) {
  return (
    <div className={`rounded-xl border transition-all duration-200 overflow-hidden ${
      activa ? "border-accent bg-accent/5 shadow-sm" : "border-border bg-background"
    }`}>
      <label className="flex cursor-pointer items-center gap-3 p-4">
        <input type="checkbox" checked={activa} onChange={onToggle}
          className="h-4 w-4 rounded border-border accent-primary" />
        <div className="flex flex-1 items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">{label}</span>
          <span className="text-xs text-muted-foreground">
            (máx. {PASADIA.MAX_PERSONAS_CABANA} personas)
          </span>
        </div>
        {activa && (
          <span className="ml-auto text-xs">
            {disponibilidad === "verificando" && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Verificando
              </span>
            )}
            {disponibilidad === "ocupada" && (
              <span className="flex items-center gap-1 text-destructive">
                <AlertCircle className="h-3 w-3" /> No disponible
              </span>
            )}
            {disponibilidad === "libre" && (
              <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                <Check className="h-3 w-3" /> Disponible
              </span>
            )}
          </span>
        )}
      </label>

      {activa && (
        <div className="flex items-center gap-3 border-t border-border/50 bg-muted/20 px-4 py-3">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="flex-1 text-xs text-muted-foreground">
            Personas en esta cabaña:
          </span>
          <div className="flex items-center gap-2">
            <button type="button" aria-label="Reducir personas"
              onClick={() => onCambiar(Math.max(1, personas - 1))}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background text-sm hover:bg-muted transition-colors">
              <Minus className="h-3 w-3" />
            </button>
            <span className="w-6 text-center text-sm font-semibold text-foreground">
              {personas}
            </span>
            <button type="button" aria-label="Aumentar personas"
              onClick={() => onCambiar(Math.min(PASADIA.MAX_PERSONAS_CABANA, personas + 1))}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background text-sm hover:bg-muted transition-colors">
              <Plus className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────

export function PasadiaForm() {
  const [formState, setFormState] = useState<FormState>("idle")
  const [errorMsg,  setErrorMsg]  = useState("")

  const [nombre,        setNombre]        = useState("")
  const [telefono,      setTelefono]      = useState("")
  const [email,         setEmail]         = useState("")
  const [fecha,         setFecha]         = useState("")
  const [observaciones, setObservaciones] = useState("")

  const [cabanasActivas, setCabanasActivas] = useState<Record<string, boolean>>({
    "cabana-a": false, "cabana-b": false, "cabana-c": false,
  })
  const [personasPorCabana, setPersonasPorCabana] = useState<Record<string, number>>({
    "cabana-a": 1, "cabana-b": 1, "cabana-c": 1,
  })
  const [disponibilidad, setDisponibilidad] = useState<Record<string, DisponibilidadEstado>>({
    "cabana-a": "idle", "cabana-b": "idle", "cabana-c": "idle",
  })

  // ── Derivados ────────────────────────────────────────────────────────
  const cabanasSeleccionadas = CABANAS.filter((c) => cabanasActivas[c.value])

  const totalPersonas = cabanasSeleccionadas.reduce(
    (acc, c) => acc + (personasPorCabana[c.value] ?? 1), 0
  )

  // Cálculo centralizado en tarifas.ts
  const precio = useMemo(
    () => calcularPasadia(totalPersonas),
    [totalPersonas]
  )

  const hayNoDisponible = cabanasSeleccionadas.some((c) => disponibilidad[c.value] === "ocupada")
  const hayVerificando  = cabanasSeleccionadas.some((c) => disponibilidad[c.value] === "verificando")

  // ── Toggle cabaña ────────────────────────────────────────────────────
  const toggleCabana = (value: string) => {
    setCabanasActivas((prev) => ({ ...prev, [value]: !prev[value] }))
    if (cabanasActivas[value]) {
      setDisponibilidad((prev) => ({ ...prev, [value]: "idle" }))
    }
  }

  // ── Verificación de disponibilidad (debounce 500ms) ──────────────────
  useEffect(() => {
    if (!fecha || cabanasSeleccionadas.length === 0) return

    setDisponibilidad((prev) => {
      const next = { ...prev }
      cabanasSeleccionadas.forEach((c) => { next[c.value] = "verificando" })
      return next
    })

    let cancelado = false

    const verificar = async () => {
      // Para pasadía la "salida" es el día siguiente (bloqueo de 1 día)
      const fechaSalida = new Date(`${fecha}T12:00:00`)
      fechaSalida.setDate(fechaSalida.getDate() + 1)
      const fechaSalidaStr = fechaSalida.toISOString().split("T")[0]

      await Promise.allSettled(
        cabanasSeleccionadas.map(async (c) => {
          try {
            const params = new URLSearchParams({
              cabana: c.value, fechaEntrada: fecha, fechaSalida: fechaSalidaStr,
            })
            const res  = await fetch(`/api/disponibilidad?${params}`)
            const data = await res.json()
            if (cancelado) return
            setDisponibilidad((prev) => ({
              ...prev,
              [c.value]: res.ok ? (data.disponible ? "libre" : "ocupada") : "idle",
            }))
          } catch {
            if (!cancelado)
              setDisponibilidad((prev) => ({ ...prev, [c.value]: "idle" }))
          }
        })
      )
    }

    const timer = setTimeout(verificar, 500)
    return () => { cancelado = true; clearTimeout(timer) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fecha, JSON.stringify(cabanasActivas)])

  // ── Avanzar al resumen ────────────────────────────────────────────────
  const handleMostrarResumen = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (cabanasSeleccionadas.length === 0) {
      setErrorMsg("Selecciona al menos una cabaña.")
      return
    }
    if (hayNoDisponible || hayVerificando) return
    setErrorMsg("")
    setFormState("resumen")
  }

  // ── Envío final ───────────────────────────────────────────────────────
  const handleEnviar = async () => {
    setFormState("enviando")
    setErrorMsg("")

    const payload = {
      cabanas:  cabanasSeleccionadas.map((c) => c.value),
      fecha, nombre, telefono, email, totalPersonas,
      personasPorCabana: Object.fromEntries(
        cabanasSeleccionadas.map((c) => [c.value, personasPorCabana[c.value]])
      ),
      precioEstimado: precio.total,   // ← calculado por tarifas.ts
      observaciones,
    }

    try {
      const res  = await fetch("/api/pasadia", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body:   JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        setErrorMsg(data.error ?? "Error al enviar la solicitud.")
        setFormState("error")
        return
      }
      setFormState("enviado")
    } catch {
      setErrorMsg("No se pudo conectar con el servidor. Verifica tu conexión.")
      setFormState("error")
    }
  }

  const resetForm = () => {
    setFormState("idle")
    setNombre(""); setTelefono(""); setEmail("")
    setFecha(""); setObservaciones(""); setErrorMsg("")
    setCabanasActivas({ "cabana-a": false, "cabana-b": false, "cabana-c": false })
    setPersonasPorCabana({ "cabana-a": 1, "cabana-b": 1, "cabana-c": 1 })
    setDisponibilidad({ "cabana-a": "idle", "cabana-b": "idle", "cabana-c": "idle" })
  }

  // ─────────────────────────────────────────────────────────────────────
  // PANTALLA DE ÉXITO
  // ─────────────────────────────────────────────────────────────────────
  if (formState === "enviado") {
    return (
      <section id="formulario-pasadia" className="py-16 md:py-24 bg-primary">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <div className="rounded-2xl bg-card p-10 shadow-2xl">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
              <Check className="h-8 w-8 text-accent" />
            </div>
            <h2 className="mb-3 font-serif text-2xl font-bold text-foreground">
              ¡Solicitud de pasadía recibida!
            </h2>
            <p className="mb-2 text-sm text-muted-foreground">
              Tu solicitud quedó registrada. El administrador te contactará
              pronto por WhatsApp para confirmar disponibilidad y coordinar el pago.
            </p>
            <p className="mb-6 text-xs text-muted-foreground">
              Recuerda: el horario del pasadía es de{" "}
              <strong>{PASADIA.HORA_INICIO} a {PASADIA.HORA_FIN}</strong>.
            </p>
            <Button onClick={resetForm} variant="outline"
              className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
              Hacer otra solicitud
            </Button>
          </div>
        </div>
      </section>
    )
  }

  // ─────────────────────────────────────────────────────────────────────
  // PANTALLA DE RESUMEN
  // ─────────────────────────────────────────────────────────────────────
  if (formState === "resumen" || formState === "enviando" || formState === "error") {
    const enviando = formState === "enviando"

    return (
      <section id="formulario-pasadia" className="py-16 md:py-24 bg-primary">
        <div className="mx-auto max-w-2xl px-6">
          <div className="rounded-2xl bg-card p-8 shadow-2xl md:p-10">

            <div className="mb-8 text-center">
              <p className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-accent">
                Confirmar pasadía
              </p>
              <h2 className="font-serif text-3xl font-bold text-foreground md:text-4xl">
                Resumen de tu solicitud
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Revisa los datos antes de enviar.
              </p>
            </div>

            <div className="mb-6 rounded-xl border border-border bg-background divide-y divide-border text-sm">

              {/* Horario destacado */}
              <div className="flex items-center gap-2 px-4 py-3 bg-accent/5">
                <Sun className="h-4 w-4 text-accent shrink-0" />
                <span className="text-muted-foreground">Horario del pasadía</span>
                <span className="ml-auto font-semibold text-foreground">
                  {PASADIA.HORA_INICIO} – {PASADIA.HORA_FIN}
                </span>
              </div>

              <div className="flex justify-between px-4 py-3">
                <span className="text-muted-foreground">Fecha</span>
                <span className="font-medium text-foreground">{formatFecha(fecha)}</span>
              </div>
              <div className="flex justify-between px-4 py-3">
                <span className="text-muted-foreground">Nombre</span>
                <span className="font-medium text-foreground">{nombre}</span>
              </div>
              <div className="flex justify-between px-4 py-3">
                <span className="text-muted-foreground">Teléfono</span>
                <span className="font-medium text-foreground">{telefono}</span>
              </div>
              <div className="flex justify-between px-4 py-3">
                <span className="text-muted-foreground">Email</span>
                <span className="font-medium text-foreground break-all">{email}</span>
              </div>

              {/* Distribución por cabaña */}
              <div className="px-4 py-3">
                <span className="text-muted-foreground">Cabañas y personas</span>
                <ul className="mt-2 flex flex-col gap-1">
                  {cabanasSeleccionadas.map((c) => (
                    <li key={c.value} className="flex justify-between">
                      <span className="font-medium text-foreground">{c.label}</span>
                      <span className="text-muted-foreground">
                        {personasPorCabana[c.value]} persona(s)
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex justify-between px-4 py-3">
                <span className="text-muted-foreground">Total personas</span>
                <span className="font-semibold text-foreground">{totalPersonas}</span>
              </div>

              {/* Precio desglosado — viene de calcularPasadia() */}
              <div className="px-4 py-3 space-y-1.5">
                <div className="flex justify-between text-muted-foreground">
                  <span>
                    Tarifa base ({totalPersonas} × {formatCOP(PASADIA.TARIFA_POR_PERSONA)})
                  </span>
                  <span>{formatCOP(precio.base)}</span>
                </div>
                {precio.aplicaDescuento && (
                  <div className="flex justify-between text-green-600 dark:text-green-400 text-xs">
                    <span>
                      🎉 Descuento grupal {PASADIA.DESCUENTO_GRUPAL_PCT * 100}%
                      (grupo &gt; {PASADIA.UMBRAL_DESCUENTO} personas)
                    </span>
                    <span>− {formatCOP(precio.descuento)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-foreground border-t border-border/50 pt-1.5 mt-1">
                  <span>Total estimado</span>
                  <span>{formatCOP(precio.total)}</span>
                </div>
              </div>

              {observaciones && (
                <div className="px-4 py-3">
                  <span className="text-muted-foreground">Observaciones</span>
                  <p className="mt-1 font-medium text-foreground">{observaciones}</p>
                </div>
              )}
            </div>

            {/* Error */}
            {formState === "error" && (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {errorMsg}
              </div>
            )}

            {/* Acciones */}
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button type="button" variant="outline"
                onClick={() => setFormState("idle")} disabled={enviando}
                className="flex-1 border-border text-foreground hover:bg-muted">
                <ChevronLeft className="mr-2 h-4 w-4" />
                Modificar datos
              </Button>
              <Button type="button" onClick={handleEnviar} disabled={enviando} size="lg"
                className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90 disabled:opacity-50">
                {enviando
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</>
                  : <><Send className="mr-2 h-4 w-4" /> Confirmar pasadía</>
                }
              </Button>
            </div>

          </div>
        </div>
      </section>
    )
  }

  // ─────────────────────────────────────────────────────────────────────
  // FORMULARIO PRINCIPAL
  // ─────────────────────────────────────────────────────────────────────
  const todayStr = new Date().toISOString().split("T")[0]

  return (
    <section id="formulario-pasadia" className="py-16 md:py-24 bg-primary">
      <div className="mx-auto max-w-2xl px-6">
        <div className="rounded-2xl bg-card p-8 shadow-2xl md:p-10">

          {/* Encabezado */}
          <div className="mb-8 text-center">
            <p className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-accent">
              Paquete Pasadía
            </p>
            <h2 className="font-serif text-3xl font-bold text-foreground md:text-4xl text-balance">
              Solicita tu pasadía
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Disfruta de nuestras cabañas de {PASADIA.HORA_INICIO} a {PASADIA.HORA_FIN} —{" "}
              <strong>{formatCOP(PASADIA.TARIFA_POR_PERSONA)}</strong> por persona.
            </p>
          </div>

          {/* Banner informativo */}
          <div className="mb-6 rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 text-sm">
            <div className="flex items-start gap-3">
              <Sun className="h-5 w-5 text-accent mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-foreground">
                  Horario: {PASADIA.HORA_INICIO} – {PASADIA.HORA_FIN}
                </p>
                <p className="text-muted-foreground mt-0.5">
                  Máx. {PASADIA.MAX_PERSONAS_CABANA} personas por cabaña. Grupos de más de{" "}
                  {PASADIA.UMBRAL_DESCUENTO} personas obtienen un{" "}
                  <strong>{PASADIA.DESCUENTO_GRUPAL_PCT * 100}% de descuento</strong>.
                  Para grupos grandes, selecciona cabañas adicionales.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleMostrarResumen} className="flex flex-col gap-5">

            {/* Nombre + Teléfono */}
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="p-nombre" className="text-sm font-medium text-foreground">
                  Nombre completo
                </Label>
                <Input id="p-nombre" required placeholder="Nombre del responsable"
                  value={nombre} onChange={(e) => setNombre(e.target.value)} className="bg-background" />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="p-telefono" className="text-sm font-medium text-foreground">
                  Teléfono (WhatsApp)
                </Label>
                <Input id="p-telefono" type="tel" required placeholder="+57 300 123 4567"
                  value={telefono} onChange={(e) => setTelefono(e.target.value)} className="bg-background" />
              </div>
            </div>

            {/* Email */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="p-email" className="text-sm font-medium text-foreground">Email</Label>
              <Input id="p-email" type="email" required placeholder="tu@email.com"
                value={email} onChange={(e) => setEmail(e.target.value)} className="bg-background" />
            </div>

            {/* Fecha */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="p-fecha" className="text-sm font-medium text-foreground">
                Fecha del pasadía
              </Label>
              <Input id="p-fecha" type="date" required min={todayStr}
                value={fecha} onChange={(e) => setFecha(e.target.value)} className="bg-background" />
            </div>

            {/* Selección de cabañas */}
            <div className="flex flex-col gap-3">
              <Label className="text-sm font-medium text-foreground">
                Cabañas y distribución de personas
              </Label>
              <div className="flex flex-col gap-2">
                {CABANAS.map((c) => (
                  <CabanaDistribucion
                    key={c.value}
                    cabana={c.value}
                    label={c.label}
                    activa={cabanasActivas[c.value]}
                    personas={personasPorCabana[c.value]}
                    onToggle={() => toggleCabana(c.value)}
                    onCambiar={(n) =>
                      setPersonasPorCabana((prev) => ({ ...prev, [c.value]: n }))
                    }
                    disponibilidad={disponibilidad[c.value]}
                  />
                ))}
              </div>

              {errorMsg && (
                <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                  <AlertCircle className="h-3 w-3 shrink-0" /> {errorMsg}
                </div>
              )}
            </div>

            {/* No disponible */}
            {hayNoDisponible && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                Una o más cabañas no están disponibles para la fecha seleccionada.
              </div>
            )}

            {/* Estimación de precio en tiempo real — viene de calcularPasadia() */}
            {cabanasSeleccionadas.length > 0 && totalPersonas > 0 && (
              <div className="rounded-xl border border-border bg-muted/30 px-4 py-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Estimación de precio
                </p>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>
                      {totalPersonas} persona(s) × {formatCOP(PASADIA.TARIFA_POR_PERSONA)}
                    </span>
                    <span>{formatCOP(precio.base)}</span>
                  </div>
                  {precio.aplicaDescuento && (
                    <div className="flex justify-between text-green-600 dark:text-green-400 text-xs">
                      <span>
                        🎉 Descuento grupal {PASADIA.DESCUENTO_GRUPAL_PCT * 100}%
                        (más de {PASADIA.UMBRAL_DESCUENTO} personas)
                      </span>
                      <span>− {formatCOP(precio.descuento)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-foreground border-t border-border/50 pt-2 mt-1">
                    <span>Total estimado</span>
                    <span>{formatCOP(precio.total)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Observaciones */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="p-obs" className="text-sm font-medium text-foreground">
                Comentarios{" "}
                <span className="text-muted-foreground font-normal">(opcional)</span>
              </Label>
              <textarea id="p-obs" rows={3}
                placeholder="Empresa, motivo del pasadía, requerimientos especiales..."
                value={observaciones} onChange={(e) => setObservaciones(e.target.value)}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
              />
            </div>

            <Button type="submit" size="lg"
              disabled={hayNoDisponible || hayVerificando || cabanasSeleccionadas.length === 0}
              className="bg-accent text-accent-foreground hover:bg-accent/90 mt-2 disabled:opacity-50">
              {hayVerificando
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verificando disponibilidad...</>
                : <><Send className="mr-2 h-4 w-4" /> Revisar solicitud</>
              }
            </Button>

          </form>
        </div>
      </div>
    </section>
  )
}