/**
 * /lib/whatsapp.ts
 *
 * Módulo centralizado para envíos de WhatsApp vía Meta Cloud API.
 *
 * Fase 1 (actual): número de prueba de Meta — solo envía a números
 * previamente agregados en el panel de la app de Meta for Developers.
 *
 * Fase 2 (futuro): número propio verificado + plantillas pre-aprobadas
 * para enviar a clientes que nunca han escrito al negocio.
 *
 * Filosofía: estas funciones NUNCA lanzan error.
 * Si el envío falla, lo loggean y devuelven false.
 * El flujo de reserva NO debe bloquearse porque WhatsApp no responda.
 *
 * v2.1: emojis escritos como escape Unicode para evitar corrupción
 * por codificación del archivo (.ts guardado en Latin-1 o similar).
 */

// ─────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────

export interface WhatsAppResult {
  ok:         boolean
  messageId?: string
  error?:     string
  skipped?:   boolean
}

// ─────────────────────────────────────────────
// Emojis como constantes Unicode seguras
// ─────────────────────────────────────────────

const E = {
  planta:     "\uD83C\uDF3F",   // 🌿
  sol:        "\u2600\uFE0F",   // ☀️
  clipboard:  "\uD83D\uDCCB",   // 📋
  casa:       "\uD83C\uDFE1",   // 🏡
  campana:    "\uD83D\uDD14",   // 🔔
  persona:    "\uD83D\uDC64",   // 👤
  telefono:   "\uD83D\uDCF1",   // 📱
  calendario: "\uD83D\uDCC5",   // 📅
  personas:   "\uD83D\uDC65",   // 👥
  dinero:     "\uD83D\uDCB0",   // 💰
  reloj:      "\u23F0",         // ⏰
} as const

// ─────────────────────────────────────────────
// Configuración
// ─────────────────────────────────────────────

const GRAPH_API_VERSION = "v21.0"

function getEndpoint(): string | null {
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID
  if (!phoneId) return null
  return `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneId}/messages`
}

function normalizarTelefono(telefono: string): string {
  let limpio = telefono.replace(/\D/g, "")
  if (limpio.length === 10 && limpio.startsWith("3")) {
    limpio = "57" + limpio
  }
  return limpio
}

// ─────────────────────────────────────────────
// Función primitiva: enviar mensaje de texto
// ─────────────────────────────────────────────

export async function enviarMensajeTexto(
  telefono: string,
  mensaje:  string
): Promise<WhatsAppResult> {
  const endpoint = getEndpoint()
  const token    = process.env.WHATSAPP_API_TOKEN

  if (!endpoint || !token) {
    console.info("[WhatsApp] Variables no configuradas — mensaje que se enviaría:")
    console.info(`[WhatsApp]   Para:    ${telefono}`)
    console.info(`[WhatsApp]   Mensaje: ${mensaje.split("\n")[0]}...`)
    return { ok: false, skipped: true, error: "Variables WHATSAPP_API_TOKEN o WHATSAPP_PHONE_NUMBER_ID no configuradas" }
  }

  const numeroLimpio = normalizarTelefono(telefono)

  console.info(`[WhatsApp] ── Diagnóstico ──────────────────────`)
  console.info(`[WhatsApp]   Teléfono RAW recibido: "${telefono}"`)
  console.info(`[WhatsApp]   Teléfono normalizado:  "${numeroLimpio}"`)
  console.info(`[WhatsApp]   Longitud normalizado:  ${numeroLimpio.length} dígitos`)
  console.info(`[WhatsApp] ────────────────────────────────────`)

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type:    "individual",
        to:                numeroLimpio,
        type:              "text",
        text: {
          preview_url: false,
          body:        mensaje,
        },
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      const errorMsg  = data?.error?.message ?? `HTTP ${res.status}`
      const errorCode = data?.error?.code
      console.error(`[WhatsApp] Error de Meta API (${errorCode}): ${errorMsg}`)
      console.error(`[WhatsApp]   Respuesta completa:`, JSON.stringify(data))
      return { ok: false, error: errorMsg }
    }

    const messageId     = data?.messages?.[0]?.id
    const messageStatus = data?.messages?.[0]?.message_status
    const waId          = data?.contacts?.[0]?.wa_id
    const inputNumber   = data?.contacts?.[0]?.input

    console.info(`[WhatsApp] Mensaje enviado:`)
    console.info(`[WhatsApp]   Número enviado:    ${inputNumber}`)
    console.info(`[WhatsApp]   wa_id resuelto:    ${waId}`)
    console.info(`[WhatsApp]   wamid:             ${messageId}`)
    console.info(`[WhatsApp]   message_status:    ${messageStatus ?? "(no devuelto)"}`)

    return { ok: true, messageId }

  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Error desconocido"
    console.error(`[WhatsApp] Excepción al enviar:`, err)
    return { ok: false, error: errorMsg }
  }
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

const CABANA_LABEL: Record<string, string> = {
  "cabana-a": "Caba\u00F1a A",
  "cabana-b": "Caba\u00F1a B",
  "cabana-c": "Caba\u00F1a C",
}

