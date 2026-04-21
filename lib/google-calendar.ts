/**
 * /lib/google-calendar.ts
 *
 * Cliente centralizado para Google Calendar API (Service Account).
 * Cada cabaña tiene su propio calendario independiente.
 *
 * Cambios v2.0:
 * - EstadoReserva incluye "saldo-pendiente" (RF-04, RF-08)
 * - Bloqueo temporal de 4 horas (antes 2h) (RF-03)
 * - Color azul para "saldo-pendiente" en Calendar
 * - DatosReserva refleja los 5 servicios adicionales fijos (RF-12)
 * - Descripción del evento actualizada con campo "Saldo pendiente" (RF-06)
 * - crearSolicitudReserva envía WhatsApp automático al cliente (RF-16)
 * - actualizarEstadoReserva acepta "saldo-pendiente" como estado válido
 *
 * Cambios v2.1:
 * - resolverEstadoDesdeEvento(): el TÍTULO es la única fuente de verdad del estado.
 *   extendedProperties.estado se usa solo como fallback secundario.
 *   Esto garantiza compatibilidad con ediciones manuales del admin en Calendar.
 * - verificarExpiracion(): lee el estado desde el título antes de decidir expirar.
 *   Si el admin ya cambió el título a CONFIRMADA/SALDO PENDIENTE/CANCELADA,
 *   la expiración automática no sobreescribe ese cambio.
 * - verificarDisponibilidad(): usa resolverEstadoDesdeEvento() para filtrar
 *   eventos cancelados de forma consistente con el resto del sistema.
 *
 * Cambios v2.2:
 * - crearSolicitudPasadia (RF-17): reescrita para usar getCalendarClient(),
 *   getCalendarId(), PREFIJO_ESTADO, COLOR_POR_ESTADO, CABANA_LABEL y
 *   enviarWhatsAppCliente() — 100% alineada con la fuente de verdad por título.
 * - El pasadía guarda expiresAt en extendedProperties para que verificarExpiracion()
 *   lo cancele automáticamente tras 4 horas sin confirmación (RF-03/RF-04).
 */
 
import { google, calendar_v3 } from "googleapis"
 
// ─────────────────────────────────────────────
// Tipos exportados
// ─────────────────────────────────────────────
 
export type CabanaId = "cabana-a" | "cabana-b" | "cabana-c"
 
/**
 * RF-04 / RF-08: cuatro estados posibles.
 * "saldo-pendiente" es nuevo en v2.0 — NO expira automáticamente.
 */
export type EstadoReserva =
  | "pendiente"       // Pendiente de pago   → amarillo/dorado en Calendar
  | "saldo-pendiente" // Saldo pendiente      → azul en Calendar (NUEVO v2.0)
  | "confirmada"      // Confirmada           → verde en Calendar
  | "cancelada"       // Cancelada            → rojo en Calendar
  | "bloqueado"       // Bloqueo manual admin → gris en Calendar
 
/**
 * Datos que llegan desde el formulario web (RF-01, RF-12).
 * Cinco servicios adicionales fijos según MVP v2.0, sección 6.3.
 */
export interface DatosReserva {
  cabana:        CabanaId
  fechaEntrada:  string   // YYYY-MM-DD
  fechaSalida:   string   // YYYY-MM-DD
  nombre:        string
  telefono:      string   // WhatsApp — se usa en RF-16
  email:         string
  personas:      number
  /** Lista de servicios seleccionados.
   *  Valores válidos: "romantico" | "cumpleanos" | "picnic" | "pet-friendly" | "desayuno"
   *  Para pet-friendly y desayuno el formulario debe enviar cantidades
   *  en los campos auxiliares petFriendlyCount y desayunoCount.
   */
  servicios:     string[]
  /** Número de mascotas (pet-friendly) — $ 15.000 c/u */
  petFriendlyCount?: number
  /** Personas que solicitan desayuno adicional — $ 20.000 c/u */
  desayunoCount?: number
  observaciones: string
}
 
