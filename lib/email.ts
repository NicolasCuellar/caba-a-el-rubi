/**
 * /lib/email.ts
 *
 * Envío de correos transaccionales con Resend.
 * Patrón "best-effort": si el envío falla, se loggea pero NO bloquea el flujo
 * de creación de reserva/pasadía. Mismo patrón que /lib/whatsapp.ts.
 *
 * Cuatro funciones públicas, simétricas a las de WhatsApp:
 *   - notificarClienteReservaEmail()    → confirmación al huésped
 *   - notificarAdminReservaEmail()      → notificación al admin (con copy WA)
 *   - notificarClientePasadiaEmail()    → confirmación al cliente de pasadía
 *   - notificarAdminPasadiaEmail()      → notificación al admin de pasadía (con copy WA)
 *
 * Variables de entorno requeridas:
 *   RESEND_API_KEY          → API key de Resend (https://resend.com/api-keys)
 *   EMAIL_FROM              → Remitente verificado (ej. "reservas@tudominio.com")
 *                              Mientras no haya dominio: "onboarding@resend.dev"
 *   ADMIN_EMAIL             → Correo del administrador
 *   WHATSAPP_ADMIN_NUMBER   → (ya existe) usado para los links wa.me en el correo
 *                              al cliente, para que pueda escribirle al admin.
 */

import { Resend } from "resend"
import type { CabanaId, DatosReserva, DatosPasadia } from "@/lib/google-calendar"

// ─────────────────────────────────────────────
// Cliente Resend (lazy — solo se instancia si hay API key)
// ─────────────────────────────────────────────

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn("[Email] RESEND_API_KEY no configurado — omitiendo envío.")
    return null
  }
  return new Resend(apiKey)
}

function getRemitente(): string {
  return process.env.EMAIL_FROM ?? "onboarding@resend.dev"
}

function getAdminEmail(): string | null {
  const email = process.env.ADMIN_EMAIL
  if (!email) {
    console.warn("[Email] ADMIN_EMAIL no configurado — omitiendo correo al admin.")
    return null
  }
  return email
}

// ─────────────────────────────────────────────
// Constantes y helpers de presentación
// ─────────────────────────────────────────────

const CABANA_LABEL: Record<CabanaId, string> = {
  "cabana-a": "Cabaña Rubí",
  "cabana-b": "Cabaña Zafiro",
  "cabana-c": "Cabaña Esmeralda",
}

const SERVICIO_LABEL: Record<string, string> = {
  "romantico":    "Decoración romántica",
  "cumpleanos":   "Decoración de cumpleaños",
  "picnic":       "Picnic adicional",
  "pet-friendly": "Pet Friendly",
  "desayuno":     "Desayuno adicional",
}

const SERVICIO_PRECIO: Record<string, number> = {
  "romantico":    60_000,
  "cumpleanos":   60_000,
  "picnic":       85_000,
  "pet-friendly": 15_000,  // por mascota
  "desayuno":     20_000,  // por persona
}

/** Formatea YYYY-MM-DD a DD/MM/AAAA */
function formatearFecha(fecha: string): string {
  const [y, m, d] = fecha.split("-")
  return `${d}/${m}/${y}`
}

/** Formatea un número como moneda colombiana: $180.000 */
function formatCOP(valor: number): string {
  return `$${valor.toLocaleString("es-CO")}`
}

/** Limpia un teléfono dejando solo dígitos. Para uso en links wa.me */
function limpiarTelefono(telefono: string): string {
  return telefono.replace(/\D/g, "")
}

/**
 * Construye un link wa.me con mensaje pre-poblado.
 *
 * Para Colombia: si el número tiene 10 dígitos asumimos local y le
 * anteponemos el prefijo país 57. Si ya viene con código de país
 * (11+ dígitos) lo dejamos tal cual.
 */
