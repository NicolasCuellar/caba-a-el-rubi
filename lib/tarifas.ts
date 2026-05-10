/**
 * /lib/tarifas.ts
 *
 * Fuente de verdad para todas las tarifas y cálculos de precio
 * de La Cabaña El Rubí — MVP v2.0
 *
 * Exporta:
 *  - Constantes de tarifas (TARIFAS, SERVICIOS_ADICIONALES, PASADIA)
 *  - esFestivoColombiano()    — festivos oficiales CO por año
 *  - esTarifaFinDeSemana()    — vie / sáb / dom / festivo
 *  - calcularNoches()         — diferencia en noches entre dos fechas
 *  - calcularReserva()        — precio total de una reserva de alojamiento
 *  - calcularPasadia()        — precio total de un paquete pasadía
 *  - formatCOP()              — formatea número como moneda colombiana
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. CONSTANTES DE TARIFAS
// ─────────────────────────────────────────────────────────────────────────────

/** Tarifas base de alojamiento por noche */
export const TARIFAS = {
  /** 1 persona sola — mismo precio entre semana y fin de semana */
  PERSONA_SOLA: 100_000,

  /** Pareja (2 personas) entre semana (lun–jue sin festivos) */
  PAREJA_SEMANA: 180_000,

  /** Pareja (2 personas) fin de semana / festivo */
  PAREJA_FDS: 210_000,

  /** Persona adicional a partir del 3.er huésped — incluye desayuno */
  ADICIONAL_POR_PERSONA: 70_000,

  /** Descuento por estadía larga: 4+ noches → 25% sobre el total */
  DESCUENTO_ESTADIA_LARGA_PCT: 0.25,
  MINIMO_NOCHES_DESCUENTO: 4,
} as const

/** Servicios adicionales de alojamiento */
export const SERVICIOS_ADICIONALES = {
  romantico:       { label: "Decoración romántica",     precio: 60_000, porUnidad: false },
  cumpleanos:      { label: "Decoración de cumpleaños", precio: 60_000, porUnidad: false },
  picnic:          { label: "Picnic adicional",         precio: 85_000, porUnidad: false },
  "pet-friendly":  { label: "Pet Friendly",             precio: 15_000, porUnidad: true  },
  desayuno:        { label: "Desayuno adicional",       precio: 20_000, porUnidad: true  },
} as const

export type ServicioId = keyof typeof SERVICIOS_ADICIONALES

/** Paquete Pasadía */
export const PASADIA = {
  TARIFA_POR_PERSONA:    50_000,
  MAX_PERSONAS_CABANA:   4,
  UMBRAL_DESCUENTO:      10,   // grupo > 10 personas → descuento
  DESCUENTO_GRUPAL_PCT:  0.25,
  HORA_INICIO:           "10:00 a.m.",
  HORA_FIN:              "6:00 p.m.",
} as const

// ─────────────────────────────────────────────────────────────────────────────
// 2. FESTIVOS COLOMBIA
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Devuelve la lista de festivos oficiales de Colombia para un año dado.
 * Incluye tanto festivos fijos como los de "próximo lunes" (Ley Emiliani).
 * Formato: "YYYY-MM-DD"
 */
export function festivosColombiano(anio: number): Set<string> {
  const festivos: string[] = []

  // ── Festivos de fecha fija ──────────────────────────────────────────────
  const fijos: [number, number][] = [
    [1,  1],   // Año Nuevo
    [5,  1],   // Día del Trabajo
    [7,  20],  // Independencia
    [8,  7],   // Batalla de Boyacá
    [12, 8],   // Inmaculada Concepción
    [12, 25],  // Navidad
  ]
  fijos.forEach(([m, d]) =>
    festivos.push(`${anio}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`)
  )

  // ── Helper: próximo lunes desde una fecha base ──────────────────────────
  function proximoLunes(mes: number, dia: number): string {
    const base = new Date(anio, mes - 1, dia)
    const dow  = base.getDay() // 0=dom, 1=lun, …
    const diff = dow === 1 ? 0 : (8 - dow) % 7
    const lunes = new Date(base)
    lunes.setDate(base.getDate() + diff)
    return lunes.toISOString().split("T")[0]
  }

  // ── Festivos trasladados al próximo lunes (Ley Emiliani) ────────────────
  const emiliani: [number, number][] = [
    [1,  6],   // Reyes Magos
    [3,  19],  // San José
    [6,  29],  // San Pedro y San Pablo
    [8,  15],  // Asunción de la Virgen
    [10, 12],  // Día de la Raza
    [11, 1],   // Todos los Santos
    [11, 11],  // Independencia de Cartagena
  ]
  emiliani.forEach(([m, d]) => festivos.push(proximoLunes(m, d)))

  // ── Festivos móviles basados en Semana Santa (Pascua) ──────────────────
  // Algoritmo de Butcher para calcular el Domingo de Pascua
  function pascua(): Date {
    const a = anio % 19
    const b = Math.floor(anio / 100)
    const c = anio % 100
    const d = Math.floor(b / 4)
    const e = b % 4
    const f = Math.floor((b + 8) / 25)
    const g = Math.floor((b - f + 1) / 3)
    const h = (19 * a + b - d - g + 15) % 30
    const i = Math.floor(c / 4)
    const k = c % 4
    const l = (32 + 2 * e + 2 * i - h - k) % 7
    const m = Math.floor((a + 11 * h + 22 * l) / 451)
    const mes = Math.floor((h + l - 7 * m + 114) / 31)
    const dia = ((h + l - 7 * m + 114) % 31) + 1
    return new Date(anio, mes - 1, dia)
  }

  const domPascua = pascua()

  function addDays(base: Date, days: number): string {
    const d = new Date(base)
    d.setDate(d.getDate() + days)
    return d.toISOString().split("T")[0]
  }

  festivos.push(addDays(domPascua, -3))  // Jueves Santo
  festivos.push(addDays(domPascua, -2))  // Viernes Santo
  festivos.push(addDays(domPascua, 43))  // Ascensión (próximo lunes 39+4)
  festivos.push(addDays(domPascua, 64))  // Corpus Christi (próximo lunes 60+4)
  festivos.push(addDays(domPascua, 71))  // Sagrado Corazón (próximo lunes 67+4)

  return new Set(festivos)
}