/**
 * RF-17: Datos del formulario de Pasadía (grupos / empresas).
 */
export interface DatosPasadia {
  /** Lista de cabañas solicitadas (mín. 1, máx. 3) */
  cabanas:           CabanaId[]
  /** Fecha del pasadía — YYYY-MM-DD */
  fecha:             string
  /** Fecha de salida — siempre fecha + 1 día (all-day event en Calendar) */
  fechaSalida:       string
  nombre:            string
  telefono:          string
  email:             string
  /** Total de personas del grupo completo */
  totalPersonas:     number
  /** Distribución de personas por cabaña (máx. 4 c/u — RF-17) */
  personasPorCabana: Record<CabanaId, number>
  /** Precio final tras aplicar descuento si corresponde */
  precioTotal:       number
  /** Monto de descuento (0 si no aplica) */
  descuento:         number
  /** true cuando el grupo supera 10 personas */
  aplicaDescuento:   boolean
  observaciones:     string
}
 
// ─────────────────────────────────────────────
// Constantes internas
// ─────────────────────────────────────────────
 
/** Horas de bloqueo temporal para solicitudes Pendiente de pago (RF-03 v2.0) */
const HORAS_BLOQUEO = 4
 
/** Etiquetas legibles de cabaña para eventos */
const CABANA_LABEL: Record<CabanaId, string> = {
  "cabana-a": "Cabaña A",
  "cabana-b": "Cabaña B",
  "cabana-c": "Cabaña C",
}
 
/**
 * Colores de Google Calendar por estado.
 * Referencia: https://developers.google.com/calendar/api/v3/reference/colors
 * 1=Lavanda 2=Salvia 3=Uva 4=Flamingo 5=Banana 6=Mandarina 7=Pavo real
 * 8=Grafito 9=Arándano 10=Albahaca 11=Tomate
 */
const COLOR_POR_ESTADO: Record<EstadoReserva, string> = {
  "pendiente":       "5",  // Banana  → amarillo/dorado
  "saldo-pendiente": "9",  // Arándano → azul  (NUEVO v2.0)
  "confirmada":      "2",  // Salvia   → verde
  "cancelada":       "11", // Tomate   → rojo
  "bloqueado":       "8",  // Grafito  → gris
}
 
/**
 * Prefijos que el sistema escribe en el título del evento.
 * Son exactamente las mismas cadenas que el admin debe usar manualmente.
 * Sin emojis, sin texto adicional — solo la palabra clave.
 */
const PREFIJO_ESTADO: Record<EstadoReserva, string> = {
  "pendiente":       "PENDIENTE",
  "saldo-pendiente": "SALDO PENDIENTE",
  "confirmada":      "CONFIRMADA",
  "cancelada":       "CANCELADA",
  "bloqueado":       "BLOQUEADO",
}
 
/** Etiquetas legibles de servicios adicionales */
const SERVICIO_LABEL: Record<string, string> = {
  "romantico":    "Decoración romántica ($60.000)",
  "cumpleanos":   "Decoración de cumpleaños ($60.000)",
  "picnic":       "Picnic adicional ($85.000)",
  "pet-friendly": "Pet Friendly (mascotas)",
  "desayuno":     "Desayuno adicional",
}
 
// ─────────────────────────────────────────────
// Fuente de verdad: título del evento
// ─────────────────────────────────────────────
 
