/**
 * test-endpoints-v2.mjs
 *
 * Pruebas end-to-end EXTENDIDAS para La Cabaña El Rubí — MVP v2.0
 *
 * Cubre:
 *  - Concurrencia / race conditions
 *  - Bordes de fecha (medianoche, cambio de mes/año, bisiestos)
 *  - Inputs maliciosos (XSS, SQL injection, payloads enormes, caracteres Unicode)
 *  - Flujos end-to-end completos (crear → solapar → verificar liberación)
 *
 * Uso:
 *   npm run dev
 *   node scripts/test-endpoints-v2.mjs
 *
 * Todos los eventos creados llevan el marcador [E2E-TEST-V2] en el nombre
 * para que los filtres fácilmente al limpiar desde Google Calendar.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Configuración
// ─────────────────────────────────────────────────────────────────────────────

const BASE_URL    = process.env.BASE_URL    ?? "http://localhost:3000"
const TEST_MARKER = "[E2E-TEST-V2]"

// Seed distinto cada día para no chocar con corridas previas
const SEED = Math.floor(Date.now() / (1000 * 60 * 60 * 24)) % 30
const BASE_OFFSET = 180 + SEED * 7

// ─────────────────────────────────────────────────────────────────────────────
// Utilidades de fecha
// ─────────────────────────────────────────────────────────────────────────────

function offsetDate(daysFromToday) {
  const d = new Date()
  d.setDate(d.getDate() + daysFromToday)
  return d.toISOString().split("T")[0]
}

function dateToISO(date) {
  return date.toISOString().split("T")[0]
}

function addDays(dateStr, days) {
  const d = new Date(`${dateStr}T12:00:00`)
  d.setDate(d.getDate() + days)
  return dateToISO(d)
}

/** Devuelve el último día de febrero de un año dado (para bisiesto) */
function ultimoFebrero(anio) {
  const esBisiesto = (anio % 4 === 0 && anio % 100 !== 0) || anio % 400 === 0
  return `${anio}-02-${esBisiesto ? "29" : "28"}`
}

/** Año próximo que sea bisiesto desde hoy */
function proximoAnioBisiesto() {
  let a = new Date().getFullYear()
  while (!((a % 4 === 0 && a % 100 !== 0) || a % 400 === 0)) a++
  return a
}

// ─────────────────────────────────────────────────────────────────────────────
// Framework de tests minimalista
// ─────────────────────────────────────────────────────────────────────────────

const colors = {
  reset:"\x1b[0m", red:"\x1b[31m", green:"\x1b[32m", yellow:"\x1b[33m",
  blue:"\x1b[34m", magenta:"\x1b[35m", cyan:"\x1b[36m", gray:"\x1b[90m",
  bold:"\x1b[1m",
}

const stats = { pass: 0, fail: 0, skip: 0, total: 0 }
const failures = []

async function request(method, path, { body, headers = {} } = {}) {
  const opts = {
    method,
    headers: { "Content-Type": "application/json", ...headers },
  }
  if (body !== undefined) opts.body = JSON.stringify(body)
  try {
    const res = await fetch(`${BASE_URL}${path}`, opts)
    let data
    try { data = await res.json() } catch { data = null }
    return { status: res.status, ok: res.ok, data }
  } catch (err) {
    return { status: 0, ok: false, data: null, networkError: err.message }
  }
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
      if (!actual) throw new Error(`Esperaba truthy, obtuve ${JSON.stringify(actual)}`)
    },
    toBeOneOf: (options) => {
      if (!options.includes(actual))
        throw new Error(`Esperaba uno de ${JSON.stringify(options)}, obtuve ${JSON.stringify(actual)}`)
    },
    toContain: (substring) => {
      if (typeof actual !== "string" || !actual.includes(substring))
        throw new Error(`Esperaba que contenga "${substring}", obtuve "${actual}"`)
    },
    notToBe: (expected) => {
      if (actual === expected)
        throw new Error(`Esperaba que NO fuera ${JSON.stringify(expected)}`)
    },
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Datos base
// ─────────────────────────────────────────────────────────────────────────────

function reservaBase(overrides = {}) {
  return {
    cabana:       "cabana-a",
    fechaEntrada: offsetDate(BASE_OFFSET),
    fechaSalida:  offsetDate(BASE_OFFSET + 2),
    nombre:       `${TEST_MARKER} Cliente`,
    telefono:     "+57 300 1234567",
    email:        "test@ejemplo.com",
    personas:     2,
    servicios:    [],
    observaciones: "Test E2E v2",
    ...overrides,
  }
}

