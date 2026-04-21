/**
 * /app/api/reservas/route.ts
 *
 * POST /api/reservas
 * Body JSON: {
 *   cabana, fechaEntrada, fechaSalida,
 *   nombre, telefono, email, personas,
 *   servicios, petFriendlyCount, desayunoCount,
 *   observaciones
 * }
 *
 * Cambios v2.0:
 * - Servicios adicionales validados contra los 5 fijos del MVP (RF-12).
 * - petFriendlyCount y desayunoCount extraídos del body y pasados a DatosReserva.
 * - Máximo de personas alineado con el formulario (8 pax).
 * - Validación de fecha pasada corregida a zona horaria Colombia (America/Bogota).
 *
 * Cambios v2.1:
 * - Sin cambios adicionales en este archivo respecto a v2.0.
 *
 * Responde:
 *   { ok: true, eventoId: "abc123" }
 *   { error: "mensaje" }  → status 400 / 409 / 500
 */

import { verificarDisponibilidad, crearSolicitudReserva } from "@/lib/google-calendar"
import type { CabanaId, DatosReserva } from "@/lib/google-calendar"

// ─────────────────────────────────────────────
// Constantes de validación
// ─────────────────────────────────────────────

const CABANAS_VALIDAS: CabanaId[] = ["cabana-a", "cabana-b", "cabana-c"]
const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** RF-12: exactamente los 5 servicios adicionales fijos del MVP v2.0 */
const SERVICIOS_VALIDOS = ["romantico", "cumpleanos", "picnic", "pet-friendly", "desayuno"] as const
type ServicioId = typeof SERVICIOS_VALIDOS[number]

/** Capacidad máxima de personas por cabaña */
const MAX_PERSONAS_POR_CABANA: Record<CabanaId, number> = {
  "cabana-a": 5,
  "cabana-b": 5,
  "cabana-c": 8,
}

// ─────────────────────────────────────────────
// Helper: fecha de hoy en Colombia (sin hora)
// ─────────────────────────────────────────────

function hoyEnColombia(): Date {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric", month: "2-digit", day: "2-digit",
  })
  const [y, m, d] = formatter.format(new Date()).split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, d))  // ← Date.UTC en vez de new Date()
}