function buildWaLink(telefono: string, mensaje: string): string {
  const limpio = limpiarTelefono(telefono)
  const numero = limpio.length === 10 ? `57${limpio}` : limpio
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`
}

// ─────────────────────────────────────────────
// Layout HTML base — minimalista y compatible
// ─────────────────────────────────────────────

/**
 * Wrapper HTML transaccional. Sin imágenes, sin CSS externo, todo inline.
 * Diseñado para máxima compatibilidad (Gmail, Outlook, Apple Mail, móviles).
 */
function htmlLayout(opts: {
  preview: string       // texto de preview que aparece en la bandeja
  titulo:  string
  body:    string       // HTML del contenido principal
}): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${opts.titulo}</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1c1917;">
<div style="display:none;max-height:0;overflow:hidden;">${opts.preview}</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f5f5f4;">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">

        <!-- Header -->
        <tr>
          <td style="background-color:#1c1917;padding:24px 32px;text-align:center;">
            <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:bold;color:#ffffff;letter-spacing:0.5px;">
              La Cabaña El Rubí
            </h1>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            ${opts.body}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background-color:#fafaf9;padding:20px 32px;text-align:center;border-top:1px solid #e7e5e4;">
            <p style="margin:0;font-size:12px;color:#78716c;line-height:1.5;">
              La Cabaña El Rubí · Reservas automatizadas<br>
              Este correo fue generado automáticamente, por favor no respondas a esta dirección.
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>

</body>
</html>`
}

/** Bloque tipo "tabla de datos" reutilizable (etiqueta a la izquierda, valor a la derecha) */
function htmlFila(label: string, value: string): string {
  return `<tr>
    <td style="padding:8px 0;border-bottom:1px solid #f5f5f4;font-size:14px;color:#78716c;">${label}</td>
    <td style="padding:8px 0;border-bottom:1px solid #f5f5f4;font-size:14px;color:#1c1917;text-align:right;font-weight:500;">${value}</td>
  </tr>`
}