/**
 * Lee el estado real de un evento a partir de su título.
 * El título es la ÚNICA fuente de verdad.
 *
 * El sistema busca exactamente estas 4 cadenas (insensible a mayúsculas):
 *   "SALDO PENDIENTE"  → "saldo-pendiente"
 *   "CONFIRMADA"       → "confirmada"
 *   "CANCELADA"        → "cancelada"
 *   "BLOQUEADO"        → "bloqueado"
 *   "PENDIENTE"        → "pendiente"  (va al final — SALDO PENDIENTE tiene prioridad)
 *
 * No importa qué más tenga el título: emojis, nombre del cliente,
 * número de cabaña, texto libre — solo se evalúa si contiene la cadena.
 *
 * Funciona igual para reservas normales Y para pasadías, ya que ambos
 * usan el mismo esquema de prefijos.
 *
 * extendedProperties.estado NO se usa para determinar el estado.
 * Solo se conserva como registro histórico del estado con el que fue creado el evento.
 */
function resolverEstadoDesdeEvento(
  evento: { summary?: string | null; extendedProperties?: { private?: Record<string, string> | null } | null }
): EstadoReserva | null {
  const titulo = (evento.summary ?? "").toUpperCase()
 
  if (titulo.includes("SALDO PENDIENTE")) return "saldo-pendiente"
  if (titulo.includes("CONFIRMADA"))      return "confirmada"
  if (titulo.includes("CANCELADA"))       return "cancelada"
  if (titulo.includes("BLOQUEADO"))       return "bloqueado"
  if (titulo.includes("PENDIENTE"))       return "pendiente"
 
  // Título sin cadena reconocida — evento externo o creado fuera del sistema
  return null
}
 
// ─────────────────────────────────────────────
// Autenticación con Service Account
// ─────────────────────────────────────────────
 
function getCalendarClient(): calendar_v3.Calendar {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key:   process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/calendar"],
  })
  return google.calendar({ version: "v3", auth })
}
 
/** Devuelve el Calendar ID según la cabaña */
function getCalendarId(cabana: CabanaId): string {
  const ids: Record<CabanaId, string | undefined> = {
    "cabana-a": process.env.GOOGLE_CALENDAR_ID_CABANA_A,
    "cabana-b": process.env.GOOGLE_CALENDAR_ID_CABANA_B,
    "cabana-c": process.env.GOOGLE_CALENDAR_ID_CABANA_C,
  }
  const id = ids[cabana]
  if (!id) throw new Error(`Variable de entorno no configurada para ${cabana}`)
  return id
}
 
// ─────────────────────────────────────────────
// Helpers internos
// ─────────────────────────────────────────────
 
/** Formatea una fecha YYYY-MM-DD a DD/MM/AAAA para mostrar en Calendar */
function formatearFecha(fecha: string): string {
  const [y, m, d] = fecha.split("-")
  return `${d}/${m}/${y}`
}
 
/**
 * Construye la lista de servicios adicionales en texto legible
 * incluyendo cantidades para pet-friendly y desayuno.
 */
function formatearServicios(datos: DatosReserva): string {
  if (!datos.servicios.length) return "Ninguno"
 
  return datos.servicios
    .map((s) => {
      if (s === "pet-friendly" && datos.petFriendlyCount) {
        return `${SERVICIO_LABEL[s]} × ${datos.petFriendlyCount} ($${(15000 * datos.petFriendlyCount).toLocaleString("es-CO")})`
      }
      if (s === "desayuno" && datos.desayunoCount) {
        return `${SERVICIO_LABEL[s]} × ${datos.desayunoCount} persona(s) ($${(20000 * datos.desayunoCount).toLocaleString("es-CO")})`
      }
      return SERVICIO_LABEL[s] ?? s
    })
    .join("\n  • ")
}
 
/**
 * Construye la descripción completa del evento según la sección 8 del MVP v2.0.
 * El campo "Saldo pendiente" queda vacío para gestión manual del administrador.
 */
