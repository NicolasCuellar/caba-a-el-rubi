/**
 * test-endpoints.mjs
 *
 * Script de pruebas end-to-end para La Cabaña El Rubí — MVP v2.0
 *
 * Uso:
 *   1. Levanta tu app local:        npm run dev
 *   2. (Opcional) Configura admin key: export ADMIN_API_KEY="tu-key"
 *   3. Corre las pruebas:           node test-endpoints.mjs
 *
 * El script:
 *   - Llama a /api/disponibilidad, /api/reservas, /api/pasadia y /api/admin/bloquear
 *   - Valida códigos HTTP, contenido de respuestas y reglas de negocio
 *   - Imprime un reporte resumido al final
 *   - NO limpia eventos creados — debes hacerlo manualmente desde Google Calendar
 *
 * Marcador único:
 *   Todas las reservas creadas usan el prefijo `[E2E-TEST]` en el nombre del cliente
 *   para que las identifiques fácilmente al limpiar.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Configuración
// ─────────────────────────────────────────────────────────────────────────────

const BASE_URL    = process.env.BASE_URL    ?? "http://localhost:3000"
const ADMIN_KEY   = process.env.ADMIN_API_KEY ?? ""
const TEST_MARKER = "[E2E-TEST]"

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de fechas — todas relativas a hoy para evitar conflictos repetidos
// ─────────────────────────────────────────────────────────────────────────────

function offsetDate(daysFromToday) {
  const d = new Date()
  d.setDate(d.getDate() + daysFromToday)
  return d.toISOString().split("T")[0]
}

function findNextDayOfWeek(targetDow, fromDaysAhead = 1) {
  // targetDow: 0=dom, 1=lun, ..., 5=vie, 6=sáb
  for (let i = fromDaysAhead; i < fromDaysAhead + 14; i++) {
    const d = new Date()
    d.setDate(d.getDate() + i)
    if (d.getDay() === targetDow) return d.toISOString().split("T")[0]
  }
  return offsetDate(fromDaysAhead)
}

// Para que cada corrida no choque con la anterior, usamos fechas lejanas distintas
// según un seed temporal. Mantén el SEED estable durante una corrida pero distinto entre días.
const SEED = Math.floor(Date.now() / (1000 * 60 * 60 * 24)) % 30  // 0-29

// Bloque de fechas dedicado a las pruebas — ~3 meses adelante para no chocar
// con reservas reales del cliente
const BASE_OFFSET = 90 + SEED * 5

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de testing
// ─────────────────────────────────────────────────────────────────────────────

const colors = {
  reset:   "\x1b[0m",
  red:     "\x1b[31m",
  green:   "\x1b[32m",
  yellow:  "\x1b[33m",
  blue:    "\x1b[34m",
  magenta: "\x1b[35m",
  cyan:    "\x1b[36m",
  gray:    "\x1b[90m",
  bold:    "\x1b[1m",
}

const stats = { pass: 0, fail: 0, skip: 0, total: 0 }
const failures = []

async function request(method, path, { body, headers = {} } = {}) {
  const opts = {
    method,
    headers: { "Content-Type": "application/json", ...headers },
  }
  if (body) opts.body = JSON.stringify(body)
  const res  = await fetch(`${BASE_URL}${path}`, opts)
  let data
  try { data = await res.json() } catch { data = null }
  return { status: res.status, ok: res.ok, data }
}

async function test(description, fn) {
  stats.total++
  try {
    await fn()
    stats.pass++
    console.log(`  ${colors.green}✓${colors.reset} ${description}`)
  } catch (err) {
    stats.fail++
    failures.push({ description, error: err.message })
    console.log(`  ${colors.red}✗ ${description}${colors.reset}`)
    console.log(`    ${colors.red}${err.message}${colors.reset}`)
  }
}

function skip(description, reason) {
  stats.total++
  stats.skip++
  console.log(`  ${colors.yellow}⊘${colors.reset} ${description} ${colors.gray}(${reason})${colors.reset}`)
}

function section(name) {
  console.log(`\n${colors.bold}${colors.cyan}━━━ ${name} ━━━${colors.reset}`)
}

function expect(actual) {
  return {
    toBe: (expected) => {
      if (actual !== expected)
        throw new Error(`Esperaba ${JSON.stringify(expected)}, obtuve ${JSON.stringify(actual)}`)
    },
    toBeTruthy: () => {
      if (!actual) throw new Error(`Esperaba un valor truthy, obtuve ${JSON.stringify(actual)}`)
    },
    toBeOneOf: (options) => {
      if (!options.includes(actual))
        throw new Error(`Esperaba uno de ${JSON.stringify(options)}, obtuve ${JSON.stringify(actual)}`)
    },
    toContain: (substring) => {
      if (typeof actual !== "string" || !actual.includes(substring))
        throw new Error(`Esperaba que contenga "${substring}", obtuve "${actual}"`)
    },
    toMatch: (regex) => {
      if (!regex.test(String(actual)))
        throw new Error(`Esperaba que coincida con ${regex}, obtuve "${actual}"`)
    },
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Datos base reutilizables
// ─────────────────────────────────────────────────────────────────────────────

function reservaBase(overrides = {}) {
  return {
    cabana:       "cabana-a",
    fechaEntrada: offsetDate(BASE_OFFSET),
    fechaSalida:  offsetDate(BASE_OFFSET + 2),
    nombre:       `${TEST_MARKER} Cliente Prueba`,
    telefono:     "+57 300 1234567",
    email:        "test@ejemplo.com",
    personas:     2,
    servicios:    [],
    observaciones: "Reserva generada por test E2E",
    ...overrides,
  }
}

function pasadiaBase(overrides = {}) {
  return {
    cabanas:           ["cabana-a"],
    fecha:             offsetDate(BASE_OFFSET + 10),
    nombre:            `${TEST_MARKER} Grupo Pasadia`,
    telefono:          "+57 301 9876543",
    email:             "pasadia@ejemplo.com",
    totalPersonas:     3,
    personasPorCabana: { "cabana-a": 3 },
    observaciones:     "Pasadía generado por test E2E",
    ...overrides,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PRUEBAS
// ─────────────────────────────────────────────────────────────────────────────

async function testDisponibilidad() {
  section("GET /api/disponibilidad — Validación de parámetros")

  await test("Sin parámetros → 400", async () => {
    const r = await request("GET", "/api/disponibilidad")
    expect(r.status).toBe(400)
    expect(r.data?.error).toBeTruthy()
  })

  await test("Cabaña inválida → 400", async () => {
    const r = await request("GET",
      `/api/disponibilidad?cabana=cabana-z&fechaEntrada=${offsetDate(10)}&fechaSalida=${offsetDate(12)}`)
    expect(r.status).toBe(400)
  })

  await test("Formato de fecha inválido → 400", async () => {
    const r = await request("GET",
      `/api/disponibilidad?cabana=cabana-a&fechaEntrada=10-04-2026&fechaSalida=12-04-2026`)
    expect(r.status).toBe(400)
  })

  await test("Entrada >= salida → 400", async () => {
    const r = await request("GET",
      `/api/disponibilidad?cabana=cabana-a&fechaEntrada=${offsetDate(12)}&fechaSalida=${offsetDate(10)}`)
    expect(r.status).toBe(400)
  })

  await test("Fecha en el pasado → 400", async () => {
    const r = await request("GET",
      `/api/disponibilidad?cabana=cabana-a&fechaEntrada=${offsetDate(-5)}&fechaSalida=${offsetDate(-3)}`)
    expect(r.status).toBe(400)
  })

  await test("Consulta válida → 200 con campo disponible:boolean", async () => {
    const r = await request("GET",
      `/api/disponibilidad?cabana=cabana-a&fechaEntrada=${offsetDate(BASE_OFFSET + 200)}&fechaSalida=${offsetDate(BASE_OFFSET + 202)}`)
    expect(r.status).toBe(200)
    expect(typeof r.data?.disponible).toBe("boolean")
  })
}

async function testReservasValidacion() {
  section("POST /api/reservas — Validación de campos")

  await test("Body vacío → 400", async () => {
    const r = await request("POST", "/api/reservas", { body: {} })
    expect(r.status).toBe(400)
  })

  await test("Falta cabaña → 400", async () => {
    const r = await request("POST", "/api/reservas",
      { body: reservaBase({ cabana: undefined }) })
    expect(r.status).toBe(400)
    expect(r.data?.error).toContain("cabana")
  })

  await test("Cabaña inválida → 400", async () => {
    const r = await request("POST", "/api/reservas",
      { body: reservaBase({ cabana: "cabana-x" }) })
    expect(r.status).toBe(400)
  })

  await test("Fecha pasada → 400", async () => {
    const r = await request("POST", "/api/reservas",
      { body: reservaBase({ fechaEntrada: offsetDate(-5), fechaSalida: offsetDate(-3) }) })
    expect(r.status).toBe(400)
  })

  await test("Cabaña A con 6 personas (máx 5) → 400", async () => {
    const r = await request("POST", "/api/reservas",
      { body: reservaBase({ personas: 6 }) })
    expect(r.status).toBe(400)
  })

  await test("Cabaña C con 8 personas → debería aceptar la cantidad", async () => {
    // Solo validamos que NO falle por capacidad — usa fechas muy lejanas
    const r = await request("POST", "/api/reservas",
      { body: reservaBase({
        cabana: "cabana-c", personas: 8,
        fechaEntrada: offsetDate(BASE_OFFSET + 220),
        fechaSalida:  offsetDate(BASE_OFFSET + 222),
      }) })
    // Puede ser 201 (creada) o 409 (ya existe). Lo que NO debe ser es 400.
    expect(r.status).toBeOneOf([201, 409])
  })

  await test("Servicio inválido → 400", async () => {
    const r = await request("POST", "/api/reservas",
      { body: reservaBase({ servicios: ["servicio-inexistente"] }) })
    expect(r.status).toBe(400)
  })

  await test("Pet-friendly sin petFriendlyCount → 400", async () => {
    const r = await request("POST", "/api/reservas",
      { body: reservaBase({ servicios: ["pet-friendly"] }) })
    expect(r.status).toBe(400)
  })

  await test("Desayuno con count > maxPersonas → 400", async () => {
    const r = await request("POST", "/api/reservas",
      { body: reservaBase({ servicios: ["desayuno"], desayunoCount: 99 }) })
    expect(r.status).toBe(400)
  })
}

async function testReservasFlujoCompleto() {
  section("POST /api/reservas — Flujo completo")

  let primerEventoId = null

  await test("Crear reserva válida → 201 + eventoId", async () => {
    const r = await request("POST", "/api/reservas",
      { body: reservaBase({
        nombre: `${TEST_MARKER} Flujo Completo`,
        fechaEntrada: offsetDate(BASE_OFFSET + 300),
        fechaSalida:  offsetDate(BASE_OFFSET + 302),
      }) })
    expect(r.status).toBe(201)
    expect(r.data?.ok).toBe(true)
    expect(r.data?.eventoId).toBeTruthy()
    primerEventoId = r.data.eventoId
  })

  await test("Disponibilidad de las MISMAS fechas → false", async () => {
    if (!primerEventoId) throw new Error("No se creó la primera reserva")
    const r = await request("GET",
      `/api/disponibilidad?cabana=cabana-a&fechaEntrada=${offsetDate(BASE_OFFSET + 300)}&fechaSalida=${offsetDate(BASE_OFFSET + 302)}`)
    expect(r.status).toBe(200)
    expect(r.data?.disponible).toBe(false)
  })

  await test("Reserva solapada (mismo rango) → 409 Conflict", async () => {
    const r = await request("POST", "/api/reservas",
      { body: reservaBase({
        nombre: `${TEST_MARKER} Solape Total`,
        fechaEntrada: offsetDate(BASE_OFFSET + 300),
        fechaSalida:  offsetDate(BASE_OFFSET + 302),
      }) })
    expect(r.status).toBe(409)
  })

  await test("Reserva solapada parcial (entrada dentro) → 409", async () => {
    const r = await request("POST", "/api/reservas",
      { body: reservaBase({
        nombre: `${TEST_MARKER} Solape Parcial`,
        fechaEntrada: offsetDate(BASE_OFFSET + 301),
        fechaSalida:  offsetDate(BASE_OFFSET + 304),
      }) })
    expect(r.status).toBe(409)
  })

  await test("Check-in el día del check-out (continuación) → 201", async () => {
    // Reserva existente: 300 → 302 (sale el 302)
    // Nueva reserva: 302 → 304 (entra el 302) — NO debe haber conflicto
    const r = await request("POST", "/api/reservas",
      { body: reservaBase({
        nombre: `${TEST_MARKER} Continuacion`,
        fechaEntrada: offsetDate(BASE_OFFSET + 302),
        fechaSalida:  offsetDate(BASE_OFFSET + 304),
      }) })
    if (r.status !== 201) {
      throw new Error(
        `Esperaba 201 — el check-in en el día del check-out anterior NO debe ` +
        `bloquear. Obtuve ${r.status}: ${JSON.stringify(r.data)}. ` +
        `Esto indica un bug en verificarDisponibilidad — los rangos all-day deben ` +
        `tratarse como semi-abiertos [entrada, salida).`
      )
    }
  })

  await test("Reserva en cabaña B con MISMAS fechas que A → 201 (cabañas independientes)", async () => {
    const r = await request("POST", "/api/reservas",
      { body: reservaBase({
        cabana: "cabana-b",
        nombre: `${TEST_MARKER} Cabana B paralela`,
        fechaEntrada: offsetDate(BASE_OFFSET + 300),
        fechaSalida:  offsetDate(BASE_OFFSET + 302),
      }) })
    expect(r.status).toBe(201)
  })
}

async function testPasadiaValidacion() {
  section("POST /api/pasadia — Validación de campos")

  await test("Sin cabañas → 400", async () => {
    const r = await request("POST", "/api/pasadia",
      { body: pasadiaBase({ cabanas: [] }) })
    expect(r.status).toBe(400)
  })

  await test("Más de 3 cabañas → 400", async () => {
    const r = await request("POST", "/api/pasadia",
      { body: pasadiaBase({
        cabanas: ["cabana-a","cabana-b","cabana-c","cabana-a"],
      }) })
    expect(r.status).toBe(400)
  })

  await test("Cabañas duplicadas → 400", async () => {
    const r = await request("POST", "/api/pasadia",
      { body: pasadiaBase({
        cabanas: ["cabana-a", "cabana-a"],
        personasPorCabana: { "cabana-a": 3 },
      }) })
    expect(r.status).toBe(400)
  })

  await test("Más de 4 personas en una cabaña → 400", async () => {
    const r = await request("POST", "/api/pasadia",
      { body: pasadiaBase({
        totalPersonas: 5,
        personasPorCabana: { "cabana-a": 5 },
      }) })
    expect(r.status).toBe(400)
  })

  await test("Suma de personas no coincide con totalPersonas → 400", async () => {
    const r = await request("POST", "/api/pasadia",
      { body: pasadiaBase({
        cabanas: ["cabana-a", "cabana-b"],
        totalPersonas: 5,
        personasPorCabana: { "cabana-a": 3, "cabana-b": 4 }, // suma 7, no 5
      }) })
    expect(r.status).toBe(400)
  })

  await test("Email mal formado → 400", async () => {
    const r = await request("POST", "/api/pasadia",
      { body: pasadiaBase({ email: "no-es-un-email" }) })
    expect(r.status).toBe(400)
  })

  await test("Fecha pasada → 400", async () => {
    const r = await request("POST", "/api/pasadia",
      { body: pasadiaBase({ fecha: offsetDate(-3) }) })
    expect(r.status).toBe(400)
  })
}

async function testPasadiaCalculoTarifas() {
  section("POST /api/pasadia — Cálculo correcto de tarifas")

  await test("Pasadía 4 pax (sin descuento) → total $200.000", async () => {
    const r = await request("POST", "/api/pasadia",
      { body: pasadiaBase({
        cabanas: ["cabana-a"],
        totalPersonas: 4,
        personasPorCabana: { "cabana-a": 4 },
        nombre: `${TEST_MARKER} Tarifa 4pax`,
        fecha: offsetDate(BASE_OFFSET + 400),
      }) })
    if (r.status !== 201 && r.status !== 409) {
      throw new Error(`Status inesperado ${r.status}: ${JSON.stringify(r.data)}`)
    }
    if (r.status === 201) {
      expect(r.data.precioTotal).toBe(200_000)
      expect(r.data.aplicaDescuento).toBe(false)
    }
  })

  await test("Pasadía 11 pax en 3 cabañas (con descuento) → total $412.500", async () => {
    const r = await request("POST", "/api/pasadia",
      { body: pasadiaBase({
        cabanas: ["cabana-a", "cabana-b", "cabana-c"],
        totalPersonas: 11,
        personasPorCabana: { "cabana-a": 4, "cabana-b": 4, "cabana-c": 3 },
        nombre: `${TEST_MARKER} Tarifa 11pax descuento`,
        fecha: offsetDate(BASE_OFFSET + 410),
      }) })
    if (r.status !== 201 && r.status !== 409) {
      throw new Error(`Status inesperado ${r.status}: ${JSON.stringify(r.data)}`)
    }
    if (r.status === 201) {
      expect(r.data.precioTotal).toBe(412_500)
      expect(r.data.aplicaDescuento).toBe(true)
      expect(r.data.descuento).toBe(137_500)
    }
  })

  await test("Pasadía 10 pax (umbral exacto, NO descuento)", async () => {
    const r = await request("POST", "/api/pasadia",
      { body: pasadiaBase({
        cabanas: ["cabana-a", "cabana-b", "cabana-c"],
        totalPersonas: 10,
        personasPorCabana: { "cabana-a": 4, "cabana-b": 4, "cabana-c": 2 },
        nombre: `${TEST_MARKER} Tarifa 10pax umbral`,
        fecha: offsetDate(BASE_OFFSET + 420),
      }) })
    if (r.status !== 201 && r.status !== 409) {
      throw new Error(`Status inesperado ${r.status}: ${JSON.stringify(r.data)}`)
    }
    if (r.status === 201) {
      expect(r.data.precioTotal).toBe(500_000)
      expect(r.data.aplicaDescuento).toBe(false)
    }
  })
}

async function testPasadiaFlujoCompleto() {
  section("POST /api/pasadia — Flujo completo")

  await test("Crear pasadía válido → 201 + eventoIds", async () => {
    const r = await request("POST", "/api/pasadia",
      { body: pasadiaBase({
        nombre: `${TEST_MARKER} Pasadia Flujo`,
        fecha:  offsetDate(BASE_OFFSET + 500),
      }) })
    expect(r.status).toBe(201)
    expect(r.data?.ok).toBe(true)
    expect(Array.isArray(r.data?.eventoIds)).toBe(true)
    expect(r.data.eventoIds.length).toBe(1)
  })

  await test("Pasadía duplicado misma fecha → 409", async () => {
    const r = await request("POST", "/api/pasadia",
      { body: pasadiaBase({
        nombre: `${TEST_MARKER} Pasadia Duplicado`,
        fecha:  offsetDate(BASE_OFFSET + 500),
      }) })
    expect(r.status).toBe(409)
  })
}

async function testAdminBloquear() {
  section("POST /api/admin/bloquear — Endpoint protegido")

  if (!ADMIN_KEY) {
    skip("Pruebas de admin", "ADMIN_API_KEY no definida en env")
    return
  }

  await test("Sin x-admin-key → 401", async () => {
    const r = await request("POST", "/api/admin/bloquear",
      { body: {
        cabana: "cabana-a",
        fechaEntrada: offsetDate(BASE_OFFSET + 600),
        fechaSalida:  offsetDate(BASE_OFFSET + 602),
      } })
    expect(r.status).toBe(401)
  })

  await test("Con x-admin-key inválida → 401", async () => {
    const r = await request("POST", "/api/admin/bloquear",
      { headers: { "x-admin-key": "key-incorrecta" },
        body: {
          cabana: "cabana-a",
          fechaEntrada: offsetDate(BASE_OFFSET + 600),
          fechaSalida:  offsetDate(BASE_OFFSET + 602),
        } })
    expect(r.status).toBe(401)
  })

  await test("Bloqueo válido → 201 + eventoId", async () => {
    const r = await request("POST", "/api/admin/bloquear",
      { headers: { "x-admin-key": ADMIN_KEY },
        body: {
          cabana: "cabana-a",
          fechaEntrada: offsetDate(BASE_OFFSET + 600),
          fechaSalida:  offsetDate(BASE_OFFSET + 602),
          motivo: `${TEST_MARKER} Mantenimiento de prueba`,
        } })
    expect(r.status).toBe(201)
    expect(r.data?.ok).toBe(true)
    expect(r.data?.eventoId).toBeTruthy()
  })

  await test("Disponibilidad sobre fechas bloqueadas → false", async () => {
    const r = await request("GET",
      `/api/disponibilidad?cabana=cabana-a&fechaEntrada=${offsetDate(BASE_OFFSET + 600)}&fechaSalida=${offsetDate(BASE_OFFSET + 602)}`)
    expect(r.status).toBe(200)
    expect(r.data?.disponible).toBe(false)
  })

  await test("Motivo vacío → 400", async () => {
    const r = await request("POST", "/api/admin/bloquear",
      { headers: { "x-admin-key": ADMIN_KEY },
        body: {
          cabana: "cabana-a",
          fechaEntrada: offsetDate(BASE_OFFSET + 700),
          fechaSalida:  offsetDate(BASE_OFFSET + 702),
          motivo: "   ",
        } })
    expect(r.status).toBe(400)
  })

  await test("Motivo > 120 caracteres → 400", async () => {
    const r = await request("POST", "/api/admin/bloquear",
      { headers: { "x-admin-key": ADMIN_KEY },
        body: {
          cabana: "cabana-a",
          fechaEntrada: offsetDate(BASE_OFFSET + 700),
          fechaSalida:  offsetDate(BASE_OFFSET + 702),
          motivo: "x".repeat(121),
        } })
    expect(r.status).toBe(400)
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`${colors.bold}${colors.magenta}╔══════════════════════════════════════════════════════════╗${colors.reset}`)
  console.log(`${colors.bold}${colors.magenta}║  Tests E2E — La Cabaña El Rubí                          ║${colors.reset}`)
  console.log(`${colors.bold}${colors.magenta}╚══════════════════════════════════════════════════════════╝${colors.reset}`)
  console.log(`  ${colors.gray}URL base:${colors.reset}     ${BASE_URL}`)
  console.log(`  ${colors.gray}Admin key:${colors.reset}    ${ADMIN_KEY ? "configurada" : colors.yellow + "NO configurada — pruebas admin se omitirán" + colors.reset}`)
  console.log(`  ${colors.gray}Marcador:${colors.reset}     ${TEST_MARKER}`)
  console.log(`  ${colors.gray}Base offset:${colors.reset}  +${BASE_OFFSET} días desde hoy (seed=${SEED})`)

  // Verificar que el server está vivo
  try {
    await fetch(BASE_URL)
  } catch {
    console.log(`\n${colors.red}${colors.bold}✗ No se pudo conectar a ${BASE_URL}${colors.reset}`)
    console.log(`  ¿Está tu app corriendo? Ejecuta: ${colors.cyan}npm run dev${colors.reset}\n`)
    process.exit(1)
  }

  await testDisponibilidad()
  await testReservasValidacion()
  await testReservasFlujoCompleto()
  await testPasadiaValidacion()
  await testPasadiaCalculoTarifas()
  await testPasadiaFlujoCompleto()
  await testAdminBloquear()

  // ── Reporte final ─────────────────────────────────────────────────────────
  console.log(`\n${colors.bold}━━━ Reporte ━━━${colors.reset}`)
  console.log(`  ${colors.green}Pasaron:${colors.reset}    ${stats.pass}`)
  console.log(`  ${colors.red}Fallaron:${colors.reset}   ${stats.fail}`)
  console.log(`  ${colors.yellow}Omitidas:${colors.reset}   ${stats.skip}`)
  console.log(`  ${colors.gray}Total:${colors.reset}      ${stats.total}`)

  if (failures.length > 0) {
    console.log(`\n${colors.bold}${colors.red}Fallas detalladas:${colors.reset}`)
    failures.forEach((f, i) => {
      console.log(`  ${i + 1}. ${colors.red}${f.description}${colors.reset}`)
      console.log(`     ${colors.gray}${f.error}${colors.reset}`)
    })
  }

  console.log(`\n${colors.yellow}⚠  Recordatorio:${colors.reset} se crearon eventos reales en Google Calendar.`)
  console.log(`   Filtrá por "${TEST_MARKER}" en cada calendario para limpiarlos.\n`)

  process.exit(stats.fail > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error(`\n${colors.red}${colors.bold}Error fatal:${colors.reset}`, err)
  process.exit(2)
})
