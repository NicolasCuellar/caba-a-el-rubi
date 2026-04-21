"use client"
 
/**
 * /components/reserva/reservation-form.tsx
 *
 * Cambios v2.0:
 * - 5 servicios adicionales fijos (RF-12).
 * - Capacidad máxima dinámica según cabaña.
 * - Resumen previo al envío (RF-13) con desglose noche a noche.
 * - Cálculo de tarifas centralizado en /lib/tarifas.ts
 */
 
import { useState, useEffect, useMemo } from "react"
import { Send, Check, Loader2, AlertCircle, ChevronLeft, Moon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  calcularReserva,
  formatCOP,
  formatFecha,
  SERVICIOS_ADICIONALES,
  TARIFAS,
} from "@/lib/tarifas"
import type { ServicioId } from "@/lib/tarifas"
 
// ─────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────
 
const cabinOptions = [
  { value: "cabana-a", label: "Cabaña A", maxPersonas: 5 },
  { value: "cabana-b", label: "Cabaña B", maxPersonas: 5 },
  { value: "cabana-c", label: "Cabaña C", maxPersonas: 8 },
]
 
// Construimos serviceOptions dinámicamente desde SERVICIOS_ADICIONALES
// para que los precios mostrados en UI siempre vengan de la misma fuente.
const serviceOptions = (
  Object.entries(SERVICIOS_ADICIONALES) as [ServicioId, typeof SERVICIOS_ADICIONALES[ServicioId]][]
).map(([value, s]) => ({
  value,
  label:      s.label,
  precio:     s.porUnidad ? `${formatCOP(s.precio)} c/u` : formatCOP(s.precio),
  porUnidad:  s.porUnidad,
  unidadLabel: value === "pet-friendly" ? "mascotas" : "personas",
}))
 
type FormState = "idle" | "verificando" | "no-disponible" | "resumen" | "enviando" | "enviado" | "error"
 
// ─────────────────────────────────────────────
// Componente
// ─────────────────────────────────────────────
 
