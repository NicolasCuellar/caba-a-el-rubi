/**
 * /app/api/disponibilidad/route.ts
 *
 * GET /api/disponibilidad?cabana=cabana-a&fechaEntrada=2026-04-10&fechaSalida=2026-04-12
 *
 * Cambios v2.0:
 * - Lazy-expiration: antes de consultar disponibilidad, expira solicitudes
 *   Pendiente de pago que hayan superado las 4 horas (RF-04).
 * - Validación de fecha pasada corregida a zona horaria Colombia (America/Bogota).
 *
 * Cambios v2.1:
 * - expirarPendientesEnRango: filtra eventos PENDIENTE leyendo el título
 *   (fuente de verdad), no extendedProperties. Consistente con google-calendar.ts.
 *
 * Responde:
 *   { disponible: true }
 *   { disponible: false }
 *   { error: "mensaje" }  → status 400 / 500
 */

import { NextRequest } from "next/server"
import { verificarDisponibilidad, verificarExpiracion } from "@/lib/google-calendar"
import type { CabanaId } from "@/lib/google-calendar"
import { google } from "googleapis"

const CABANAS_VALIDAS: CabanaId[] = ["cabana-a", "cabana-b", "cabana-c"]

// ── Helper: fecha de hoy en Colombia (sin hora) ───────────────────────────────
function hoyEnColombia(): Date {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric", month: "2-digit", day: "2-digit",
  })
  const [y, m, d] = formatter.format(new Date()).split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

// ── Helper: expira en batch los eventos pendientes del rango ─────────────────
// Consulta los eventos del calendario en el rango solicitado y llama
// verificarExpiracion() sobre cada uno que tenga estado "pendiente".
// Esto permite liberar fechas sin necesidad de un cron externo.
async function expirarPendientesEnRango(
  cabana:      CabanaId,
  fechaEntrada: string,
  fechaSalida:  string
): Promise<void> {
  try {
    // Necesitamos listar los eventos directamente para obtener sus IDs
    const auth = new (await import("googleapis")).google.auth.JWT({
      email:  process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key:    process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/calendar"],
    })
    const calendar = google.calendar({ version: "v3", auth })

    const calendarIdMap: Record<CabanaId, string | undefined> = {
      "cabana-a": process.env.GOOGLE_CALENDAR_ID_CABANA_A,
      "cabana-b": process.env.GOOGLE_CALENDAR_ID_CABANA_B,
      "cabana-c": process.env.GOOGLE_CALENDAR_ID_CABANA_C,
    }
    const calendarId = calendarIdMap[cabana]
    if (!calendarId) return

    const { data } = await calendar.events.list({
      calendarId,
      timeMin: new Date(`${fechaEntrada}T00:00:00`).toISOString(),
      timeMax: new Date(`${fechaSalida}T23:59:59`).toISOString(),
      singleEvents: true,
    })

    const eventos = data.items ?? []

    // Filtramos por título — fuente de verdad (v2.1).
    // Solo eventos con "PENDIENTE" en el título, excluyendo "SALDO PENDIENTE"
    // ya que ese estado nunca expira (RF-04).
    const pendientes = eventos.filter((ev) => {
      const titulo = (ev.summary ?? "").toUpperCase()
      return titulo.includes("PENDIENTE") && !titulo.includes("SALDO PENDIENTE")
    })

    // Expirar en paralelo — best effort, no bloqueamos si alguno falla
    await Promise.allSettled(
      pendientes.map((ev) => verificarExpiracion(cabana, ev.id!))
    )
  } catch (err) {
    // No propagamos el error — si la expiración falla, la disponibilidad
    // puede devolver un falso negativo pero no se rompe el flujo.
    console.error("[disponibilidad] Error en expirarPendientesEnRango:", err)
  }
}

// ── Route Handler ─────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const cabana      = searchParams.get("cabana")
    const fechaEntrada = searchParams.get("fechaEntrada")
    const fechaSalida  = searchParams.get("fechaSalida")

    // ── Validación de parámetros ────────────────────────────────────────────
    if (!cabana || !fechaEntrada || !fechaSalida) {
      return Response.json(
        { error: "Parámetros requeridos: cabana, fechaEntrada, fechaSalida" },
        { status: 400 }
      )
    }

    if (!CABANAS_VALIDAS.includes(cabana as CabanaId)) {
      return Response.json(
        { error: `Cabaña inválida. Opciones: ${CABANAS_VALIDAS.join(", ")}` },
        { status: 400 }
      )
    }


    // Validar formato estricto YYYY-MM-DD ANTES de parsear
    
    const regexFecha = /^\d{4}-\d{2}-\d{2}$/
    if (!regexFecha.test(fechaEntrada) || !regexFecha.test(fechaSalida)) {
      return Response.json(
        { error: "Formato de fecha inválido. Usa YYYY-MM-DD" },
      { status: 400 }
      )
    } 
    const entrada = new Date(fechaEntrada)
    const salida  = new Date(fechaSalida)

    if (isNaN(entrada.getTime()) || isNaN(salida.getTime())) {
      return Response.json(
        { error: "Formato de fecha inválido." },
        { status: 400 }
      )
    }

    if (entrada >= salida) {
      return Response.json(
        { error: "La fecha de entrada debe ser anterior a la fecha de salida" },
        { status: 400 }
      )
    }

    // Comparar contra medianoche de hoy en Colombia (no UTC) para no
    // rechazar fechas válidas del día actual por diferencia horaria
    const entradaFecha = new Date(Date.UTC(
      entrada.getUTCFullYear(),
      entrada.getUTCMonth(),
      entrada.getUTCDate()
    ))
    if (entradaFecha < hoyEnColombia()) {
      return Response.json(
        { error: "La fecha de entrada no puede ser en el pasado" },
        { status: 400 }
      )
    }

    // ── Lazy-expiration (RF-04) ─────────────────────────────────────────────
    // Expira solicitudes Pendiente de pago vencidas antes de consultar.
    // Así se liberan fechas sin depender de un cron externo.
    await expirarPendientesEnRango(cabana as CabanaId, fechaEntrada, fechaSalida)

    // ── Consulta de disponibilidad ──────────────────────────────────────────
    const disponible = await verificarDisponibilidad(
      cabana as CabanaId,
      fechaEntrada,
      fechaSalida
    )

    return Response.json({ disponible })

  } catch (error) {
    console.error("[/api/disponibilidad] Error:", error)
    return Response.json(
      { error: "Error al consultar disponibilidad. Intenta de nuevo." },
      { status: 500 }
    )
  }
}