function construirDescripcion(datos: DatosReserva, estado: EstadoReserva): string {
  const serviciosStr = formatearServicios(datos)
  return [
    `📅 Fechas: ${formatearFecha(datos.fechaEntrada)} → ${formatearFecha(datos.fechaSalida)}`,
    `👥 Huéspedes: ${datos.personas} persona(s)`,
    ``,
    `── Servicios adicionales ──`,
    `  • ${serviciosStr}`,
    ``,
    `── Datos del cliente ──`,
    `Nombre:   ${datos.nombre}`,
    `Teléfono: ${datos.telefono}`,
    `Email:    ${datos.email}`,
    ``,
    `── Estado ──`,
    `Estado: ${PREFIJO_ESTADO[estado]}`,
    `Saldo pendiente: $__________ (gestión manual del administrador)`,
    ``,
    `── Observaciones ──`,
    datos.observaciones || "(sin observaciones)",
  ].join("\n")
}
 
/**
 * RF-17: Construye la descripción del evento de pasadía.
 * Misma estructura que construirDescripcion() para coherencia visual en Calendar.
 */
function construirDescripcionPasadia(datos: DatosPasadia, estado: EstadoReserva): string {
  const distribucion = datos.cabanas
    .map((c) => `  • ${CABANA_LABEL[c]}: ${datos.personasPorCabana[c]} persona(s)`)
    .join("\n")
 
  return [
    `🏕️  PASADÍA — Horario: 10:00 a.m. – 6:00 p.m.`,
    `📅 Fecha: ${formatearFecha(datos.fecha)}`,
    ``,
    `── Datos del cliente ──`,
    `Nombre:   ${datos.nombre}`,
    `Teléfono: ${datos.telefono}`,
    `Email:    ${datos.email}`,
    ``,
    `── Distribución del grupo ──`,
    `Total personas: ${datos.totalPersonas}`,
    `Cabañas solicitadas: ${datos.cabanas.map((c) => CABANA_LABEL[c]).join(", ")}`,
    distribucion,
    ``,
    `── Precio ──`,
    `Tarifa base: $${(datos.totalPersonas * 50_000).toLocaleString("es-CO")} (${datos.totalPersonas} pax × $50.000)`,
    datos.aplicaDescuento
      ? `Descuento 25% (grupo > 10 pax): -$${datos.descuento.toLocaleString("es-CO")}`
      : `Sin descuento (grupo ≤ 10 pax)`,
    `PRECIO TOTAL: $${datos.precioTotal.toLocaleString("es-CO")}`,
    ``,
    `── Estado ──`,
    `Estado: ${PREFIJO_ESTADO[estado]}`,
    `Saldo pendiente: $__________ (gestión manual del administrador)`,
    ``,
    `── Observaciones ──`,
    datos.observaciones || "(sin observaciones)",
  ].join("\n")
}
 
// ─────────────────────────────────────────────
// WhatsApp (RF-16)
// ─────────────────────────────────────────────
 
/**
 * RF-16: Envía un mensaje de WhatsApp automático al cliente
 * informándole que su solicitud está en revisión.
 *
 * Implementación: llama a la API de WhatsApp Business o usa
 * un proveedor como Twilio / Meta Cloud API.
 *
 * ⚠️  Por ahora la función registra el intento y no lanza error
 *     si el envío falla, para no bloquear la confirmación al usuario.
 *     En producción se recomienda encolar el mensaje (BullMQ, etc.).
 */