// Cache en memoria para no recalcular repetidamente en el mismo proceso
const _cacheFestivos = new Map<number, Set<string>>()

function getFestivos(anio: number): Set<string> {
  if (!_cacheFestivos.has(anio)) {
    _cacheFestivos.set(anio, festivosColombiano(anio))
  }
  return _cacheFestivos.get(anio)!
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. HELPERS DE FECHA
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Determina si una fecha aplica tarifa de fin de semana / festivo.
 * Aplica para: viernes (5), sábado (6), domingo (0), o cualquier festivo CO.
 *
 * @param fecha  string "YYYY-MM-DD"  o  Date
 */
export function esTarifaFinDeSemana(fecha: string | Date): boolean {
  const d   = typeof fecha === "string" ? new Date(`${fecha}T12:00:00`) : fecha
  const dow = d.getDay() // 0=dom, 1=lun, … 6=sáb
  if (dow === 0 || dow === 5 || dow === 6) return true

  const anio    = d.getFullYear()
  const isoDate = d.toISOString().split("T")[0]
  return getFestivos(anio).has(isoDate)
}

/**
 * Calcula el número de noches entre fechaEntrada y fechaSalida.
 * La última noche es la de check-out (día anterior a fechaSalida).
 *
 * @param fechaEntrada  "YYYY-MM-DD"
 * @param fechaSalida   "YYYY-MM-DD"
 */
export function calcularNoches(fechaEntrada: string, fechaSalida: string): number {
  const entrada = new Date(`${fechaEntrada}T12:00:00`)
  const salida  = new Date(`${fechaSalida}T12:00:00`)
  const diff    = salida.getTime() - entrada.getTime()
  return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)))
}

/**
 * Devuelve un array con las fechas de cada noche de la reserva.
 * Cada elemento es la fecha de inicio de esa noche ("YYYY-MM-DD").
 * La noche 1 comienza en fechaEntrada; la última noche comienza el día
 * anterior a fechaSalida.
 */