/** Botón CTA de bloque (compatible con Outlook usando VML opcional → simple anchor estilizado) */
function htmlBoton(href: string, texto: string, color = "#16a34a"): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:16px 0;">
    <tr>
      <td style="border-radius:8px;background-color:${color};">
        <a href="${href}" target="_blank" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
          ${texto}
        </a>
      </td>
    </tr>
  </table>`
}

// ─────────────────────────────────────────────
// Construcción de los mensajes de WhatsApp
// (mismo formato que /lib/whatsapp.ts pero como string copyable)
// ─────────────────────────────────────────────

function buildMensajeWhatsAppReserva(datos: DatosReserva): string {
  return [
    `¡Hola ${datos.nombre}! 🌿`,
    ``,
    `Soy del equipo de *La Cabaña El Rubí*. Recibí tu solicitud de reserva y quiero confirmarte los detalles:`,
    ``,
    `📋 *Resumen:*`,
    `• Cabaña: ${CABANA_LABEL[datos.cabana]}`,
    `• Entrada: ${formatearFecha(datos.fechaEntrada)}`,
    `• Salida:  ${formatearFecha(datos.fechaSalida)}`,
    `• Huéspedes: ${datos.personas}`,
    ``,
    `¿Podemos coordinar el pago para confirmar tu reserva? 🏡`,
  ].join("\n")
}

function buildMensajeWhatsAppPasadia(datos: DatosPasadia): string {
  const cabanasStr = datos.cabanas.map((c) => CABANA_LABEL[c]).join(", ")
  return [
    `¡Hola ${datos.nombre}! ☀️`,
    ``,
    `Soy del equipo de *La Cabaña El Rubí*. Recibí tu solicitud de *Pasadía* y quiero confirmarte los detalles:`,
    ``,
    `📋 *Resumen:*`,
    `• Fecha: ${formatearFecha(datos.fecha)}`,
    `• Horario: 10:00 a.m. – 6:00 p.m.`,
    `• Cabaña(s): ${cabanasStr}`,
    `• Personas: ${datos.totalPersonas}`,
    `• Total estimado: ${formatCOP(datos.precioTotal)}`,
    ``,
    `¿Podemos coordinar el pago para confirmar? 🏡`,
  ].join("\n")
}

// ─────────────────────────────────────────────
// 1. Cliente — confirmación de RESERVA
// ─────────────────────────────────────────────

export async function notificarClienteReservaEmail(datos: DatosReserva): Promise<void> {
  const resend = getResendClient()
  if (!resend) return

  const adminWa = process.env.WHATSAPP_ADMIN_NUMBER
  const linkAdmin = adminWa
    ? `https://wa.me/${limpiarTelefono(adminWa)}`
    : null

  // Lista de servicios en HTML
  const serviciosHtml = datos.servicios.length === 0
    ? `<tr><td colspan="2" style="padding:8px 0;font-size:14px;color:#78716c;font-style:italic;">Ninguno</td></tr>`
    : datos.servicios.map((s) => {
        let label = SERVICIO_LABEL[s] ?? s
        let precio = SERVICIO_PRECIO[s] ?? 0
        if (s === "pet-friendly" && datos.petFriendlyCount) {
          label += ` × ${datos.petFriendlyCount}`
          precio = SERVICIO_PRECIO[s] * datos.petFriendlyCount
        }
        if (s === "desayuno" && datos.desayunoCount) {
          label += ` × ${datos.desayunoCount} persona(s)`
          precio = SERVICIO_PRECIO[s] * datos.desayunoCount
        }
        return htmlFila(label, formatCOP(precio))
      }).join("")

  const body = `
    <h2 style="margin:0 0 8px 0;font-family:Georgia,'Times New Roman',serif;font-size:24px;color:#1c1917;">
      ¡Tu solicitud fue recibida!
    </h2>
    <p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;color:#44403c;">
      Hola <strong>${datos.nombre}</strong>, tu solicitud de reserva quedó registrada. Te contactaremos pronto por WhatsApp para confirmar disponibilidad y coordinar el pago.
    </p>

    <h3 style="margin:24px 0 8px 0;font-size:13px;font-weight:600;color:#78716c;text-transform:uppercase;letter-spacing:0.05em;">
      Resumen de la reserva
    </h3>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      ${htmlFila("Cabaña", CABANA_LABEL[datos.cabana])}
      ${htmlFila("Fecha de entrada", formatearFecha(datos.fechaEntrada))}
      ${htmlFila("Fecha de salida", formatearFecha(datos.fechaSalida))}
      ${htmlFila("Huéspedes", `${datos.personas} persona(s)`)}
    </table>

    <h3 style="margin:24px 0 8px 0;font-size:13px;font-weight:600;color:#78716c;text-transform:uppercase;letter-spacing:0.05em;">
      Servicios adicionales
    </h3>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      ${serviciosHtml}
    </table>

    ${datos.observaciones ? `
      <h3 style="margin:24px 0 8px 0;font-size:13px;font-weight:600;color:#78716c;text-transform:uppercase;letter-spacing:0.05em;">
        Observaciones
      </h3>
      <p style="margin:0;font-size:14px;color:#44403c;line-height:1.6;">${datos.observaciones}</p>
    ` : ""}

    <div style="margin:32px 0 16px 0;padding:16px;background-color:#fef3c7;border-left:4px solid #f59e0b;border-radius:6px;">
      <p style="margin:0;font-size:14px;color:#78350f;line-height:1.6;">
        <strong>⏱️ Importante:</strong> Tu solicitud queda bloqueada por 4 horas. Si no coordinas el pago en ese tiempo, las fechas volverán a estar disponibles para otros huéspedes.
      </p>
    </div>

    ${linkAdmin ? `
      <p style="margin:24px 0 8px 0;font-size:14px;color:#44403c;line-height:1.6;">
        ¿Tienes preguntas? Escríbenos por WhatsApp:
      </p>
      ${htmlBoton(linkAdmin, "💬 Escribir al administrador", "#16a34a")}
    ` : ""}
  `

  try {
    await resend.emails.send({
      from:    getRemitente(),
      to:      datos.email,
      subject: `Tu solicitud de reserva — ${CABANA_LABEL[datos.cabana]}`,
      html:    htmlLayout({
        preview: `Solicitud recibida: ${CABANA_LABEL[datos.cabana]}, ${formatearFecha(datos.fechaEntrada)} → ${formatearFecha(datos.fechaSalida)}`,
        titulo:  "Solicitud de reserva recibida",
        body,
      }),
    })
    console.info(`[Email] Confirmación de reserva enviada a ${datos.email}`)
  } catch (err) {
    console.error("[Email] Error al enviar correo al cliente (reserva):", err)
  }
}

// ─────────────────────────────────────────────
// 2. Admin — notificación de RESERVA con copy WhatsApp
// ─────────────────────────────────────────────