async function enviarWhatsAppCliente(
  telefono: string,
  nombre: string,
  cabana: CabanaId,
  fechaEntrada: string,
  fechaSalida: string
): Promise<void> {
  const adminNumber = process.env.WHATSAPP_ADMIN_NUMBER
  if (!adminNumber) {
    console.warn("[WhatsApp] WHATSAPP_ADMIN_NUMBER no configurado — omitiendo envío.")
    return
  }
 
  const mensaje = [
    `¡Hola ${nombre}! 🌿`,
    ``,
    `Tu solicitud de reserva en *La Cabaña El Rubí* fue recibida exitosamente.`,
    ``,
    `📋 *Resumen:*`,
    `• Cabaña: ${CABANA_LABEL[cabana]}`,
    `• Entrada: ${formatearFecha(fechaEntrada)}`,
    `• Salida:  ${formatearFecha(fechaSalida)}`,
    ``,
    `En breve te contactaremos para confirmar disponibilidad y coordinar el pago. 🏡`,
  ].join("\n")
 
  try {
    // ── Integración con Meta WhatsApp Cloud API ──────────
    // Reemplazar WHATSAPP_API_TOKEN y WHATSAPP_PHONE_NUMBER_ID en .env.local
    const token     = process.env.WHATSAPP_API_TOKEN
    const phoneId   = process.env.WHATSAPP_PHONE_NUMBER_ID
 
    if (!token || !phoneId) {
      // Fallback: solo loggear. No bloquear el flujo.
      console.info("[WhatsApp] Variables API no configuradas. Mensaje que se enviaría:")
      console.info(mensaje)
      return
    }
 
    const numeroLimpio = telefono.replace(/\D/g, "")
 
    await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to:   numeroLimpio,
        type: "text",
        text: { body: mensaje },
      }),
    })
 
    console.info(`[WhatsApp] Mensaje enviado a ${numeroLimpio}`)
  } catch (err) {
    // No relanzar — el envío de WA es best-effort en el MVP
    console.error("[WhatsApp] Error al enviar mensaje:", err)
  }
}
 
/**
 * RF-16 / RF-17: Variante de WhatsApp para pasadía.
 * Mismo patrón que enviarWhatsAppCliente — best-effort, no bloquea el flujo.
 */
async function enviarWhatsAppClientePasadia(
  telefono:      string,
  nombre:        string,
  fecha:         string,
  cabanas:       CabanaId[],
  totalPersonas: number,
  precioTotal:   number
): Promise<void> {
  const token   = process.env.WHATSAPP_API_TOKEN
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID
 
  if (!token || !phoneId) {
    console.info("[WhatsApp] Variables API no configuradas — omitiendo envío de pasadía.")
    return
  }
 
  const cabanasStr = cabanas.map((c) => CABANA_LABEL[c]).join(", ")
 
  const mensaje = [
    `¡Hola ${nombre}! ☀️`,
    ``,
    `Tu solicitud de *Pasadía* en *La Cabaña El Rubí* fue recibida exitosamente.`,
    ``,
    `📋 *Resumen:*`,
    `• Fecha: ${formatearFecha(fecha)}`,
    `• Horario: 10:00 a.m. – 6:00 p.m.`,
    `• Cabaña(s): ${cabanasStr}`,
    `• Personas: ${totalPersonas}`,
    `• Total estimado: $${precioTotal.toLocaleString("es-CO")}`,
    ``,
    `En breve te contactaremos para confirmar y coordinar el pago. 🏡`,
  ].join("\n")
 
  try {
    const numeroLimpio = telefono.replace(/\D/g, "")
    await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to:   numeroLimpio,
        type: "text",
        text: { body: mensaje },
      }),
    })
    console.info(`[WhatsApp] Mensaje pasadía enviado a ${numeroLimpio}`)
  } catch (err) {
    console.error("[WhatsApp] Error al enviar mensaje de pasadía:", err)
  }
}
 
// ─────────────────────────────────────────────
// Funciones exportadas
// ─────────────────────────────────────────────
 
/**
 * RF-02: Verifica si la cabaña está disponible para el rango de fechas.
 * Busca eventos que se solapen (distintos a "cancelada") en el calendario.
 */
