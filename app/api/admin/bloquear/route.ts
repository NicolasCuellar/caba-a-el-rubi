/**
 * /app/api/admin/bloquear/route.ts
 *
 * POST /api/admin/bloquear
 * Headers: x-admin-key: <ADMIN_API_KEY>
 * Body JSON: { cabana, fechaEntrada, fechaSalida, motivo? }
 *
 * RF-11: El administrador bloquea manualmente una cabaña
 * por mantenimiento, reparaciones o uso interno.
 *
 * Cambios v2.0:
 * - Validación de fecha pasada corregida a zona horaria Colombia (America/Bogota).
 * - Validación de motivo: sanitizado y longitud máxima de 120 caracteres.
 * - Respuesta enriquecida con cabana, fechas y motivo además del eventoId.
 *
 * ⚠️  Esta ruta debe protegerse con autenticación robusta antes de
 *     salir a producción. Por ahora usa API key simple via header: x-admin-key.
 *
 * Convención de título en Google Calendar:
 * El sistema escribe el título como: BLOQUEADO — Cabaña X — <motivo>
 * Si el admin crea un bloqueo manualmente desde Calendar (sin usar este endpoint)
 * debe incluir la palabra BLOQUEADO en el título para que el sistema lo reconozca.
 * La cadena buscada es exactamente "BLOQUEADO" — no "BLOQUEADA" ni variantes.
 *
 * Responde:
 *   { ok: true, eventoId, cabana, fechaEntrada, fechaSalida, motivo }
 *   { error: "mensaje" }
 */

import { bloquearCabanaManual } from "@/lib/google-calendar"
import type { CabanaId } from "@/lib/google-calendar"

// ─────────────────────────────────────────────
// Constantes de validación
// ─────────────────────────────────────────────

const CABANAS_VALIDAS: CabanaId[] = ["cabana-a", "cabana-b", "cabana-c"]

const MOTIVO_MAX_CHARS = 120

// ─────────────────────────────────────────────
// Helper: fecha de hoy en Colombia (sin hora)
// ─────────────────────────────────────────────

function hoyEnColombia(): Date {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric", month: "2-digit", day: "2-digit",
  })
  const [y, m, d] = formatter.format(new Date()).split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

// ─────────────────────────────────────────────
// Route Handler
// ─────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    // ── Protección básica con API key ─────────────────────────────────────
    // En el futuro reemplazar por NextAuth o similar.
    const adminKey = request.headers.get("x-admin-key")
    if (adminKey !== process.env.ADMIN_API_KEY) {
      return Response.json({ error: "No autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const { cabana, fechaEntrada, fechaSalida, motivo = "Bloqueo manual" } = body

    // ── Validación de campos requeridos ───────────────────────────────────
    if (!cabana || !fechaEntrada || !fechaSalida) {
      return Response.json(
        { error: "Campos requeridos: cabana, fechaEntrada, fechaSalida" },
        { status: 400 }
      )
    }

    // ── Validación de cabaña ──────────────────────────────────────────────
    if (!CABANAS_VALIDAS.includes(cabana as CabanaId)) {
      return Response.json(
        { error: `Cabaña inválida. Opciones: ${CABANAS_VALIDAS.join(", ")}` },
        { status: 400 }
      )
    }

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

    // El admin puede bloquear desde hoy en adelante (no fechas ya pasadas)
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

    // ── Validación de motivo ──────────────────────────────────────────────
    const motivoLimpio = String(motivo).trim()

    if (motivoLimpio.length === 0) {
      return Response.json(
        { error: "El motivo no puede estar vacío" },
        { status: 400 }
      )
    }

    if (motivoLimpio.length > MOTIVO_MAX_CHARS) {
      return Response.json(
        { error: `El motivo no puede superar ${MOTIVO_MAX_CHARS} caracteres` },
        { status: 400 }
      )
    }

    // ── Crear bloqueo en Google Calendar ─────────────────────────────────
    const eventoId = await bloquearCabanaManual(
      cabana as CabanaId,
      fechaEntrada,
      fechaSalida,
      motivoLimpio
    )

    return Response.json(
      {
        ok: true,
        eventoId,
        cabana,
        fechaEntrada,
        fechaSalida,
        motivo: motivoLimpio,
      },
      { status: 201 }
    )

  } catch (error) {
    console.error("[/api/admin/bloquear] Error:", error)
    return Response.json(
      { error: "Error al crear el bloqueo. Intenta de nuevo." },
      { status: 500 }
    )
  }
}