export function ReservationForm() {
  const [formState,    setFormState]    = useState<FormState>("idle")
  const [errorMsg,     setErrorMsg]     = useState("")
 
  const [cabana,        setCabana]        = useState("")
  const [fechaEntrada,  setFechaEntrada]  = useState("")
  const [fechaSalida,   setFechaSalida]   = useState("")
  const [nombre,        setNombre]        = useState("")
  const [telefono,      setTelefono]      = useState("")
  const [email,         setEmail]         = useState("")
  const [personas,      setPersonas]      = useState("1")
  const [observaciones, setObservaciones] = useState("")
 
  const [serviciosSeleccionados, setServiciosSeleccionados] = useState<ServicioId[]>([])
  const [petFriendlyCount,       setPetFriendlyCount]       = useState(1)
  const [desayunoCount,          setDesayunoCount]           = useState(1)
 
  const maxPersonas = cabinOptions.find((c) => c.value === cabana)?.maxPersonas ?? 8
 
  useEffect(() => {
    if (Number(personas) > maxPersonas) setPersonas(String(maxPersonas))
  }, [cabana, maxPersonas, personas])
 
  const toggleServicio = (value: ServicioId) => {
    setServiciosSeleccionados((prev) =>
      prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value]
    )
  }
 
  // ── Cálculo de tarifa en tiempo real ──────────────────────────────────
  // useMemo evita recalcular en cada render no relacionado.
  const calculoTarifa = useMemo(() => {
    if (!fechaEntrada || !fechaSalida || !cabana) return null
    if (new Date(fechaEntrada) >= new Date(fechaSalida)) return null
    return calcularReserva({
      fechaEntrada,
      fechaSalida,
      personas: Number(personas),
      servicios: serviciosSeleccionados,
      petFriendlyCount,
      desayunoCount,
    })
  }, [fechaEntrada, fechaSalida, personas, serviciosSeleccionados, petFriendlyCount, desayunoCount, cabana])
 
  // ── Verificación de disponibilidad ────────────────────────────────────
  useEffect(() => {
    if (!cabana || !fechaEntrada || !fechaSalida) return
    if (new Date(fechaEntrada) >= new Date(fechaSalida)) return
 
    let cancelado = false
    const verificar = async () => {
      setFormState("verificando")
      try {
        const params = new URLSearchParams({ cabana, fechaEntrada, fechaSalida })
        const res    = await fetch(`/api/disponibilidad?${params}`)
        const data   = await res.json()
        if (cancelado) return
        if (!res.ok) { setFormState("idle"); return }
        setFormState(data.disponible ? "idle" : "no-disponible")
      } catch {
        if (!cancelado) setFormState("idle")
      }
    }
    const timer = setTimeout(verificar, 500)
    return () => { cancelado = true; clearTimeout(timer) }
  }, [cabana, fechaEntrada, fechaSalida])
 
  // ── Avanzar al resumen ─────────────────────────────────────────────────
  const handleMostrarResumen = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (formState === "no-disponible" || formState === "enviando") return
    setFormState("resumen")
  }
 
  // ── Envío final ────────────────────────────────────────────────────────
  const handleEnviar = async () => {
    setFormState("enviando")
    setErrorMsg("")
 
    const payload = {
      cabana, fechaEntrada, fechaSalida, nombre, telefono, email, personas,
      servicios:        serviciosSeleccionados,
      petFriendlyCount: serviciosSeleccionados.includes("pet-friendly") ? petFriendlyCount : undefined,
      desayunoCount:    serviciosSeleccionados.includes("desayuno")     ? desayunoCount    : undefined,
      observaciones,
      precioEstimado:   calculoTarifa?.total,   // ← enviamos el precio calculado al backend
    }
 
    try {
      const res  = await fetch("/api/reservas", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body:   JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) { setErrorMsg(data.error ?? "Error al enviar la solicitud."); setFormState("error"); return }
      setFormState("enviado")
    } catch {
      setErrorMsg("No se pudo conectar con el servidor. Verifica tu conexión.")
      setFormState("error")
    }
  }
 
  const resetForm = () => {
    setFormState("idle")
    setCabana(""); setFechaEntrada(""); setFechaSalida("")
    setNombre(""); setTelefono(""); setEmail("")
    setPersonas("1"); setObservaciones("")
    setServiciosSeleccionados([])
    setPetFriendlyCount(1); setDesayunoCount(1)
    setErrorMsg("")
  }
 
  // ─────────────────────────────────────────────────────────────────────
  // PANTALLA DE ÉXITO
  // ─────────────────────────────────────────────────────────────────────
  if (formState === "enviado") {
    return (
      <section id="formulario" className="py-16 md:py-24 bg-primary">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <div className="rounded-2xl bg-card p-10 shadow-2xl">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Check className="h-8 w-8 text-primary" />
            </div>
            <h2 className="mb-3 font-serif text-2xl font-bold text-foreground">
              ¡Solicitud recibida!
            </h2>
            <p className="mb-6 text-sm text-muted-foreground">
              Tu solicitud quedó registrada. El administrador te contactará pronto
              por WhatsApp para confirmar disponibilidad y coordinar el pago.
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
  // PANTALLA DE RESUMEN (RF-13) — con desglose noche a noche
  // ─────────────────────────────────────────────────────────────────────
  if (formState === "resumen" || formState === "enviando" || formState === "error") {
    const cabanaLabel = cabinOptions.find((c) => c.value === cabana)?.label ?? cabana
    const enviando    = formState === "enviando"
    const r           = calculoTarifa  // alias corto
 
    return (
      <section id="formulario" className="py-16 md:py-24 bg-primary">
        <div className="mx-auto max-w-2xl px-6">
          <div className="rounded-2xl bg-card p-8 shadow-2xl md:p-10">
 
            {/* Encabezado */}
            <div className="mb-8 text-center">
              <p className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-accent">
                Confirmar reserva
              </p>
              <h2 className="font-serif text-3xl font-bold text-foreground md:text-4xl">
                Resumen de tu solicitud
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Revisa los datos antes de enviar.
              </p>
            </div>
 
            {/* Datos personales */}
            <div className="mb-4 rounded-xl border border-border bg-background divide-y divide-border text-sm">
              <div className="flex justify-between px-4 py-3">
                <span className="text-muted-foreground">Cabaña</span>
                <span className="font-medium text-foreground">{cabanaLabel}</span>
              </div>
              <div className="flex justify-between px-4 py-3">
                <span className="text-muted-foreground">Entrada</span>
                <span className="font-medium text-foreground">{formatFecha(fechaEntrada)}</span>
              </div>
              <div className="flex justify-between px-4 py-3">
                <span className="text-muted-foreground">Salida</span>
                <span className="font-medium text-foreground">{formatFecha(fechaSalida)}</span>
              </div>
              <div className="flex justify-between px-4 py-3">
                <span className="text-muted-foreground">Personas</span>
                <span className="font-medium text-foreground">{personas}</span>
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
              {observaciones && (
                <div className="px-4 py-3">
                  <span className="text-muted-foreground">Observaciones</span>
                  <p className="mt-1 font-medium text-foreground">{observaciones}</p>
                </div>
              )}
            </div>
 
            {/* Desglose de precio — viene de calcularReserva() */}
            {r && (
              <div className="mb-4 rounded-xl border border-border bg-background divide-y divide-border text-sm">
 
                {/* Título sección */}
                <div className="px-4 py-3 bg-muted/30">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Desglose de precio
                  </p>
                </div>
 
                {/* Noche a noche */}
                {r.detalleNoches.map((noche, i) => (
                  <div key={noche.fecha} className="flex items-center justify-between px-4 py-2.5">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Moon className="h-3 w-3 shrink-0" />
                      <span>
                        Noche {i + 1} — {formatFecha(noche.fecha)}
                        <span className={`ml-2 text-xs rounded-full px-2 py-0.5 ${
                          noche.esFds
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                            : "bg-muted text-muted-foreground"
                        }`}>
                          {noche.esFds ? "Fin de semana / festivo" : "Entre semana"}
                        </span>
                      </span>
                    </div>
                    <span className="font-medium text-foreground shrink-0 ml-3">
                      {formatCOP(noche.tarifaBase)}
                    </span>
                  </div>
                ))}
 
                {/* Subtotal alojamiento */}
                <div className="flex justify-between px-4 py-3 bg-muted/10">
                  <span className="text-muted-foreground">Subtotal alojamiento ({r.noches} {r.noches === 1 ? "noche" : "noches"})</span>
                  <span className="font-medium text-foreground">{formatCOP(r.subtotalAlojamiento)}</span>
                </div>
 
                {/* Servicios adicionales */}
                {r.subtotalServicios > 0 && (
                  <>
                    <div className="px-4 py-3">
                      <span className="text-muted-foreground">Servicios adicionales</span>
                      <ul className="mt-2 flex flex-col gap-1">
                        {r.resumenServicios.romantico !== undefined && (
                          <li className="flex justify-between">
                            <span className="text-foreground">Decoración romántica</span>
                            <span className="text-muted-foreground">{formatCOP(r.resumenServicios.romantico)}</span>
                          </li>
                        )}
                        {r.resumenServicios.cumpleanos !== undefined && (
                          <li className="flex justify-between">
                            <span className="text-foreground">Decoración de cumpleaños</span>
                            <span className="text-muted-foreground">{formatCOP(r.resumenServicios.cumpleanos)}</span>
                          </li>
                        )}
                        {r.resumenServicios.picnic !== undefined && (
                          <li className="flex justify-between">
                            <span className="text-foreground">Picnic adicional</span>
                            <span className="text-muted-foreground">{formatCOP(r.resumenServicios.picnic)}</span>
                          </li>
                        )}
                        {r.resumenServicios.petFriendly !== undefined && (
                          <li className="flex justify-between">
                            <span className="text-foreground">Pet Friendly × {petFriendlyCount} mascota(s)</span>
                            <span className="text-muted-foreground">{formatCOP(r.resumenServicios.petFriendly)}</span>
                          </li>
                        )}
                        {r.resumenServicios.desayuno !== undefined && (
                          <li className="flex justify-between">
                            <span className="text-foreground">Desayuno adicional × {desayunoCount} persona(s)</span>
                            <span className="text-muted-foreground">{formatCOP(r.resumenServicios.desayuno)}</span>
                          </li>
                        )}
                      </ul>
                    </div>
                    <div className="flex justify-between px-4 py-3 bg-muted/10">
                      <span className="text-muted-foreground">Subtotal servicios</span>
                      <span className="font-medium text-foreground">{formatCOP(r.subtotalServicios)}</span>
                    </div>
                  </>
                )}
 
                {/* Descuento estadía larga */}
                {r.aplicaDescuento && (
                  <div className="flex justify-between px-4 py-3 text-green-600 dark:text-green-400">
                    <span className="text-xs">
                      🎉 Descuento {TARIFAS.DESCUENTO_ESTADIA_LARGA_PCT * 100}%
                      (estadía de {TARIFAS.MINIMO_NOCHES_DESCUENTO}+ noches)
                    </span>
                    <span className="font-medium">− {formatCOP(r.descuento)}</span>
                  </div>
                )}
 
                {/* Total */}
                <div className="flex justify-between px-4 py-4 bg-muted/20">
                  <span className="font-bold text-foreground">Total estimado</span>
                  <span className="font-bold text-lg text-foreground">{formatCOP(r.total)}</span>
                </div>
 
              </div>
            )}
 
            {/* Error */}
            {formState === "error" && (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {errorMsg}
              </div>
            )}
 
            {/* Acciones */}
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button type="button" variant="outline" onClick={() => setFormState("idle")} disabled={enviando}
                className="flex-1 border-border text-foreground hover:bg-muted">
                <ChevronLeft className="mr-2 h-4 w-4" />
                Modificar datos
              </Button>
              <Button type="button" onClick={handleEnviar} disabled={enviando} size="lg"
                className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90 disabled:opacity-50">
                {enviando
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</>
                  : <><Send className="mr-2 h-4 w-4" /> Confirmar solicitud</>
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
  const verificando  = formState === "verificando"
  const noDisponible = formState === "no-disponible"
 
  return (
    <section id="formulario" className="py-16 md:py-24 bg-primary">
      <div className="mx-auto max-w-2xl px-6">
        <div className="rounded-2xl bg-card p-8 shadow-2xl md:p-10">
 
          <div className="mb-8 text-center">
            <p className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-accent">
              Reserva
            </p>
            <h2 className="font-serif text-3xl font-bold text-foreground md:text-4xl text-balance">
              Solicita tu reserva
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Completa el formulario y te contactaremos para confirmar disponibilidad.
            </p>
          </div>
 
          <form onSubmit={handleMostrarResumen} className="flex flex-col gap-5">
 
            {/* Nombre + Teléfono */}
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="nombre" className="text-sm font-medium text-foreground">
                  Nombre completo
                </Label>
                <Input id="nombre" required placeholder="Tu nombre"
                  value={nombre} onChange={(e) => setNombre(e.target.value)} className="bg-background" />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="telefono" className="text-sm font-medium text-foreground">
                  Teléfono (WhatsApp)
                </Label>
                <Input id="telefono" type="tel" required placeholder="+57 300 123 4567"
                  value={telefono} onChange={(e) => setTelefono(e.target.value)} className="bg-background" />
              </div>
            </div>
 
            {/* Email */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="email" className="text-sm font-medium text-foreground">Email</Label>
              <Input id="email" type="email" required placeholder="tu@email.com"
                value={email} onChange={(e) => setEmail(e.target.value)} className="bg-background" />
            </div>
 
            {/* Fechas */}
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="fechaEntrada" className="text-sm font-medium text-foreground">
                  Fecha de entrada
                </Label>
                <Input id="fechaEntrada" type="date" required
                  value={fechaEntrada} onChange={(e) => setFechaEntrada(e.target.value)} className="bg-background" />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="fechaSalida" className="text-sm font-medium text-foreground">
                  Fecha de salida
                </Label>
                <Input id="fechaSalida" type="date" required
                  value={fechaSalida} onChange={(e) => setFechaSalida(e.target.value)} className="bg-background" />
              </div>
            </div>
 
            {/* Cabaña + Personas */}
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="cabana" className="text-sm font-medium text-foreground">Cabaña</Label>
                <select id="cabana" required value={cabana} onChange={(e) => setCabana(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                  <option value="">Seleccionar cabaña</option>
                  {cabinOptions.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label} (máx. {c.maxPersonas} personas)
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="personas" className="text-sm font-medium text-foreground">
                  Número de personas
                </Label>
                <select id="personas" required value={personas} onChange={(e) => setPersonas(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                  {Array.from({ length: maxPersonas }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>{n} {n === 1 ? "persona" : "personas"}</option>
                  ))}
                </select>
              </div>
            </div>
 
            {/* Estado de disponibilidad */}
            {verificando && (
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Verificando disponibilidad...
              </div>
            )}
            {noDisponible && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                La cabaña seleccionada no está disponible para las fechas solicitadas.
              </div>
            )}
 
            {/* Servicios adicionales */}
            <div className="flex flex-col gap-3">
              <Label className="text-sm font-medium text-foreground">
                Servicios adicionales{" "}
                <span className="text-muted-foreground font-normal">(opcional)</span>
              </Label>
              <div className="flex flex-col gap-2">
                {serviceOptions.map((s) => {
                  const activo = serviciosSeleccionados.includes(s.value)
                  return (
                    <div key={s.value} className={`rounded-lg border transition-all ${
                      activo ? "border-primary bg-primary/5" : "border-border bg-background"
                    }`}>
                      <label className="flex cursor-pointer items-center gap-3 p-3">
                        <input type="checkbox" checked={activo}
                          onChange={() => toggleServicio(s.value)}
                          className="h-4 w-4 rounded border-border accent-primary" />
                        <span className="flex-1 text-sm text-foreground">{s.label}</span>
                        <span className="text-xs text-muted-foreground">{s.precio}</span>
                      </label>
                      {activo && s.porUnidad && (
                        <div className="flex items-center gap-3 border-t border-border/50 px-3 py-2">
                          <span className="text-xs text-muted-foreground">
                            Cantidad de {s.unidadLabel}:
                          </span>
                          <div className="flex items-center gap-2 ml-auto">
                            <button type="button"
                              onClick={() => {
                                if (s.value === "pet-friendly") setPetFriendlyCount((n) => Math.max(1, n - 1))
                                if (s.value === "desayuno")     setDesayunoCount((n) => Math.max(1, n - 1))
                              }}
                              className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background text-sm hover:bg-muted transition-colors">
                              −
                            </button>
                            <span className="w-6 text-center text-sm font-medium text-foreground">
                              {s.value === "pet-friendly" ? petFriendlyCount : desayunoCount}
                            </span>
                            <button type="button"
                              onClick={() => {
                                if (s.value === "pet-friendly") setPetFriendlyCount((n) => n + 1)
                                if (s.value === "desayuno")     setDesayunoCount((n) => Math.min(Number(personas), n + 1))
                              }}
                              className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background text-sm hover:bg-muted transition-colors">
                              +
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
 
            {/* Estimación de precio en tiempo real */}
            {calculoTarifa && (
              <div className="rounded-xl border border-border bg-muted/30 px-4 py-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Estimación de precio
                </p>
                <div className="space-y-1.5 text-sm">
                  {/* Noche a noche */}
                  {calculoTarifa.detalleNoches.map((noche, i) => (
                    <div key={noche.fecha} className="flex justify-between text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Moon className="h-3 w-3" />
                        Noche {i + 1}
                        <span className={`text-xs rounded-full px-1.5 py-0.5 ${
                          noche.esFds
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                            : "bg-muted text-muted-foreground"
                        }`}>
                          {noche.esFds ? "fds" : "sem"}
                        </span>
                      </span>
                      <span>{formatCOP(noche.tarifaBase)}</span>
                    </div>
                  ))}
 
                  {/* Servicios */}
                  {calculoTarifa.subtotalServicios > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Servicios adicionales</span>
                      <span>{formatCOP(calculoTarifa.subtotalServicios)}</span>
                    </div>
                  )}
 
                  {/* Descuento */}
                  {calculoTarifa.aplicaDescuento && (
                    <div className="flex justify-between text-green-600 dark:text-green-400 text-xs">
                      <span>🎉 Descuento {TARIFAS.DESCUENTO_ESTADIA_LARGA_PCT * 100}% (estadía larga)</span>
                      <span>− {formatCOP(calculoTarifa.descuento)}</span>
                    </div>
                  )}
 
                  {/* Total */}
                  <div className="flex justify-between font-bold text-foreground border-t border-border/50 pt-2 mt-1">
                    <span>Total estimado</span>
                    <span>{formatCOP(calculoTarifa.total)}</span>
                  </div>
                </div>
              </div>
            )}
 
            {/* Observaciones */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="observaciones" className="text-sm font-medium text-foreground">
                Comentarios{" "}
                <span className="text-muted-foreground font-normal">(opcional)</span>
              </Label>
              <textarea id="observaciones" rows={3} placeholder="Algún requerimiento especial..."
                value={observaciones} onChange={(e) => setObservaciones(e.target.value)}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
              />
            </div>
 
            <Button type="submit" size="lg"
              disabled={noDisponible || verificando}
              className="bg-accent text-accent-foreground hover:bg-accent/90 mt-2 disabled:opacity-50">
              <Send className="mr-2 h-4 w-4" />
              Revisar solicitud
            </Button>
 
          </form>
        </div>
      </div>
    </section>
  )
}