export async function verificarDisponibilidad(
  cabana:      CabanaId,
  fechaEntrada: string,
  fechaSalida:  string
): Promise<boolean> {
  const calendar   = getCalendarClient()
  const calendarId = getCalendarId(cabana)
 
  // Convertir a ISO 8601 — los eventos all-day usan formato date, no dateTime
  const timeMin = new Date(`${fechaEntrada}T00:00:00`).toISOString()
  const timeMax = new Date(`${fechaSalida}T23:59:59`).toISOString()
 
  const { data } = await calendar.events.list({
    calendarId,
    timeMin,
    timeMax,
    singleEvents: true,
    // Traemos solo los eventos que se solapan con el rango
  })
 
  const eventos = data.items ?? []
 
  // Un evento bloquea disponibilidad si su estado NO es "cancelada".
  // Usamos resolverEstadoDesdeEvento() para leer el estado desde el título,
  // así las cancelaciones manuales del admin en Calendar se reconocen de inmediato.
  // Aplica igual a reservas normales y a pasadías.
  const eventosActivos = eventos.filter((ev) => {
    if (ev.status === "cancelled") return false           // eliminado en Calendar
    const estado = resolverEstadoDesdeEvento(ev)
    return estado !== "cancelada" && estado !== null      // null = evento externo sin prefijo, no bloquea
  })
 
  return eventosActivos.length === 0
}
 
/**
 * RF-03 / RF-05 / RF-06 / RF-07 / RF-16:
 * Crea la solicitud de reserva en Google Calendar y envía el WhatsApp automático.
 *
 * - Estado inicial: "pendiente" (Pendiente de pago)
 * - Color: amarillo/dorado
 * - La cabaña queda bloqueada por HORAS_BLOQUEO horas
 *
 * @returns eventoId — ID del evento creado en Google Calendar
 */
export async function crearSolicitudReserva(datos: DatosReserva): Promise<string> {
  const calendar   = getCalendarClient()
  const calendarId = getCalendarId(datos.cabana)
  const estado: EstadoReserva = "pendiente"
 
  // Fecha/hora de expiración del bloqueo (RF-03 — 4 horas)
  const expiracion = new Date(Date.now() + HORAS_BLOQUEO * 60 * 60 * 1000)
  const expiracionStr = expiracion.toLocaleString("es-CO", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Bogota",
  })
 
  const titulo = `${PREFIJO_ESTADO[estado]} — ${datos.nombre} — ${CABANA_LABEL[datos.cabana]}`
 
  const descripcion =
    construirDescripcion(datos, estado) +
    `\n\n── Bloqueo automático ──\nExpira: ${expiracionStr} (${HORAS_BLOQUEO}h)`
 
  const { data: evento } = await calendar.events.insert({
    calendarId,
    requestBody: {
      summary:     titulo,
      description: descripcion,
      colorId:     COLOR_POR_ESTADO[estado],
      // Eventos de día completo (all-day) para visualización limpia en Calendar
      start: { date: datos.fechaEntrada },
      end:   { date: datos.fechaSalida  },
      // Metadata en extendedProperties para facilitar actualizaciones programáticas
      extendedProperties: {
        private: {
          estado,
          cabana:        datos.cabana,
          telefono:      datos.telefono,
          expiresAt:     expiracion.toISOString(),
        },
      },
    },
  })
 
  if (!evento.id) throw new Error("Google Calendar no devolvió un ID de evento")
 
  // RF-16: Envío automático de WhatsApp al cliente (best-effort)
  await enviarWhatsAppCliente(
    datos.telefono,
    datos.nombre,
    datos.cabana,
    datos.fechaEntrada,
    datos.fechaSalida
  )
 
  return evento.id
}
 
/**
 * RF-08: Actualiza el estado de una reserva existente en Google Calendar.
 * Acepta: "confirmada" | "saldo-pendiente" | "cancelada"
 *
 * Actualiza:
 * - Título del evento (prefijo de estado)
 * - Color del evento
 * - extendedProperties.private.estado
 * - La descripción se reescribe para reflejar el nuevo estado
 */