export async function notificarAdminReservaEmail(datos: DatosReserva): Promise<void> {
  const resend = getResendClient()
  if (!resend) return

  const adminEmail = getAdminEmail()
  if (!adminEmail) return

  // Construir mensaje WhatsApp + link wa.me
  const mensajeWa  = buildMensajeWhatsAppReserva(datos)
  const linkWa     = buildWaLink(datos.telefono, mensajeWa)

  // Servicios en HTML
  const serviciosHtml = datos.servicios.length === 0
    ? `<tr><td colspan="2" style="padding:8px 0;font-size:14px;color:#78716c;font-style:italic;">Ninguno</td></tr>`
    : datos.servicios.map((s) => {
        let label = SERVICIO_LABEL[s] ?? s
        let precio = SERVICIO_PRECIO[s] ?? 0
        if (s === "pet-friendly" && datos.petFriendlyCount) {
          label += ` × ${datos.petFriendlyCount}`
          precio = SERVICIO_PRECIO[s] * datos.petFriendlyCount
        }
        if (s === "desayuno" && datos.desayunoCount) {
          label += ` × ${datos.desayunoCount}`
          precio = SERVICIO_PRECIO[s] * datos.desayunoCount
        }
        return htmlFila(label, formatCOP(precio))
      }).join("")

  const body = `
    <div style="display:inline-block;padding:6px 12px;background-color:#fef3c7;color:#78350f;border-radius:999px;font-size:12px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;margin-bottom:16px;">
      🔔 Nueva reserva pendiente
    </div>

    <h2 style="margin:0 0 8px 0;font-family:Georgia,'Times New Roman',serif;font-size:24px;color:#1c1917;">
      ${datos.nombre}
    </h2>
    <p style="margin:0 0 24px 0;font-size:15px;color:#44403c;">
      ${CABANA_LABEL[datos.cabana]} · ${formatearFecha(datos.fechaEntrada)} → ${formatearFecha(datos.fechaSalida)}
    </p>

    <!-- BLOQUE PRINCIPAL: Botón WhatsApp -->
    <div style="margin:0 0 24px 0;padding:20px;background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;text-align:center;">
      <p style="margin:0 0 12px 0;font-size:14px;color:#166534;font-weight:600;">
        Contactar al cliente con mensaje pre-escrito
      </p>
      ${htmlBoton(linkWa, "💬 Abrir WhatsApp con mensaje listo", "#16a34a")}
      <p style="margin:8px 0 0 0;font-size:12px;color:#15803d;">
        El mensaje ya viene redactado — solo presiona Enviar
      </p>
    </div>

    <h3 style="margin:24px 0 8px 0;font-size:13px;font-weight:600;color:#78716c;text-transform:uppercase;letter-spacing:0.05em;">
      Datos del cliente
    </h3>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      ${htmlFila("Nombre", datos.nombre)}
      ${htmlFila("Teléfono", `<a href="tel:${datos.telefono}" style="color:#1c1917;text-decoration:none;">${datos.telefono}</a>`)}
      ${htmlFila("Email", `<a href="mailto:${datos.email}" style="color:#1c1917;text-decoration:none;">${datos.email}</a>`)}
    </table>

    <h3 style="margin:24px 0 8px 0;font-size:13px;font-weight:600;color:#78716c;text-transform:uppercase;letter-spacing:0.05em;">
      Detalles de la reserva
    </h3>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      ${htmlFila("Cabaña", CABANA_LABEL[datos.cabana])}
      ${htmlFila("Entrada", formatearFecha(datos.fechaEntrada))}
      ${htmlFila("Salida", formatearFecha(datos.fechaSalida))}
      ${htmlFila("Huéspedes", `${datos.personas} persona(s)`)}
    </table>

    <h3 style="margin:24px 0 8px 0;font-size:13px;font-weight:600;color:#78716c;text-transform:uppercase;letter-spacing:0.05em;">
      Servicios adicionales
    </h3>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      ${serviciosHtml}
    </table>

    ${datos.observaciones ? `
      <h3 style="margin:24px 0 8px 0;font-size:13px;font-weight:600;color:#78716c;text-transform:uppercase;letter-spacing:0.05em;">
        Observaciones
      </h3>
      <p style="margin:0;padding:12px;background-color:#fafaf9;border-radius:6px;font-size:14px;color:#44403c;line-height:1.6;">${datos.observaciones}</p>
    ` : ""}

    <!-- Mensaje WhatsApp en texto plano (por si el botón no funciona) -->
    <h3 style="margin:32px 0 8px 0;font-size:13px;font-weight:600;color:#78716c;text-transform:uppercase;letter-spacing:0.05em;">
      Mensaje WhatsApp listo para copiar
    </h3>
    <p style="margin:0 0 8px 0;font-size:13px;color:#78716c;">
      Si el botón no funciona, copia este texto y pégalo en WhatsApp:
    </p>
    <pre style="margin:0;padding:16px;background-color:#fafaf9;border:1px solid #e7e5e4;border-radius:6px;font-family:Menlo,Monaco,Consolas,monospace;font-size:13px;color:#1c1917;white-space:pre-wrap;line-height:1.6;">${mensajeWa.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>

    <p style="margin:24px 0 0 0;padding-top:16px;border-top:1px solid #e7e5e4;font-size:12px;color:#78716c;line-height:1.5;">
      ⏱️ Bloqueo automático: 4 horas. Si no se confirma el pago en ese tiempo, la reserva se cancela y las fechas se liberan.
    </p>
  `

  try {
    await resend.emails.send({
      from:    getRemitente(),
      to:      adminEmail,
      replyTo: datos.email,  // útil: responder al admin redirige al cliente
      subject: `🔔 Nueva reserva — ${datos.nombre} — ${CABANA_LABEL[datos.cabana]}`,
      html:    htmlLayout({
        preview: `${datos.nombre} solicitó ${CABANA_LABEL[datos.cabana]} del ${formatearFecha(datos.fechaEntrada)} al ${formatearFecha(datos.fechaSalida)}`,
        titulo:  "Nueva reserva pendiente",
        body,
      }),
    })
    console.info(`[Email] Notificación de reserva enviada al admin (${adminEmail})`)
  } catch (err) {
    console.error("[Email] Error al enviar correo al admin (reserva):", err)
  }
}

