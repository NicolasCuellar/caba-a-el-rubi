/**
 * /app/api/disponibilidad/route.ts
 *
 * GET /api/disponibilidad?cabana=cabana-a&fechaEntrada=2026-04-10&fechaSalida=2026-04-12
 *
 * Cambios v2.0:
 * - Lazy-expiration: antes de consultar disponibilidad, expira solicitudes
 *   Pendiente de pago que hayan superado las 4 horas (RF-04).
 * - Validacion de fecha pasada corregida a zona horaria Colombia (America/Bogota).
 *
 * Cambios v2.1:
 * - expirarPendientesEnRango: filtra eventos PENDIENTE leyendo el titulo
 *   (fuente de verdad), no extendedProperties. Consistente con google-calendar.ts.
 */

import { NextRequest } from "next/server"
import { google } from "googleapis"
import { verificarDisponibilidad, verificarExpiracion } from "@/lib/google-calendar"
import type { CabanaId } from "@/lib/google-calendar"
import {
  esFechaIsoValida,
  finDiaIsoBogota,
  hoyIsoEnBogota,
  inicioDiaIsoBogota,
} from "@/lib/date-utils"

const CABANAS_VALIDAS: CabanaId[] = ["cabana-a", "cabana-b", "cabana-c"]

function hoyEnColombia(): Date {
  const [y, m, d] = hoyIsoEnBogota().split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

async function expirarPendientesEnRango(
  cabana: CabanaId,
  fechaEntrada: string,
  fechaSalida: string
): Promise<void> {
  try {
    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
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
      timeMin: inicioDiaIsoBogota(fechaEntrada),
      timeMax: finDiaIsoBogota(fechaSalida),
      singleEvents: true,
    })

    const pendientes = (data.items ?? []).filter((ev) => {
      const titulo = (ev.summary ?? "").toUpperCase()
      return titulo.includes("PENDIENTE") && !titulo.includes("SALDO PENDIENTE")
    })

    await Promise.allSettled(
      pendientes
        .filter((ev) => !!ev.id)
        .map((ev) => verificarExpiracion(cabana, ev.id!))
    )
  } catch (err) {
    console.error("[disponibilidad] Error en expirarPendientesEnRango:", err)
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const cabana = searchParams.get("cabana")
    const fechaEntrada = searchParams.get("fechaEntrada")
    const fechaSalida = searchParams.get("fechaSalida")

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

    if (!esFechaIsoValida(fechaEntrada) || !esFechaIsoValida(fechaSalida)) {
      return Response.json(
        { error: "Formato de fecha inválido. Usa YYYY-MM-DD" },
        { status: 400 }
      )
    }

    if (fechaEntrada >= fechaSalida) {
      return Response.json(
        { error: "La fecha de entrada debe ser anterior a la fecha de salida" },
        { status: 400 }
      )
    }

    const [entY, entM, entD] = fechaEntrada.split("-").map(Number)
    const entradaFecha = new Date(Date.UTC(entY, entM - 1, entD))

    if (entradaFecha < hoyEnColombia()) {
      return Response.json(
        { error: "La fecha de entrada no puede ser en el pasado" },
        { status: 400 }
      )
    }

    await expirarPendientesEnRango(cabana as CabanaId, fechaEntrada, fechaSalida)

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