function formatearFecha(fecha: string): string {
  const [y, m, d] = fecha.split("-")
  return `${d}/${m}/${y}`
}

// ─────────────────────────────────────────────
// Mensajes del dominio
// ─────────────────────────────────────────────

/**
 * RF-16: Notifica al cliente que su solicitud de reserva fue recibida.
 */
export async function notificarClienteReserva(args: {
  telefono:     string
  nombre:       string
  cabana:       string
  fechaEntrada: string
  fechaSalida:  string
}): Promise<WhatsAppResult> {
  const nombre = args.nombre
    .split(" ")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join(" ")

  const mensaje = [
    `\u00A1Hola ${nombre}! ${E.planta}`,
    ``,
    `Tu solicitud de reserva en *La Caba\u00F1a El Rub\u00ED* fue recibida exitosamente.`,
    ``,
    `${E.clipboard} *Resumen:*`,
    `\u2022 Caba\u00F1a: ${CABANA_LABEL[args.cabana] ?? args.cabana}`,
    `\u2022 Entrada: ${formatearFecha(args.fechaEntrada)}`,
    `\u2022 Salida:  ${formatearFecha(args.fechaSalida)}`,
    ``,
    `En breve te contactaremos para confirmar disponibilidad y coordinar el pago. ${E.casa}`,
  ].join("\n")

  return enviarMensajeTexto(args.telefono, mensaje)
}

/**
 * RF-17: Notifica al cliente que su solicitud de pasadía fue recibida.
 */
export async function notificarClientePasadia(args: {
  telefono:      string
  nombre:        string
  fecha:         string
  cabanas:       string[]
  totalPersonas: number
  precioTotal:   number
}): Promise<WhatsAppResult> {
  const nombre = args.nombre
    .split(" ")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join(" ")

  const cabanasStr = args.cabanas.map((c) => CABANA_LABEL[c] ?? c).join(", ")

  const mensaje = [
    `\u00A1Hola ${nombre}! ${E.sol}`,
    ``,
    `Tu solicitud de *Parad\u00EDa* en *La Caba\u00F1a El Rub\u00ED* fue recibida exitosamente.`,
    ``,
    `${E.clipboard} *Resumen:*`,
    `\u2022 Fecha: ${formatearFecha(args.fecha)}`,
    `\u2022 Horario: 10:00 a.m. \u2013 6:00 p.m.`,
    `\u2022 Caba\u00F1a(s): ${cabanasStr}`,
    `\u2022 Personas: ${args.totalPersonas}`,
    `\u2022 Total estimado: $${args.precioTotal.toLocaleString("es-CO")}`,
    ``,
    `En breve te contactaremos para confirmar y coordinar el pago. ${E.casa}`,
  ].join("\n")

  return enviarMensajeTexto(args.telefono, mensaje)
}

/**
 * Notifica al ADMIN cuando llega una nueva solicitud.
 */
export async function notificarAdminNuevaReserva(args: {
  tipo:            "reserva" | "pasadia"
  nombreCliente:   string
  telefonoCliente: string
  cabanas:         string[]
  fechaEntrada:    string
  fechaSalida?:    string
  personas:        number
  precioTotal?:    number
}): Promise<WhatsAppResult> {
  const adminNumber = process.env.WHATSAPP_ADMIN_NUMBER
  if (!adminNumber) {
    console.warn("[WhatsApp] WHATSAPP_ADMIN_NUMBER no configurado")
    return { ok: false, skipped: true, error: "WHATSAPP_ADMIN_NUMBER no configurado" }
  }

  const cabanasStr = args.cabanas.map((c) => CABANA_LABEL[c] ?? c).join(", ")
  const tipoLabel  = args.tipo === "pasadia" ? "PARAD\u00CDA" : "RESERVA"

  const nombre = args.nombreCliente
    .split(" ")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join(" ")

  const lineas = [
    `${E.campana} *Nueva solicitud de ${tipoLabel}*`,
    ``,
    `${E.persona} *Cliente:* ${nombre}`,
    `${E.telefono} *Tel\u00E9fono:* ${args.telefonoCliente}`,
    ``,
    `${E.casa} *Caba\u00F1a(s):* ${cabanasStr}`,
    args.fechaSalida
      ? `${E.calendario} *Fechas:* ${formatearFecha(args.fechaEntrada)} \u2192 ${formatearFecha(args.fechaSalida)}`
      : `${E.calendario} *Fecha:* ${formatearFecha(args.fechaEntrada)}`,
    `${E.personas} *Personas:* ${args.personas}`,
  ]

  if (args.precioTotal) {
    lineas.push(`${E.dinero} *Total estimado:* $${args.precioTotal.toLocaleString("es-CO")}`)
  }

  lineas.push(``, `${E.reloj} Bloqueo autom\u00E1tico: 4 horas. Confirma en Calendar antes de que expire.`)

  return enviarMensajeTexto(adminNumber, lineas.join("\n"))
}