// ─────────────────────────────────────────────
// 3. Cliente — confirmación de PASADÍA
// ─────────────────────────────────────────────

export async function notificarClientePasadiaEmail(datos: DatosPasadia): Promise<void> {
  const resend = getResendClient()
  if (!resend) return

  const adminWa = process.env.WHATSAPP_ADMIN_NUMBER
  const linkAdmin = adminWa
    ? `https://wa.me/${limpiarTelefono(adminWa)}`
    : null

  // Distribución por cabaña
  const distribucionHtml = datos.cabanas
    .map((c) => htmlFila(CABANA_LABEL[c], `${datos.personasPorCabana[c]} persona(s)`))
    .join("")

  const tarifaBase = datos.totalPersonas * 50_000

  const body = `
    <h2 style="margin:0 0 8px 0;font-family:Georgia,'Times New Roman',serif;font-size:24px;color:#1c1917;">
      ¡Tu solicitud de pasadía fue recibida!
    </h2>
    <p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;color:#44403c;">
      Hola <strong>${datos.nombre}</strong>, tu solicitud de pasadía quedó registrada. Te contactaremos pronto por WhatsApp para confirmar disponibilidad y coordinar el pago.
    </p>

    <div style="margin:0 0 24px 0;padding:16px;background-color:#fffbeb;border-left:4px solid #f59e0b;border-radius:6px;">
      <p style="margin:0;font-size:14px;color:#78350f;font-weight:600;">
        ☀️ Horario del pasadía: 10:00 a.m. – 6:00 p.m.
      </p>
    </div>

    <h3 style="margin:24px 0 8px 0;font-size:13px;font-weight:600;color:#78716c;text-transform:uppercase;letter-spacing:0.05em;">
      Resumen
    </h3>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      ${htmlFila("Fecha", formatearFecha(datos.fecha))}
      ${htmlFila("Total personas", `${datos.totalPersonas}`)}
    </table>

    <h3 style="margin:24px 0 8px 0;font-size:13px;font-weight:600;color:#78716c;text-transform:uppercase;letter-spacing:0.05em;">
      Distribución por cabaña
    </h3>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      ${distribucionHtml}
    </table>

    <h3 style="margin:24px 0 8px 0;font-size:13px;font-weight:600;color:#78716c;text-transform:uppercase;letter-spacing:0.05em;">
      Precio
    </h3>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      ${htmlFila(`Tarifa base (${datos.totalPersonas} × $50.000)`, formatCOP(tarifaBase))}
      ${datos.aplicaDescuento
        ? htmlFila(`<span style="color:#16a34a;">🎉 Descuento 25% (grupo > 10)</span>`, `<span style="color:#16a34a;">− ${formatCOP(datos.descuento)}</span>`)
        : ""}
      <tr>
        <td style="padding:12px 0;font-size:15px;color:#1c1917;font-weight:700;border-top:2px solid #1c1917;">Total estimado</td>
        <td style="padding:12px 0;font-size:18px;color:#1c1917;text-align:right;font-weight:700;border-top:2px solid #1c1917;">${formatCOP(datos.precioTotal)}</td>
      </tr>
    </table>

    ${datos.observaciones ? `
      <h3 style="margin:24px 0 8px 0;font-size:13px;font-weight:600;color:#78716c;text-transform:uppercase;letter-spacing:0.05em;">
        Observaciones
      </h3>
      <p style="margin:0;font-size:14px;color:#44403c;line-height:1.6;">${datos.observaciones}</p>
    ` : ""}

    <div style="margin:32px 0 16px 0;padding:16px;background-color:#fef3c7;border-left:4px solid #f59e0b;border-radius:6px;">
      <p style="margin:0;font-size:14px;color:#78350f;line-height:1.6;">
        <strong>⏱️ Importante:</strong> Tu solicitud queda bloqueada por 4 horas. Si no coordinas el pago en ese tiempo, la fecha volverá a estar disponible.
      </p>
    </div>

    ${linkAdmin ? `
      <p style="margin:24px 0 8px 0;font-size:14px;color:#44403c;line-height:1.6;">
        ¿Tienes preguntas? Escríbenos por WhatsApp:
      </p>
      ${htmlBoton(linkAdmin, "💬 Escribir al administrador", "#16a34a")}
    ` : ""}
  `

  try {
    await resend.emails.send({
      from:    getRemitente(),
      to:      datos.email,
      subject: `Tu solicitud de pasadía — ${formatearFecha(datos.fecha)}`,
      html:    htmlLayout({
        preview: `Pasadía para ${datos.totalPersonas} personas el ${formatearFecha(datos.fecha)}`,
        titulo:  "Solicitud de pasadía recibida",
        body,
      }),
    })
    console.info(`[Email] Confirmación de pasadía enviada a ${datos.email}`)
  } catch (err) {
    console.error("[Email] Error al enviar correo al cliente (pasadía):", err)
  }
}

