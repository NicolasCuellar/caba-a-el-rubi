/**
 * /app/api/pasadia/route.ts
 *
 * Endpoint para solicitudes de pasadía (RF-17).
 * Crea un evento en Google Calendar por cada cabaña solicitada.
 *
 * POST /api/pasadia
 * Body: { cabanas, fecha, nombre, telefono, email,
 *         totalPersonas, personasPorCabana, observaciones }
 *
 * El precio se recalcula en el servidor — el cliente solo envía personas.
 * La fechaSalida (fecha + 1 día) se construye aquí, no viene del cliente.
 */

import { NextRequest, NextResponse } from "next/server"
import {
  crearSolicitudPasadia,
  verificarDisponibilidad,
  type CabanaId,
  type DatosPasadia,
} from "@/lib/google-calendar"
import { calcularPasadia, PASADIA } from "@/lib/tarifas"

// ─────────────────────────────────────────────
// Constantes de validación
// ─────────────────────────────────────────────

const CABANAS_VALIDAS: CabanaId[] = ["cabana-a", "cabana-b", "cabana-c"]
const REGEX_FECHA    = /^\d{4}-\d{2}-\d{2}$/
const REGEX_TELEFONO = /^[0-9\s\+\-]{7,20}$/
const REGEX_EMAIL    = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// ─────────────────────────────────────────────
// Helper: fecha + 1 día en formato YYYY-MM-DD
// ─────────────────────────────────────────────

function fechaMasDia(fecha: string): string {
  const d = new Date(`${fecha}T12:00:00`)
  d.setDate(d.getDate() + 1)
  return d.toISOString().split("T")[0]
}

// ─────────────────────────────────────────────
// Helper: fecha no está en el pasado (hora Colombia)
// ─────────────────────────────────────────────

function hoyEnColombia(): string {
  return new Date()
    .toLocaleDateString("en-CA", { timeZone: "America/Bogota" }) // "YYYY-MM-DD"
}