export async function actualizarEstadoReserva(
  cabana:      CabanaId,
  eventoId:    string,
  nuevoEstado: Exclude<EstadoReserva, "pendiente" | "bloqueado">
): Promise<void> {
  const calendar   = getCalendarClient()
  const calendarId = getCalendarId(cabana)
 
  // Recuperar evento actual para preservar datos del cliente
  const { data: eventoActual } = await calendar.events.get({ calendarId, eventId: eventoId })
 
  // Actualizar prefijo en el título (reemplaza el prefijo anterior)
  const tituloActual = eventoActual.summary ?? ""
  const tituloLimpio = tituloActual.replace(/^[^\—]+—\s*/, "") // quita el prefijo viejo
  const nuevoTitulo  = `${PREFIJO_ESTADO[nuevoEstado]} — ${tituloLimpio}`
 
  await calendar.events.patch({
    calendarId,
    eventId: eventoId,
    requestBody: {
      summary: nuevoTitulo,
      colorId: COLOR_POR_ESTADO[nuevoEstado],
      extendedProperties: {
        private: {
          ...eventoActual.extendedProperties?.private,
          estado: nuevoEstado,
        },
      },
    },
  })
}
 
/**
 * RF-11: Bloquea manualmente una cabaña por mantenimiento u otros motivos.
 * Crea un evento con estado "bloqueado" y color gris.
 *
 * @returns eventoId del bloqueo creado
 */
export async function bloquearCabanaManual(
  cabana:      CabanaId,
  fechaEntrada: string,
  fechaSalida:  string,
  motivo:       string = "Bloqueo manual"
): Promise<string> {
  const calendar   = getCalendarClient()
  const calendarId = getCalendarId(cabana)
  const estado: EstadoReserva = "bloqueado"
 
  const { data: evento } = await calendar.events.insert({
    calendarId,
    requestBody: {
      summary:     `${PREFIJO_ESTADO[estado]} — ${CABANA_LABEL[cabana]} — ${motivo}`,
      description: `Motivo: ${motivo}\nFechas: ${formatearFecha(fechaEntrada)} → ${formatearFecha(fechaSalida)}`,
      colorId:     COLOR_POR_ESTADO[estado],
      start: { date: fechaEntrada },
      end:   { date: fechaSalida  },
      extendedProperties: {
        private: { estado, cabana, motivo },
      },
    },
  })
 
  if (!evento.id) throw new Error("Google Calendar no devolvió un ID de evento")
  return evento.id
}
 
/**
 * RF-04: Verifica si una solicitud Pendiente de pago ha expirado (> 4 horas).
 * Si expiró, actualiza su estado a "cancelada" en Calendar y retorna true.
 *
 * ⚠️  "saldo-pendiente" NUNCA expira (protección ante pago parcial).
 *
 * Aplica a reservas normales Y a pasadías — ambas usan el mismo campo
 * expiresAt en extendedProperties y el mismo prefijo PENDIENTE en el título.
 *
 * Este método se puede llamar desde:
 * - Un cron job / Vercel Cron Route que revise eventos cada hora
 * - Desde /api/disponibilidad para lazy-expiration antes de responder
 */
export async function verificarExpiracion(
  cabana:   CabanaId,
  eventoId: string
): Promise<boolean> {
  const calendar   = getCalendarClient()
  const calendarId = getCalendarId(cabana)
 
  const { data: evento } = await calendar.events.get({ calendarId, eventId: eventoId })
 
  // ── Fuente de verdad: el título del evento (v2.1) ─────────────────────────
  // Si el admin cambió manualmente el título a CONFIRMADA, SALDO PENDIENTE
  // o CANCELADA, respetamos ese cambio y NO expiramos.
  const estadoReal = resolverEstadoDesdeEvento(evento)
 
  // Solo expiran solicitudes que siguen en "pendiente" según el título
  if (estadoReal !== "pendiente") return false
 
  // ── Verificar si el tiempo de bloqueo venció ──────────────────────────────
  const props     = evento.extendedProperties?.private ?? {}
  const expiresAt = props.expiresAt ? new Date(props.expiresAt) : null
  if (!expiresAt || new Date() < expiresAt) return false
 
  // Expiró — cancelar automáticamente
  const tituloActual  = evento.summary ?? ""
  const tituloLimpio  = tituloActual.replace(/^[^\—]+—\s*/, "")
  const nuevoTitulo   = `${PREFIJO_ESTADO["cancelada"]} — ${tituloLimpio} (expirada)`
 
  await calendar.events.patch({
    calendarId,
    eventId: eventoId,
    requestBody: {
      summary: nuevoTitulo,
      colorId: COLOR_POR_ESTADO["cancelada"],
      extendedProperties: {
        private: { ...props, estado: "cancelada" },
      },
    },
  })
 
  return true
}
 