// ─────────────────────────────────────────────
// 4. Admin — notificación de PASADÍA con copy WhatsApp
// ─────────────────────────────────────────────

export async function notificarAdminPasadiaEmail(datos: DatosPasadia): Promise<void> {
  const resend = getResendClient()
  if (!resend) return

  const adminEmail = getAdminEmail()
  if (!adminEmail) return

  const mensajeWa = buildMensajeWhatsAppPasadia(datos)
  const linkWa    = buildWaLink(datos.telefono, mensajeWa)

  const distribucionHtml = datos.cabanas
    .map((c) => htmlFila(CABANA_LABEL[c], `${datos.personasPorCabana[c]} persona(s)`))
    .join("")

  const tarifaBase = datos.totalPersonas * 50_000

  const body = `
    <div style="display:inline-block;padding:6px 12px;background-color:#fef3c7;color:#78350f;border-radius:999px;font-size:12px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;margin-bottom:16px;">
      ☀️ Nuevo pasadía pendiente
    </div>

    <h2 style="margin:0 0 8px 0;font-family:Georgia,'Times New Roman',serif;font-size:24px;color:#1c1917;">
      ${datos.nombre}
    </h2>
    <p style="margin:0 0 24px 0;font-size:15px;color:#44403c;">
      ${datos.totalPersonas} persona(s) · ${formatearFecha(datos.fecha)} · ${datos.cabanas.map((c) => CABANA_LABEL[c]).join(", ")}
    </p>

    <!-- BLOQUE PRINCIPAL: Botón WhatsApp -->
    <div style="margin:0 0 24px 0;padding:20px;background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;text-align:center;">
      <p style="margin:0 0 12px 0;font-size:14px;color:#166534;font-weight:600;">
        Contactar al cliente con mensaje pre-escrito
      </p>
      ${htmlBoton(linkWa, "💬 Abrir WhatsApp con mensaje listo", "#16a34a")}
      <p style="margin:8px 0 0 0;font-size:12px;color:#15803d;">
        El mensaje ya viene redactado — solo presiona Enviar
      </p>
    </div>

    <h3 style="margin:24px 0 8px 0;font-size:13px;font-weight:600;color:#78716c;text-transform:uppercase;letter-spacing:0.05em;">
      Datos del cliente
    </h3>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      ${htmlFila("Nombre", datos.nombre)}
      ${htmlFila("Teléfono", `<a href="tel:${datos.telefono}" style="color:#1c1917;text-decoration:none;">${datos.telefono}</a>`)}
      ${htmlFila("Email", `<a href="mailto:${datos.email}" style="color:#1c1917;text-decoration:none;">${datos.email}</a>`)}
    </table>

    <h3 style="margin:24px 0 8px 0;font-size:13px;font-weight:600;color:#78716c;text-transform:uppercase;letter-spacing:0.05em;">
      Distribución por cabaña
    </h3>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      ${htmlFila("Fecha", formatearFecha(datos.fecha))}
      ${htmlFila("Horario", "10:00 a.m. – 6:00 p.m.")}
      ${distribucionHtml}
      ${htmlFila("<strong>Total personas</strong>", `<strong>${datos.totalPersonas}</strong>`)}
    </table>

    <h3 style="margin:24px 0 8px 0;font-size:13px;font-weight:600;color:#78716c;text-transform:uppercase;letter-spacing:0.05em;">
      Precio
    </h3>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      ${htmlFila(`Tarifa base (${datos.totalPersonas} × $50.000)`, formatCOP(tarifaBase))}
      ${datos.aplicaDescuento
        ? htmlFila(`<span style="color:#16a34a;">🎉 Descuento 25% (grupo > 10)</span>`, `<span style="color:#16a34a;">− ${formatCOP(datos.descuento)}</span>`)
        : ""}
      <tr>
        <td style="padding:12px 0;font-size:15px;color:#1c1917;font-weight:700;border-top:2px solid #1c1917;">Total estimado</td>
        <td style="padding:12px 0;font-size:18px;color:#1c1917;text-align:right;font-weight:700;border-top:2px solid #1c1917;">${formatCOP(datos.precioTotal)}</td>
      </tr>
    </table>

    ${datos.observaciones ? `
      <h3 style="margin:24px 0 8px 0;font-size:13px;font-weight:600;color:#78716c;text-transform:uppercase;letter-spacing:0.05em;">
        Observaciones
      </h3>
      <p style="margin:0;padding:12px;background-color:#fafaf9;border-radius:6px;font-size:14px;color:#44403c;line-height:1.6;">${datos.observaciones}</p>
    ` : ""}

    <h3 style="margin:32px 0 8px 0;font-size:13px;font-weight:600;color:#78716c;text-transform:uppercase;letter-spacing:0.05em;">
      Mensaje WhatsApp listo para copiar
    </h3>
    <p style="margin:0 0 8px 0;font-size:13px;color:#78716c;">
      Si el botón no funciona, copia este texto y pégalo en WhatsApp:
    </p>
    <pre style="margin:0;padding:16px;background-color:#fafaf9;border:1px solid #e7e5e4;border-radius:6px;font-family:Menlo,Monaco,Consolas,monospace;font-size:13px;color:#1c1917;white-space:pre-wrap;line-height:1.6;">${mensajeWa.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>

    <p style="margin:24px 0 0 0;padding-top:16px;border-top:1px solid #e7e5e4;font-size:12px;color:#78716c;line-height:1.5;">
      ⏱️ Bloqueo automático: 4 horas. Si no se confirma el pago en ese tiempo, el pasadía se cancela y la fecha se libera.
    </p>
  `

  try {
    await resend.emails.send({
      from:    getRemitente(),
      to:      adminEmail,
      replyTo: datos.email,
      subject: `☀️ Nuevo pasadía — ${datos.nombre} — ${datos.totalPersonas} pax — ${formatearFecha(datos.fecha)}`,
      html:    htmlLayout({
        preview: `${datos.nombre} solicitó pasadía para ${datos.totalPersonas} personas el ${formatearFecha(datos.fecha)}`,
        titulo:  "Nuevo pasadía pendiente",
        body,
      }),
    })
    console.info(`[Email] Notificación de pasadía enviada al admin (${adminEmail})`)
  } catch (err) {
    console.error("[Email] Error al enviar correo al admin (pasadía):", err)
  }
}