// ─────────────────────────────────────────────
// POST /api/pasadia
// ─────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // ── 1. Parseo del body ─────────────────────────────────────────────────────
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: "El cuerpo de la solicitud no es JSON válido." },
      { status: 400 }
    )
  }

  const {
    cabanas,
    fecha,
    nombre,
    telefono,
    email,
    totalPersonas,
    personasPorCabana,
    observaciones = "",
  } = body

  // ── 2. Validación de campos requeridos ─────────────────────────────────────

  // cabanas: array no vacío de CabanaId válidos, máx. 3
  if (
    !Array.isArray(cabanas) ||
    cabanas.length === 0 ||
    cabanas.length > 3 ||
    !cabanas.every((c) => CABANAS_VALIDAS.includes(c as CabanaId))
  ) {
    return NextResponse.json(
      { error: "Debe seleccionar entre 1 y 3 cabañas válidas." },
      { status: 400 }
    )
  }

  // Sin cabañas duplicadas
  if (new Set(cabanas).size !== cabanas.length) {
    return NextResponse.json(
      { error: "No puede seleccionar la misma cabaña más de una vez." },
      { status: 400 }
    )
  }

  // fecha: string YYYY-MM-DD y no en el pasado
  if (!fecha || typeof fecha !== "string" || !REGEX_FECHA.test(fecha)) {
    return NextResponse.json(
      { error: "La fecha debe tener formato YYYY-MM-DD." },
      { status: 400 }
    )
  }
  if (fecha < hoyEnColombia()) {
    return NextResponse.json(
      { error: "La fecha del pasadía no puede ser en el pasado." },
      { status: 400 }
    )
  }

  const fechaDate = new Date(`${fecha}T12:00:00Z`)
  const [fY, fM, fD] = (fecha as string).split("-").map(Number)
  if (
    fechaDate.getUTCFullYear() !== fY ||
    fechaDate.getUTCMonth() + 1 !== fM ||
    fechaDate.getUTCDate() !== fD
  ) {
    return NextResponse.json(
      { error: "Fecha inválida (ej: 29-feb en año no bisiesto)." },
      { status: 400 }
    )
  }

  // nombre
  if (!nombre || typeof nombre !== "string" || nombre.trim().length < 2) {
    return NextResponse.json(
      { error: "El nombre es obligatorio (mínimo 2 caracteres)." },
      { status: 400 }
    )
  }

  // telefono
  if (!telefono || typeof telefono !== "string" || !REGEX_TELEFONO.test(telefono.trim())) {
    return NextResponse.json(
      { error: "El teléfono no tiene un formato válido." },
      { status: 400 }
    )
  }

  // email
  if (!email || typeof email !== "string" || !REGEX_EMAIL.test(email.trim())) {
    return NextResponse.json(
      { error: "El correo electrónico no tiene un formato válido." },
      { status: 400 }
    )
  }

  // totalPersonas: entero positivo
  if (
    typeof totalPersonas !== "number" ||
    !Number.isInteger(totalPersonas) ||
    totalPersonas < 1
  ) {
    return NextResponse.json(
      { error: "El total de personas debe ser un número entero mayor a 0." },
      { status: 400 }
    )
  }

  // personasPorCabana: objeto con exactamente las cabañas seleccionadas
  if (!personasPorCabana || typeof personasPorCabana !== "object" || Array.isArray(personasPorCabana)) {
    return NextResponse.json(
      { error: "Debe especificar la distribución de personas por cabaña." },
      { status: 400 }
    )
  }

  const ppc = personasPorCabana as Record<string, unknown>

  // Cada cabaña seleccionada debe tener entre 1 y MAX_PERSONAS_CABANA personas
  for (const cabana of cabanas as CabanaId[]) {
    const cantidad = ppc[cabana]
    if (
      typeof cantidad !== "number" ||
      !Number.isInteger(cantidad) ||
      cantidad < 1 ||
      cantidad > PASADIA.MAX_PERSONAS_CABANA
    ) {
      return NextResponse.json(
        {
          error: `La cabaña ${cabana} debe tener entre 1 y ${PASADIA.MAX_PERSONAS_CABANA} personas.`,
        },
        { status: 400 }
      )
    }
  }

  // totalPersonas debe coincidir con la suma de personasPorCabana
  const sumaPersonas = (cabanas as CabanaId[]).reduce(
    (acc, c) => acc + (ppc[c] as number),
    0
  )
  if (sumaPersonas !== totalPersonas) {
    return NextResponse.json(
      {
        error: `La suma de personas por cabaña (${sumaPersonas}) no coincide con el total (${totalPersonas}).`,
      },
      { status: 400 }
    )
  }

  // ── 3. Verificación de disponibilidad (paralelo) ───────────────────────────
  const fechaSalida = fechaMasDia(fecha)

  const disponibilidades = await Promise.all(
    (cabanas as CabanaId[]).map((c) => verificarDisponibilidad(c, fecha, fechaSalida))
  )

  const cabanasOcupadas = (cabanas as CabanaId[]).filter((_, i) => !disponibilidades[i])

  if (cabanasOcupadas.length > 0) {
    return NextResponse.json(
      {
        error: `La(s) cabaña(s) ${cabanasOcupadas.join(", ")} no están disponibles para esa fecha.`,
        cabanasOcupadas,
      },
      { status: 409 }
    )
  }

  // ── 4. Recálculo del precio en el servidor ─────────────────────────────────
  // El precio nunca se confía del cliente — se recalcula con la misma
  // función que usa el formulario, garantizando coherencia.
  const { total: precioTotal, descuento, aplicaDescuento } = calcularPasadia(totalPersonas)

  // ── 5. Construir DatosPasadia y crear evento(s) en Google Calendar ─────────
  const datosPasadia: DatosPasadia = {
    cabanas:           cabanas as CabanaId[],
    fecha,
    fechaSalida,
    nombre:            nombre.trim(),
    telefono:          telefono.trim(),
    email:             email.trim(),
    totalPersonas,
    personasPorCabana: ppc as Record<CabanaId, number>,
    precioTotal,
    descuento,
    aplicaDescuento,
    observaciones:     typeof observaciones === "string" ? observaciones.trim() : "",
  }

  let eventoIds: string[]
  try {
    eventoIds = await crearSolicitudPasadia(datosPasadia)
  } catch (err) {
    console.error("[/api/pasadia] Error al crear evento en Google Calendar:", err)
    return NextResponse.json(
      { error: "No se pudo registrar la solicitud. Por favor intenta de nuevo." },
      { status: 500 }
    )
  }

  // ── 6. Respuesta exitosa ───────────────────────────────────────────────────
  return NextResponse.json(
    {
      ok:            true,
      eventoIds,
      precioTotal,
      descuento,
      aplicaDescuento,
      fecha,
      cabanas,
    },
    { status: 201 }
  )
}