// ─────────────────────────────────────────────
// Route Handler
// ─────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const {
      cabana,
      fechaEntrada,
      fechaSalida,
      nombre,
      telefono,
      email,
      personas,
      servicios        = [],
      petFriendlyCount,
      desayunoCount,
      observaciones    = "",
    } = body

    // ── Validación de campos obligatorios ─────────────────────────────────
    const camposFaltantes: string[] = []
    if (!cabana)       camposFaltantes.push("cabana")
    if (!fechaEntrada) camposFaltantes.push("fechaEntrada")
    if (!fechaSalida)  camposFaltantes.push("fechaSalida")
    if (!nombre)       camposFaltantes.push("nombre")
    if (!telefono)     camposFaltantes.push("telefono")
    if (!email)        camposFaltantes.push("email")
    if (!personas)     camposFaltantes.push("personas")

    if (camposFaltantes.length > 0) {
      return Response.json(
        { error: `Campos obligatorios faltantes: ${camposFaltantes.join(", ")}` },
        { status: 400 }
      )
    }

    if (!REGEX_EMAIL.test(String(email).trim())) {
      return Response.json(
        { error: "El email no tiene un formato válido." },
        { status: 400 }
      )
    }

    if (String(nombre).trim().length > 100) {
      return Response.json(
        { error: "El nombre no puede superar 100 caracteres." },
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
    const entrada = new Date(`${fechaEntrada}T12:00:00Z`)
    const salida  = new Date(`${fechaSalida}T12:00:00Z`)

    const [entY, entM, entD] = fechaEntrada.split("-").map(Number)
    const [salY, salM, salD] = fechaSalida.split("-").map(Number)

    if (
      entrada.getUTCFullYear() !== entY || entrada.getUTCMonth() + 1 !== entM || entrada.getUTCDate() !== entD
    ) {
      return Response.json(
        { error: "Formato de fecha inválido. Usa YYYY-MM-DD" },
        { status: 400 }
      )
    }
    if (
      salida.getUTCFullYear() !== salY || salida.getUTCMonth() + 1 !== salM || salida.getUTCDate() !== salD
    ) {
      return Response.json(
        { error: "Formato de fecha inválido. Usa YYYY-MM-DD" },
        { status: 400 }
      )
    }

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

    // Comparar contra medianoche en Colombia para no rechazar
    // fechas válidas del día actual por diferencia UTC
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

    // ── Validación de personas ────────────────────────────────────────────
    const numPersonas  = Number(personas)
    const maxPermitido = MAX_PERSONAS_POR_CABANA[cabana as CabanaId]

    if (isNaN(numPersonas) || numPersonas < 1 || numPersonas > maxPermitido) {
      return Response.json(
        { error: `La ${cabana.replace("-", " ").replace("cabana", "Cabaña")} admite máximo ${maxPermitido} personas` },
        { status: 400 }
      )
    }

    // ── Validación de servicios (RF-12) ───────────────────────────────────
    if (!Array.isArray(servicios)) {
      return Response.json(
        { error: "El campo servicios debe ser un array" },
        { status: 400 }
      )
    }

    const serviciosInvalidos = servicios.filter(
      (s: string) => !SERVICIOS_VALIDOS.includes(s as ServicioId)
    )
    if (serviciosInvalidos.length > 0) {
      return Response.json(
        { error: `Servicios inválidos: ${serviciosInvalidos.join(", ")}. Válidos: ${SERVICIOS_VALIDOS.join(", ")}` },
        { status: 400 }
      )
    }

    // ── Validación de cantidades para servicios por unidad ────────────────
    const incluyePetFriendly = servicios.includes("pet-friendly")
    const incluyeDesayuno    = servicios.includes("desayuno")

    if (incluyePetFriendly) {
      const n = Number(petFriendlyCount)
      if (isNaN(n) || n < 1) {
        return Response.json(
          { error: "petFriendlyCount debe ser un número mayor a 0 cuando se incluye pet-friendly" },
          { status: 400 }
        )
      }
    }

    if (incluyeDesayuno) {
      const n = Number(desayunoCount)
      if (isNaN(n) || n < 1 || n > maxPermitido) {
        return Response.json(
          { error: "desayunoCount debe ser entre 1 y el número de personas cuando se incluye desayuno" },
          { status: 400 }
        )
      }
    }

    // ── Verificar disponibilidad ──────────────────────────────────────────
    // Se verifica justo antes de crear para minimizar la ventana
    // entre consulta y bloqueo.
    const disponible = await verificarDisponibilidad(
      cabana as CabanaId,
      fechaEntrada,
      fechaSalida
    )

    if (!disponible) {
      return Response.json(
        { error: "La cabaña seleccionada no está disponible para las fechas solicitadas." },
        { status: 409 } // 409 Conflict — RF-10
      )
    }

    // ── Crear solicitud en Google Calendar ───────────────────────────────
    const datos: DatosReserva = {
      cabana:           cabana as CabanaId,
      fechaEntrada,
      fechaSalida,
      nombre:           String(nombre).trim(),
      telefono:         String(telefono).trim(),
      email:            String(email).trim().toLowerCase(),
      personas:         numPersonas,
      servicios:        servicios as ServicioId[],
      petFriendlyCount: incluyePetFriendly ? Number(petFriendlyCount) : undefined,
      desayunoCount:    incluyeDesayuno    ? Number(desayunoCount)    : undefined,
      observaciones:    String(observaciones).trim(),
    }

    const eventoId = await crearSolicitudReserva(datos)

    // ── Respuesta exitosa (RF-09) ─────────────────────────────────────────
    return Response.json(
      {
        ok: true,
        eventoId,
        mensaje: "Solicitud registrada. El administrador te contactará por WhatsApp para confirmar.",
      },
      { status: 201 }
    )

  } catch (error) {
    console.error("[/api/reservas] Error:", error)
    return Response.json(
      { error: "Error al procesar la solicitud. Intenta de nuevo." },
      { status: 500 }
    )
  }
}
