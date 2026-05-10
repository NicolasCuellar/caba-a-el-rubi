const BOGOTA_TIME_ZONE = "America/Bogota"
const BOGOTA_UTC_OFFSET = "-05:00"

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