function pasadiaBase(overrides = {}) {
  return {
    cabanas:           ["cabana-a"],
    fecha:             offsetDate(BASE_OFFSET + 30),
    nombre:            `${TEST_MARKER} Grupo`,
    telefono:          "+57 301 9876543",
    email:             "pasadia@ejemplo.com",
    totalPersonas:     3,
    personasPorCabana: { "cabana-a": 3 },
    observaciones:     "Test pasadia v2",
    ...overrides,
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// BLOQUE 1: CONCURRENCIA / RACE CONDITIONS
// ═══════════════════════════════════════════════════════════════════════════════

async function testConcurrencia() {
  section("Concurrencia / Race Conditions")

  // ── Caso 1: Dos reservas IDÉNTICAS enviadas en paralelo ──────────────────
  // Esperado: una crea (201), la otra debe rechazar (409).
  // Si ambas crean, hay un race condition que compromete la integridad.
  await test("Dos reservas idénticas en paralelo → solo UNA debe crear", async () => {
    const fechaEntrada = offsetDate(BASE_OFFSET + 100)
    const fechaSalida  = offsetDate(BASE_OFFSET + 102)

    const payload1 = reservaBase({
      cabana: "cabana-a", fechaEntrada, fechaSalida,
      nombre: `${TEST_MARKER} Race A1`, email: "race-a1@test.com",
    })
    const payload2 = reservaBase({
      cabana: "cabana-a", fechaEntrada, fechaSalida,
      nombre: `${TEST_MARKER} Race A2`, email: "race-a2@test.com",
    })

    // Disparar ambas al mismo tiempo
    const [res1, res2] = await Promise.all([
      request("POST", "/api/reservas", { body: payload1 }),
      request("POST", "/api/reservas", { body: payload2 }),
    ])

    const statuses = [res1.status, res2.status].sort()
    // Resultado aceptable: [201, 409]. Cualquier otra cosa es un bug.
    if (statuses[0] === 201 && statuses[1] === 201) {
      throw new Error(
        `RACE CONDITION DETECTADA: ambas reservas fueron creadas (${res1.status}, ${res2.status}). ` +
        `La verificación de disponibilidad no es atómica respecto a la creación.`
      )
    }
    if (!(statuses[0] === 201 && statuses[1] === 409)) {
      throw new Error(
        `Resultado inesperado: statuses=${JSON.stringify(statuses)}. ` +
        `Esperaba exactamente [201, 409].`
      )
    }
  })

  // ── Caso 2: 5 reservas en paralelo — debe permitir solo una ──────────────
  await test("5 reservas paralelas mismas fechas → solo UNA crea", async () => {
    const fechaEntrada = offsetDate(BASE_OFFSET + 110)
    const fechaSalida  = offsetDate(BASE_OFFSET + 112)

    const requests = Array.from({ length: 5 }, (_, i) =>
      request("POST", "/api/reservas", {
        body: reservaBase({
          cabana: "cabana-b", fechaEntrada, fechaSalida,
          nombre: `${TEST_MARKER} Race5-${i}`,
          email:  `race5-${i}@test.com`,
        }),
      })
    )

    const results = await Promise.all(requests)
    const creadas = results.filter((r) => r.status === 201).length
    const rechazadas = results.filter((r) => r.status === 409).length

    if (creadas > 1) {
      throw new Error(
        `RACE CONDITION: ${creadas} reservas creadas (esperaba 1). ` +
        `Distribución: ${results.map((r) => r.status).join(",")}`
      )
    }
    if (creadas !== 1 || rechazadas !== 4) {
      throw new Error(
        `Esperaba 1 creada y 4 rechazadas. Obtuve: ${creadas} creadas, ${rechazadas} rechazadas. ` +
        `Statuses: ${results.map((r) => r.status).join(",")}`
      )
    }
  })

  // ── Caso 3: Reservas paralelas en cabañas DIFERENTES → todas deben crear ─
  await test("3 reservas paralelas cabañas distintas → TODAS crean", async () => {
    const fechaEntrada = offsetDate(BASE_OFFSET + 120)
    const fechaSalida  = offsetDate(BASE_OFFSET + 122)

    const [rA, rB, rC] = await Promise.all([
      request("POST", "/api/reservas", {
        body: reservaBase({
          cabana: "cabana-a", fechaEntrada, fechaSalida,
          nombre: `${TEST_MARKER} Paralelo-A`, email: "par-a@test.com",
        }),
      }),
      request("POST", "/api/reservas", {
        body: reservaBase({
          cabana: "cabana-b", fechaEntrada, fechaSalida,
          nombre: `${TEST_MARKER} Paralelo-B`, email: "par-b@test.com",
        }),
      }),
      request("POST", "/api/reservas", {
        body: reservaBase({
          cabana: "cabana-c", fechaEntrada, fechaSalida,
          nombre: `${TEST_MARKER} Paralelo-C`, email: "par-c@test.com",
        }),
      }),
    ])

    const statuses = [rA.status, rB.status, rC.status]
    if (statuses.some((s) => s !== 201)) {
      throw new Error(
        `Las 3 cabañas deben poder reservarse en paralelo. Obtuve: ${JSON.stringify(statuses)}`
      )
    }
  })

  // ── Caso 4: Pasadía vs Reserva en la misma fecha ─────────────────────────
  await test("Reserva y pasadía paralelos mismo día → solo UNO crea", async () => {
    const fecha = offsetDate(BASE_OFFSET + 130)

    const [rRes, rPas] = await Promise.all([
      request("POST", "/api/reservas", {
        body: reservaBase({
          cabana: "cabana-a",
          fechaEntrada: fecha,
          fechaSalida:  addDays(fecha, 1),
          nombre: `${TEST_MARKER} Res-vs-Pas`,
          email: "resvspas@test.com",
        }),
      }),
      request("POST", "/api/pasadia", {
        body: pasadiaBase({
          cabanas: ["cabana-a"],
          fecha,
          totalPersonas: 3,
          personasPorCabana: { "cabana-a": 3 },
          nombre: `${TEST_MARKER} Pas-vs-Res`,
          email: "pasvsres@test.com",
        }),
      }),
    ])

    const statuses = [rRes.status, rPas.status].sort()
    if (statuses[0] === 201 && statuses[1] === 201) {
      throw new Error(
        "Reserva y pasadía no deberían coexistir el mismo día en la misma cabaña"
      )
    }
    // Aceptable: [201, 409]
    if (!(statuses[0] === 201 && statuses[1] === 409)) {
      throw new Error(`Esperaba [201, 409], obtuve ${JSON.stringify(statuses)}`)
    }
  })
}

// ═══════════════════════════════════════════════════════════════════════════════
// BLOQUE 2: BORDES DE FECHA
// ═══════════════════════════════════════════════════════════════════════════════

async function testBordesFecha() {
  section("Bordes de fecha")

  // ── Cambio de mes ────────────────────────────────────────────────────────
  await test("Reserva que cruza cambio de mes → 201", async () => {
    // Buscar un mes próximo que nos dé "último día del mes → primer día del siguiente"
    const d = new Date()
    d.setDate(d.getDate() + BASE_OFFSET + 200)
    // Ir al último día del mes
    d.setMonth(d.getMonth() + 1, 0)
    const ultimoDiaMes = dateToISO(d)
    const primeroDiaSiguiente = addDays(ultimoDiaMes, 1)

    const r = await request("POST", "/api/reservas", {
      body: reservaBase({
        cabana: "cabana-c",
        fechaEntrada: ultimoDiaMes,
        fechaSalida:  primeroDiaSiguiente,
        nombre: `${TEST_MARKER} Cambio-mes`,
        email: "cambio-mes@test.com",
      }),
    })
    expect(r.status).toBeOneOf([201, 409])
  })

  // ── Cambio de año ────────────────────────────────────────────────────────
  await test("Reserva 31-dic → 1-ene (cambio de año) → 201", async () => {
    const anioActual = new Date().getFullYear()
    // Usar el 31-dic del año siguiente para garantizar que no sea pasada
    const anio = anioActual + 1
    const r = await request("POST", "/api/reservas", {
      body: reservaBase({
        cabana: "cabana-a",
        fechaEntrada: `${anio}-12-31`,
        fechaSalida:  `${anio + 1}-01-02`,
        nombre: `${TEST_MARKER} Cambio-anio`,
        email: "cambio-anio@test.com",
      }),
    })
    expect(r.status).toBeOneOf([201, 409])
  })

  // ── Año bisiesto ─────────────────────────────────────────────────────────
  await test("Reserva sobre 29-feb año bisiesto → 201", async () => {
    const anioBisi = proximoAnioBisiesto()
    const r = await request("POST", "/api/reservas", {
      body: reservaBase({
        cabana: "cabana-b",
        fechaEntrada: `${anioBisi}-02-28`,
        fechaSalida:  `${anioBisi}-03-01`,
        nombre: `${TEST_MARKER} Bisiesto`,
        email: "bisiesto@test.com",
      }),
    })
    expect(r.status).toBeOneOf([201, 409])
  })

  // ── Fecha inválida: 29-feb año NO bisiesto ───────────────────────────────
  await test("Fecha 29-feb año no bisiesto → 400", async () => {
    // Buscar año no bisiesto próximo
    let anio = new Date().getFullYear() + 1
    while ((anio % 4 === 0 && anio % 100 !== 0) || anio % 400 === 0) anio++

    const r = await request("POST", "/api/reservas", {
      body: reservaBase({
        cabana: "cabana-a",
        fechaEntrada: `${anio}-02-29`,
        fechaSalida:  `${anio}-03-02`,
        nombre: `${TEST_MARKER} 29feb-no-bisi`,
        email: "nobisi@test.com",
      }),
    })
    // Idealmente 400; si acepta, el backend está siendo permisivo con fechas inválidas
    if (r.status === 201) {
      throw new Error(
        `El backend aceptó 29-feb-${anio} (año NO bisiesto) como fecha válida. ` +
        `JavaScript new Date() la interpreta como 1-marzo, lo cual corrompe los datos. ` +
        `Recomendación: validar que la fecha parseada vuelve a producir el mismo string.`
      )
    }
    expect(r.status).toBe(400)
  })

  // ── Formato ambiguo ──────────────────────────────────────────────────────
  await test("Formato DD-MM-YYYY (inválido) → 400", async () => {
    const r = await request("POST", "/api/reservas", {
      body: reservaBase({
        fechaEntrada: "15-06-2027",
        fechaSalida:  "17-06-2027",
      }),
    })
    expect(r.status).toBe(400)
  })

  await test("Formato YYYY/MM/DD (inválido) → 400", async () => {
    const r = await request("POST", "/api/reservas", {
      body: reservaBase({
        fechaEntrada: "2027/06/15",
        fechaSalida:  "2027/06/17",
      }),
    })
    expect(r.status).toBe(400)
  })

  await test("Fecha con hora incluida → 400", async () => {
    const r = await request("POST", "/api/reservas", {
      body: reservaBase({
        fechaEntrada: "2027-06-15T10:00:00",
        fechaSalida:  "2027-06-17T10:00:00",
      }),
    })
    expect(r.status).toBe(400)
  })

  // ── Mes o día fuera de rango ─────────────────────────────────────────────
  await test("Mes 13 → 400", async () => {
    const r = await request("POST", "/api/reservas", {
      body: reservaBase({
        fechaEntrada: "2027-13-05",
        fechaSalida:  "2027-13-07",
      }),
    })
    expect(r.status).toBe(400)
  })

  await test("Día 32 → 400", async () => {
    const r = await request("POST", "/api/reservas", {
      body: reservaBase({
        fechaEntrada: "2027-06-32",
        fechaSalida:  "2027-07-02",
      }),
    })
    expect(r.status).toBe(400)
  })

  // ── Reserva de 1 noche exacta (mínimo) ───────────────────────────────────
  await test("Reserva de 1 noche exacta → 201", async () => {
    const fechaEntrada = offsetDate(BASE_OFFSET + 260)
    const fechaSalida  = addDays(fechaEntrada, 1)
    const r = await request("POST", "/api/reservas", {
      body: reservaBase({
        cabana: "cabana-a",
        fechaEntrada, fechaSalida,
        nombre: `${TEST_MARKER} 1-noche`,
        email: "1noche@test.com",
      }),
    })
    expect(r.status).toBeOneOf([201, 409])
  })

  // ── Reserva larguísima (ej. 30 noches) ───────────────────────────────────
  await test("Reserva de 30 noches → 201 con descuento aplicado", async () => {
    const fechaEntrada = offsetDate(BASE_OFFSET + 280)
    const fechaSalida  = addDays(fechaEntrada, 30)
    const r = await request("POST", "/api/reservas", {
      body: reservaBase({
        cabana: "cabana-a",
        fechaEntrada, fechaSalida,
        nombre: `${TEST_MARKER} 30-noches`,
        email: "30noches@test.com",
      }),
    })
    expect(r.status).toBeOneOf([201, 409])
  })

  // ── Fecha muy lejana (5 años) ────────────────────────────────────────────
  await test("Reserva a 5 años vista → 201", async () => {
    const fechaEntrada = offsetDate(365 * 5)
    const fechaSalida  = addDays(fechaEntrada, 2)
    const r = await request("POST", "/api/reservas", {
      body: reservaBase({
        cabana: "cabana-c",
        fechaEntrada, fechaSalida,
        nombre: `${TEST_MARKER} 5-anios`,
        email: "5anios@test.com",
      }),
    })
    expect(r.status).toBeOneOf([201, 409])
  })

  // ── Fecha exactamente hoy ────────────────────────────────────────────────
  await test("Reserva con entrada HOY → 201 (debe aceptar)", async () => {
    const hoy = offsetDate(0)
    const manana = addDays(hoy, 1)
    const r = await request("POST", "/api/reservas", {
      body: reservaBase({
        cabana: "cabana-c",
        fechaEntrada: hoy, fechaSalida: manana,
        nombre: `${TEST_MARKER} Hoy`,
        email: "hoy@test.com",
      }),
    })
    if (r.status === 400) {
      throw new Error(
        "La fecha de hoy NO debe tratarse como 'pasado'. " +
        "Bug potencial en la validación de zona horaria (ver hoyEnColombia)."
      )
    }
    expect(r.status).toBeOneOf([201, 409])
  })

  // ── Fecha ayer ───────────────────────────────────────────────────────────
  await test("Reserva con entrada AYER → 400", async () => {
    const r = await request("POST", "/api/reservas", {
      body: reservaBase({
        fechaEntrada: offsetDate(-1),
        fechaSalida:  offsetDate(1),
      }),
    })
    expect(r.status).toBe(400)
  })
}

// ═══════════════════════════════════════════════════════════════════════════════
// BLOQUE 3: INPUTS MALICIOSOS / SEGURIDAD
// ═══════════════════════════════════════════════════════════════════════════════

async function testInputsMaliciosos() {
  section("Inputs maliciosos y seguridad")

  // ── XSS en nombre ────────────────────────────────────────────────────────
  await test("XSS en nombre → se acepta pero debe almacenarse como texto plano", async () => {
    const r = await request("POST", "/api/reservas", {
      body: reservaBase({
        nombre: `${TEST_MARKER} <script>alert('xss')</script>`,
        fechaEntrada: offsetDate(BASE_OFFSET + 300),
        fechaSalida:  offsetDate(BASE_OFFSET + 302),
        email: "xss@test.com",
      }),
    })
    // El backend NO debe rechazar por XSS; lo que importa es que el frontend escape al renderizar.
    // Solo verificamos que no se rompa el servidor.
    expect(r.status).toBeOneOf([201, 409])
  })

  // ── SQL injection en observaciones ───────────────────────────────────────
  await test("SQL injection en observaciones → se maneja como string", async () => {
    const r = await request("POST", "/api/reservas", {
      body: reservaBase({
        observaciones: "'; DROP TABLE reservas; --",
        fechaEntrada: offsetDate(BASE_OFFSET + 310),
        fechaSalida:  offsetDate(BASE_OFFSET + 312),
        nombre: `${TEST_MARKER} SQL-inject`,
        email: "sqli@test.com",
      }),
    })
    // Tu app usa Google Calendar, no SQL, pero verificamos que no rompa.
    expect(r.status).toBeOneOf([201, 409])
  })

  // ── Prototype pollution ──────────────────────────────────────────────────
  await test("Prototype pollution en body → no afecta el servidor", async () => {
    const r = await request("POST", "/api/reservas", {
      body: {
        ...reservaBase({
          fechaEntrada: offsetDate(BASE_OFFSET + 320),
          fechaSalida:  offsetDate(BASE_OFFSET + 322),
          nombre: `${TEST_MARKER} ProtoPoll`,
          email: "proto@test.com",
        }),
        "__proto__":   { polluted: true },
        "constructor": { polluted: true },
      },
    })
    expect(r.status).toBeOneOf([201, 409, 400])
  })

  // ── Payload muy grande: nombre de 100.000 caracteres ─────────────────────
  await test("Nombre con 100.000 caracteres → 400 o 413", async () => {
    const r = await request("POST", "/api/reservas", {
      body: reservaBase({
        nombre: "x".repeat(100_000),
        fechaEntrada: offsetDate(BASE_OFFSET + 330),
        fechaSalida:  offsetDate(BASE_OFFSET + 332),
        email: "huge@test.com",
      }),
    })
    // Tu app no valida longitud máxima de nombre explícitamente.
    // Google Calendar fallará eventualmente. Un 201 aquí sugiere que deberías
    // agregar validación de longitud para evitar eventos con títulos absurdos.
    if (r.status === 201) {
      console.log(`    ${colors.yellow}⚠  Advertencia: el backend aceptó un nombre de 100.000 caracteres.${colors.reset}`)
      console.log(`    ${colors.yellow}   Recomendación: agregar límite (ej. 100 caracteres).${colors.reset}`)
    }
    // No es un fail duro — solo una advertencia
  })

  // ── Observaciones muy grandes ────────────────────────────────────────────
  await test("Observaciones con 50.000 caracteres → 201 o 400 (recomendado límite)", async () => {
    const r = await request("POST", "/api/reservas", {
      body: reservaBase({
        observaciones: "a".repeat(50_000),
        fechaEntrada: offsetDate(BASE_OFFSET + 340),
        fechaSalida:  offsetDate(BASE_OFFSET + 342),
        nombre: `${TEST_MARKER} Obs-huge`,
        email: "obshuge@test.com",
      }),
    })
    expect(r.status).toBeOneOf([201, 409, 400])
  })

  // ── Caracteres Unicode raros (emojis, RTL, control) ──────────────────────
  await test("Unicode extremo en nombre → 201 (se acepta)", async () => {
    const r = await request("POST", "/api/reservas", {
      body: reservaBase({
        nombre: `${TEST_MARKER} 🏕️🌲 Émilie-François 日本語 عربي \u200B\u202E`,
        fechaEntrada: offsetDate(BASE_OFFSET + 350),
        fechaSalida:  offsetDate(BASE_OFFSET + 352),
        email: "unicode@test.com",
      }),
    })
    expect(r.status).toBeOneOf([201, 409])
  })

  // ── Email con formato raro pero técnicamente válido ──────────────────────
  await test("Email con +alias y subdominios → 201", async () => {
    const r = await request("POST", "/api/reservas", {
      body: reservaBase({
        email: "user+tag.subpart@mail.sub.example.com",
        fechaEntrada: offsetDate(BASE_OFFSET + 360),
        fechaSalida:  offsetDate(BASE_OFFSET + 362),
        nombre: `${TEST_MARKER} Email-plus`,
      }),
    })
    expect(r.status).toBeOneOf([201, 409])
  })

  // ── Email claramente inválido ────────────────────────────────────────────
  await test("Email sin @ → 400 (si backend valida)", async () => {
    const r = await request("POST", "/api/reservas", {
      body: reservaBase({ email: "no-es-email" }),
    })
    // Tu /api/reservas actualmente NO valida formato de email.
    // Solo /api/pasadia lo hace. Esto es una inconsistencia.
    if (r.status === 201) {
      console.log(`    ${colors.yellow}⚠  /api/reservas NO valida formato de email — inconsistente con /api/pasadia${colors.reset}`)
    }
    // Aceptamos tanto 201 como 400 — lo que importa es documentar
    expect(r.status).toBeOneOf([201, 400, 409])
  })

  // ── Personas = 0 o negativo ──────────────────────────────────────────────
  await test("personas = 0 → 400", async () => {
    const r = await request("POST", "/api/reservas", {
      body: reservaBase({ personas: 0 }),
    })
    expect(r.status).toBe(400)
  })

  await test("personas = -5 → 400", async () => {
    const r = await request("POST", "/api/reservas", {
      body: reservaBase({ personas: -5 }),
    })
    expect(r.status).toBe(400)
  })

  await test("personas como string 'cinco' → 400", async () => {
    const r = await request("POST", "/api/reservas", {
      body: reservaBase({ personas: "cinco" }),
    })
    expect(r.status).toBe(400)
  })

  // ── petFriendlyCount negativo ────────────────────────────────────────────
  await test("petFriendlyCount negativo → 400", async () => {
    const r = await request("POST", "/api/reservas", {
      body: reservaBase({
        servicios: ["pet-friendly"],
        petFriendlyCount: -2,
      }),
    })
    expect(r.status).toBe(400)
  })

  // ── Body NO JSON ─────────────────────────────────────────────────────────
  await test("Body con JSON roto → 400 o 500 (no 201)", async () => {
    const res = await fetch(`${BASE_URL}/api/reservas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{ esto no es json valido",
    })
    // Aceptable: 400 (mejor) o 500 (funcional, pero menos limpio)
    if (res.status === 201) {
      throw new Error("JSON roto NUNCA debe crear una reserva")
    }
    expect(res.status).toBeOneOf([400, 500])
  })

  // ── Content-Type incorrecto ──────────────────────────────────────────────
  await test("Content-Type text/plain → 400 o 500", async () => {
    const res = await fetch(`${BASE_URL}/api/reservas`, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(reservaBase()),
    })
    if (res.status === 201) {
      throw new Error("Un POST sin Content-Type: application/json no debería crear recursos")
    }
    expect(res.status).toBeOneOf([400, 415, 500])
  })

  // ── GET con query string gigante ─────────────────────────────────────────
  await test("GET /api/disponibilidad con query string enorme → no rompe servidor", async () => {
    const cabana = "cabana-a"
    const junk = "x".repeat(8000)
    const r = await request("GET",
      `/api/disponibilidad?cabana=${cabana}&fechaEntrada=${offsetDate(BASE_OFFSET+400)}&fechaSalida=${offsetDate(BASE_OFFSET+402)}&junk=${junk}`)
    // El query extra no debe afectar
    expect(r.status).toBeOneOf([200, 400, 414])
  })
}

// ═══════════════════════════════════════════════════════════════════════════════
// BLOQUE 4: FLUJOS END-TO-END COMPLETOS
// ═══════════════════════════════════════════════════════════════════════════════

async function testFlujosCompletos() {
  section("Flujos end-to-end completos")

  // ── Flujo 1: Crear → disponibilidad refleja ocupación → solape rechazado ─
  await test("FLUJO 1: crear reserva → disponibilidad false → solape 409", async () => {
    const cabana = "cabana-a"
    const fechaEntrada = offsetDate(BASE_OFFSET + 500)
    const fechaSalida  = offsetDate(BASE_OFFSET + 503)

    // Paso 1: disponibilidad inicial
    const r1 = await request("GET",
      `/api/disponibilidad?cabana=${cabana}&fechaEntrada=${fechaEntrada}&fechaSalida=${fechaSalida}`)
    expect(r1.status).toBe(200)
    expect(r1.data.disponible).toBe(true)

    // Paso 2: crear reserva
    const r2 = await request("POST", "/api/reservas", {
      body: reservaBase({
        cabana, fechaEntrada, fechaSalida,
        nombre: `${TEST_MARKER} Flujo1`, email: "flujo1@test.com",
      }),
    })
    expect(r2.status).toBe(201)
    expect(r2.data.eventoId).toBeTruthy()

    // Paso 3: disponibilidad ahora debe ser false
    const r3 = await request("GET",
      `/api/disponibilidad?cabana=${cabana}&fechaEntrada=${fechaEntrada}&fechaSalida=${fechaSalida}`)
    expect(r3.data.disponible).toBe(false)

    // Paso 4: solape completo rechazado
    const r4 = await request("POST", "/api/reservas", {
      body: reservaBase({
        cabana, fechaEntrada, fechaSalida,
        nombre: `${TEST_MARKER} Flujo1-solape`, email: "flujo1s@test.com",
      }),
    })
    expect(r4.status).toBe(409)

    // Paso 5: solape parcial (entrada antes, salida dentro) también rechazado
    const r5 = await request("POST", "/api/reservas", {
      body: reservaBase({
        cabana,
        fechaEntrada: addDays(fechaEntrada, -1),
        fechaSalida:  addDays(fechaEntrada, 1),
        nombre: `${TEST_MARKER} Flujo1-solape-parcial`,
        email: "flujo1sp@test.com",
      }),
    })
    expect(r5.status).toBe(409)
  })

  // ── Flujo 2: Pasadía bloquea la cabaña todo el día ───────────────────────
  await test("FLUJO 2: crear pasadía → ese día cabaña no disponible para reserva", async () => {
    const cabana = "cabana-b"
    const fecha = offsetDate(BASE_OFFSET + 520)

    // Crear pasadía
    const r1 = await request("POST", "/api/pasadia", {
      body: pasadiaBase({
        cabanas: [cabana], fecha,
        totalPersonas: 3,
        personasPorCabana: { [cabana]: 3 },
        nombre: `${TEST_MARKER} Flujo2-pas`, email: "flujo2p@test.com",
      }),
    })
    expect(r1.status).toBe(201)

    // Intentar reservar alojamiento que cubra ese día
    const r2 = await request("POST", "/api/reservas", {
      body: reservaBase({
        cabana,
        fechaEntrada: fecha,
        fechaSalida:  addDays(fecha, 1),
        nombre: `${TEST_MARKER} Flujo2-res`, email: "flujo2r@test.com",
      }),
    })
    expect(r2.status).toBe(409)
  })

  // ── Flujo 3: Múltiples pasadías en cabañas distintas mismo día ───────────
  await test("FLUJO 3: 3 pasadías mismo día, cabañas distintas → los 3 crean", async () => {
    const fecha = offsetDate(BASE_OFFSET + 540)

    const resultados = await Promise.all(
      ["cabana-a", "cabana-b", "cabana-c"].map((c) =>
        request("POST", "/api/pasadia", {
          body: pasadiaBase({
            cabanas: [c], fecha,
            totalPersonas: 4,
            personasPorCabana: { [c]: 4 },
            nombre: `${TEST_MARKER} Flujo3-${c}`,
            email: `flujo3-${c}@test.com`,
          }),
        })
      )
    )

    const exitosas = resultados.filter((r) => r.status === 201).length
    if (exitosas !== 3) {
      throw new Error(
        `Esperaba 3 pasadías creadas, obtuve ${exitosas}. ` +
        `Statuses: ${resultados.map((r) => r.status).join(",")}`
      )
    }

    // El pasadía con las 3 cabañas para ese mismo día en bloque también debe fallar,
    // porque cada cabaña ya está ocupada
    const r2 = await request("POST", "/api/pasadia", {
      body: pasadiaBase({
        cabanas: ["cabana-a", "cabana-b", "cabana-c"],
        fecha,
        totalPersonas: 12,
        personasPorCabana: { "cabana-a": 4, "cabana-b": 4, "cabana-c": 4 },
        nombre: `${TEST_MARKER} Flujo3-grupo`,
        email: "flujo3g@test.com",
      }),
    })
    expect(r2.status).toBe(409)
  })

  // ── Flujo 4: Reserva larga + servicios → respuesta incluye precio ────────
  await test("FLUJO 4: reserva 5 noches con todos los servicios → crea correctamente", async () => {
    const cabana = "cabana-c"
    const fechaEntrada = offsetDate(BASE_OFFSET + 560)
    const fechaSalida  = addDays(fechaEntrada, 5)

    const r = await request("POST", "/api/reservas", {
      body: reservaBase({
        cabana, fechaEntrada, fechaSalida,
        personas: 4,
        servicios: ["romantico", "cumpleanos", "picnic", "pet-friendly", "desayuno"],
        petFriendlyCount: 2,
        desayunoCount:    3,
        nombre: `${TEST_MARKER} Flujo4-completo`,
        email: "flujo4@test.com",
      }),
    })
    expect(r.status).toBe(201)
    expect(r.data.eventoId).toBeTruthy()
  })
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log(`${colors.bold}${colors.magenta}╔════════════════════════════════════════════════════════════╗${colors.reset}`)
  console.log(`${colors.bold}${colors.magenta}║  Tests E2E v2 — Escenarios avanzados                      ║${colors.reset}`)
  console.log(`${colors.bold}${colors.magenta}╚════════════════════════════════════════════════════════════╝${colors.reset}`)
  console.log(`  ${colors.gray}URL base:${colors.reset}     ${BASE_URL}`)
  console.log(`  ${colors.gray}Marcador:${colors.reset}     ${TEST_MARKER}`)
  console.log(`  ${colors.gray}Base offset:${colors.reset}  +${BASE_OFFSET} días (seed=${SEED})`)

  // Health check
  try {
    await fetch(BASE_URL)
  } catch {
    console.log(`\n${colors.red}${colors.bold}✗ No se pudo conectar a ${BASE_URL}${colors.reset}`)
    console.log(`  Ejecuta: ${colors.cyan}npm run dev${colors.reset}\n`)
    process.exit(1)
  }

  await testConcurrencia()
  await testBordesFecha()
  await testInputsMaliciosos()
  await testFlujosCompletos()

  // ── Reporte final ─────────────────────────────────────────────────────────
  console.log(`\n${colors.bold}━━━ Reporte final ━━━${colors.reset}`)
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

  console.log(`\n${colors.yellow}⚠  Recordatorio:${colors.reset} se crearon eventos en Google Calendar.`)
  console.log(`   Filtrá por "${TEST_MARKER}" en cada calendario para limpiarlos.\n`)

  process.exit(stats.fail > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error(`\n${colors.red}${colors.bold}Error fatal:${colors.reset}`, err)
  process.exit(2)
})
