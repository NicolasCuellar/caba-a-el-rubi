const BOGOTA_TIME_ZONE = "America/Bogota"
const BOGOTA_UTC_OFFSET = "-05:00"

// ─────────────────────────────────────────────
// Horarios oficiales de operación (zona horaria Colombia)
// ─────────────────────────────────────────────
//
// Estos horarios definen la "huella temporal" real de cada tipo de
// reserva en Google Calendar. Cambiarlos aquí afecta a todo el sistema:
// creación de eventos, verificación de disponibilidad y bloqueos
// manuales del admin.
//
//   ALOJAMIENTO:  check-in 15:00 del día de entrada → checkout 11:00 del día de salida
//   PASADÍA:      10:00 → 18:00 del mismo día
//
// La ventana entre 11:00 (checkout) y 15:00 (check-in) queda libre para
// limpieza/preparación de la cabaña, por lo que una pasadía del mismo
// día de checkout SÍ se cruza con el alojamiento (10:00–11:00 overlap)
// y debe ser bloqueada.

export const HORA_CHECKIN_ALOJAMIENTO  = "15:00:00"
export const HORA_CHECKOUT_ALOJAMIENTO = "11:00:00"
export const HORA_INICIO_PASADIA       = "10:00:00"
export const HORA_FIN_PASADIA          = "18:00:00"

function parseIsoDateParts(fecha: string): { year: number; month: number; day: number } {
  const [year, month, day] = fecha.split("-").map(Number)
  return { year, month, day }
}

export function esFechaIsoValida(fecha: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false

  const { year, month, day } = parseIsoDateParts(fecha)
  const date = new Date(Date.UTC(year, month - 1, day))

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() + 1 === month &&
    date.getUTCDate() === day
  )
}

export function sumarDiasIso(fecha: string, dias: number): string {
  const { year, month, day } = parseIsoDateParts(fecha)
  const date = new Date(Date.UTC(year, month - 1, day))
  date.setUTCDate(date.getUTCDate() + dias)

  const nextYear = date.getUTCFullYear()
  const nextMonth = String(date.getUTCMonth() + 1).padStart(2, "0")
  const nextDay = String(date.getUTCDate()).padStart(2, "0")

  return `${nextYear}-${nextMonth}-${nextDay}`
}

export function hoyIsoEnBogota(): string {
  const formatter = new Intl.DateTimeFormat("en", {
    timeZone: BOGOTA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })

  const parts = formatter.formatToParts(new Date())
  const year = parts.find((part) => part.type === "year")?.value
  const month = parts.find((part) => part.type === "month")?.value
  const day = parts.find((part) => part.type === "day")?.value

  if (!year || !month || !day) {
    throw new Error("No se pudo formatear la fecha actual en zona horaria Bogota.")
  }

  return `${year}-${month}-${day}`
}

export function inicioDiaIsoBogota(fecha: string): string {
  return `${fecha}T00:00:00${BOGOTA_UTC_OFFSET}`
}

export function finDiaIsoBogota(fecha: string): string {
  return `${fecha}T23:59:59${BOGOTA_UTC_OFFSET}`
}

// ─────────────────────────────────────────────
// Helpers de horarios reales (para Google Calendar dateTime)
// ─────────────────────────────────────────────

/**
 * Construye un timestamp ISO 8601 en zona horaria Colombia (-05:00).
 *
 * Ejemplo:
 *   isoConHoraBogota("2026-06-12", "11:00:00")
 *   → "2026-06-12T11:00:00-05:00"
 *
 * Útil para pasar al campo `dateTime` de Google Calendar cuando se
 * crean eventos con horarios reales (no all-day).
 */
export function isoConHoraBogota(fecha: string, hora: string): string {
  return `${fecha}T${hora}${BOGOTA_UTC_OFFSET}`
}

/**
 * Horario real de una reserva de alojamiento:
 *   start = fechaEntrada 15:00 (check-in)
 *   end   = fechaSalida  11:00 (checkout)
 */
export function rangoAlojamientoIsoBogota(
  fechaEntrada: string,
  fechaSalida: string
): { start: string; end: string } {
  return {
    start: isoConHoraBogota(fechaEntrada, HORA_CHECKIN_ALOJAMIENTO),
    end:   isoConHoraBogota(fechaSalida,  HORA_CHECKOUT_ALOJAMIENTO),
  }
}

/**
 * Horario real de un pasadía:
 *   start = fecha 10:00
 *   end   = fecha 18:00 (mismo día)
 */
export function rangoPasadiaIsoBogota(
  fecha: string
): { start: string; end: string } {
  return {
    start: isoConHoraBogota(fecha, HORA_INICIO_PASADIA),
    end:   isoConHoraBogota(fecha, HORA_FIN_PASADIA),
  }
}

/**
 * Horario para un bloqueo manual del admin:
 *   Cubre el día completo desde 00:00 del día de entrada
 *   hasta 23:59 del día anterior a la salida (inclusive).
 *
 *   Mantenimiento del 10 al 12 → 2026-06-10 00:00 hasta 2026-06-12 23:59
 *   (la convención del admin es que `fechaSalida` es el primer día LIBRE).
 *
 * Si quieres que el bloqueo cubra hasta el día de salida inclusive,
 * cambia esta semántica aquí — el resto del sistema lo respetará.
 */
export function rangoBloqueoIsoBogota(
  fechaEntrada: string,
  fechaSalida: string
): { start: string; end: string } {
  // El bloqueo del admin es "día completo" — abarca todo el día de entrada
  // y todo el día previo al de salida.
  const ultimoDia = sumarDiasIso(fechaSalida, -1)
  return {
    start: `${fechaEntrada}T00:00:00${BOGOTA_UTC_OFFSET}`,
    end:   `${ultimoDia}T23:59:59${BOGOTA_UTC_OFFSET}`,
  }
}