export function fechasDeNoches(fechaEntrada: string, fechaSalida: string): string[] {
  const noches: string[] = []
  const actual = new Date(`${fechaEntrada}T12:00:00`)
  const salida = new Date(`${fechaSalida}T12:00:00`)
  while (actual < salida) {
    noches.push(actual.toISOString().split("T")[0])
    actual.setDate(actual.getDate() + 1)
  }
  return noches
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. CÁLCULO DE RESERVA DE ALOJAMIENTO
// ─────────────────────────────────────────────────────────────────────────────

export interface DetalleNoche {
  fecha:          string    // "YYYY-MM-DD"
  esFds:          boolean
  tarifaBase:     number    // tarifa alojamiento esa noche (sin adicionales)
  personas:       number
}

export interface ResumenServicios {
  romantico?:      number
  cumpleanos?:     number
  picnic?:         number
  petFriendly?:    number   // total = precio × cantidad mascotas
  desayuno?:       number   // total = precio × cantidad personas
}

export interface ResultadoReserva {
  noches:              number
  detalleNoches:       DetalleNoche[]
  subtotalAlojamiento: number    // suma de todas las noches
  subtotalServicios:   number    // suma de servicios adicionales
  subtotal:            number    // alojamiento + servicios
  descuento:           number    // importe descontado (0 si no aplica)
  aplicaDescuento:     boolean
  total:               number    // precio final
  resumenServicios:    ResumenServicios
}

export interface InputReserva {
  fechaEntrada:    string   // "YYYY-MM-DD"
  fechaSalida:     string   // "YYYY-MM-DD"
  personas:        number   // total de huéspedes (incluyendo niños ≥ 5 años)
  servicios?:      ServicioId[]
  petFriendlyCount?: number
  desayunoCount?:    number
}

/**
 * Calcula el precio total de una reserva de alojamiento noche a noche.
 *
 * Reglas aplicadas:
 * - 1 persona → TARIFA.PERSONA_SOLA (igual entre semana y fds)
 * - 2 personas → PAREJA_SEMANA o PAREJA_FDS según el día
 * - 3+ personas → tarifa pareja + ADICIONAL_POR_PERSONA × (personas − 2)
 * - Niños < 5 años no se cuentan como adicional (deben pasarse ya excluidos)
 * - 4+ noches → descuento 25% sobre (alojamiento + servicios)
 */
export function calcularReserva(input: InputReserva): ResultadoReserva {
  const {
    fechaEntrada,
    fechaSalida,
    personas,
    servicios        = [],
    petFriendlyCount = 1,
    desayunoCount    = 1,
  } = input

  const noches       = calcularNoches(fechaEntrada, fechaSalida)
  const fechasNoches = fechasDeNoches(fechaEntrada, fechaSalida)

  // ── Cálculo noche a noche ────────────────────────────────────────────────
  const detalleNoches: DetalleNoche[] = fechasNoches.map((fecha) => {
    const esFds = esTarifaFinDeSemana(fecha)
    let tarifaBase: number

    if (personas === 1) {
      tarifaBase = TARIFAS.PERSONA_SOLA
    } else if (personas === 2) {
      tarifaBase = esFds ? TARIFAS.PAREJA_FDS : TARIFAS.PAREJA_SEMANA
    } else {
      // 3+ personas: pareja + adicionales
      const basePareja   = esFds ? TARIFAS.PAREJA_FDS : TARIFAS.PAREJA_SEMANA
      const adicionales  = (personas - 2) * TARIFAS.ADICIONAL_POR_PERSONA
      tarifaBase         = basePareja + adicionales
    }

    return { fecha, esFds, tarifaBase, personas }
  })

  const subtotalAlojamiento = detalleNoches.reduce((acc, n) => acc + n.tarifaBase, 0)

  // ── Servicios adicionales ────────────────────────────────────────────────
  const resumenServicios: ResumenServicios = {}
  let subtotalServicios = 0

  if (servicios.includes("romantico")) {
    resumenServicios.romantico = SERVICIOS_ADICIONALES.romantico.precio
    subtotalServicios += SERVICIOS_ADICIONALES.romantico.precio
  }
  if (servicios.includes("cumpleanos")) {
    resumenServicios.cumpleanos = SERVICIOS_ADICIONALES.cumpleanos.precio
    subtotalServicios += SERVICIOS_ADICIONALES.cumpleanos.precio
  }
  if (servicios.includes("picnic")) {
    resumenServicios.picnic = SERVICIOS_ADICIONALES.picnic.precio
    subtotalServicios += SERVICIOS_ADICIONALES.picnic.precio
  }
  if (servicios.includes("pet-friendly")) {
    const total = SERVICIOS_ADICIONALES["pet-friendly"].precio * petFriendlyCount
    resumenServicios.petFriendly = total
    subtotalServicios += total
  }
  if (servicios.includes("desayuno")) {
    const total = SERVICIOS_ADICIONALES.desayuno.precio * desayunoCount
    resumenServicios.desayuno = total
    subtotalServicios += total
  }

  const subtotal          = subtotalAlojamiento + subtotalServicios
  const aplicaDescuento   = noches >= TARIFAS.MINIMO_NOCHES_DESCUENTO
  const descuento         = aplicaDescuento
    ? Math.round(subtotal * TARIFAS.DESCUENTO_ESTADIA_LARGA_PCT)
    : 0
  const total             = subtotal - descuento

  return {
    noches,
    detalleNoches,
    subtotalAlojamiento,
    subtotalServicios,
    subtotal,
    descuento,
    aplicaDescuento,
    total,
    resumenServicios,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. CÁLCULO DE PASADÍA
// ─────────────────────────────────────────────────────────────────────────────

export interface ResultadoPasadia {
  totalPersonas:    number
  base:             number    // personas × TARIFA_POR_PERSONA
  descuento:        number    // importe descontado (0 si no aplica)
  aplicaDescuento:  boolean
  total:            number
}

/**
 * Calcula el precio de un paquete pasadía.
 *
 * @param totalPersonas  Suma de personas en todas las cabañas solicitadas
 */
export function calcularPasadia(totalPersonas: number): ResultadoPasadia {
  const base            = totalPersonas * PASADIA.TARIFA_POR_PERSONA
  const aplicaDescuento = totalPersonas > PASADIA.UMBRAL_DESCUENTO
  const descuento       = aplicaDescuento
    ? Math.round(base * PASADIA.DESCUENTO_GRUPAL_PCT)
    : 0
  return {
    totalPersonas,
    base,
    descuento,
    aplicaDescuento,
    total: base - descuento,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. UTILIDADES DE FORMATO
// ─────────────────────────────────────────────────────────────────────────────

/** Formatea un número como moneda colombiana: $180.000 */
export function formatCOP(valor: number): string {
  return `$${valor.toLocaleString("es-CO")}`
}

/** Formatea una fecha "YYYY-MM-DD" como "DD/MM/AAAA" */
export function formatFecha(fecha: string): string {
  if (!fecha) return "—"
  const [y, m, d] = fecha.split("-")
  return `${d}/${m}/${y}`
}