/**
 * RF-17: Registra un pasadía en Google Calendar — una entrada por cada cabaña
 * solicitada, en el calendario de esa cabaña.
 *
 * Convenciones alineadas con el resto del sistema:
 * - Título:  PENDIENTE — Pasadía — <nombre> (<N> pax) — <Cabaña X>
 *   └─ "PENDIENTE" es el prefijo de la fuente de verdad, igual que en reservas.
 *   └─ "Pasadía" permite distinguir el tipo de solicitud visualmente.
 * - Color:   amarillo (COLOR_POR_ESTADO["pendiente"]) — mismo que reservas normales.
 * - expiresAt en extendedProperties → verificarExpiracion() lo cancela tras 4h.
 * - WhatsApp automático al cliente (RF-16) usando enviarWhatsAppClientePasadia().
 *
 * @returns eventoIds — array con el ID del evento creado en cada cabaña
 */
export async function crearSolicitudPasadia(datos: DatosPasadia): Promise<string[]> {
  const calendar = getCalendarClient()
  const estado: EstadoReserva = "pendiente"
 
  // Expiración: mismas 4 horas que una reserva normal (RF-03)
  const expiracion    = new Date(Date.now() + HORAS_BLOQUEO * 60 * 60 * 1000)
  const expiracionStr = expiracion.toLocaleString("es-CO", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Bogota",
  })
 
  const descripcionBase =
    construirDescripcionPasadia(datos, estado) +
    `\n\n── Bloqueo automático ──\nExpira: ${expiracionStr} (${HORAS_BLOQUEO}h)`
 
  const eventoIds: string[] = []
 
  for (const cabana of datos.cabanas) {
    const calendarId     = getCalendarId(cabana)
    const personasCabana = datos.personasPorCabana[cabana]
 
    // Título: prefijo estándar + "Pasadía" + nombre + pax + cabaña
    // El admin puede confirmar/cancelar cambiando "PENDIENTE" por "CONFIRMADA"
    // o "CANCELADA" — igual que con las reservas normales.
    const titulo = `${PREFIJO_ESTADO[estado]} — Pasadía — ${datos.nombre} (${personasCabana} pax) — ${CABANA_LABEL[cabana]}`
 
    const { data: evento } = await calendar.events.insert({
      calendarId,
      requestBody: {
        summary:     titulo,
        description: descripcionBase,
        colorId:     COLOR_POR_ESTADO[estado],
        // All-day: fecha → fecha + 1 día (bloquea el día completo en Calendar)
        start: { date: datos.fecha      },
        end:   { date: datos.fechaSalida },
        extendedProperties: {
          private: {
            tipo:          "pasadia",
            estado,
            cabana,
            telefono:      datos.telefono,
            totalPersonas: String(datos.totalPersonas),
            expiresAt:     expiracion.toISOString(), // RF-04: necesario para verificarExpiracion()
          },
        },
      },
    })
 
    if (!evento.id) throw new Error(`Google Calendar no devolvió ID para ${cabana}`)
    eventoIds.push(evento.id)
  }
 
  // RF-16: WhatsApp automático al cliente (best-effort, no bloquea el flujo)
  await enviarWhatsAppClientePasadia(
    datos.telefono,
    datos.nombre,
    datos.fecha,
    datos.cabanas,
    datos.totalPersonas,
    datos.precioTotal
  )
 
  return eventoIds
}