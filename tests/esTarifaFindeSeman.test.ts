import { describe, expect, it } from "vitest";

import { esTarifaFinDeSemana } from "@/lib/tarifas";

describe("esTarifaFinDeSemana", () => {
  it("devuelve true para un viernes", () => {
    expect(esTarifaFinDeSemana("2026-04-17")).toBe(true);
  });

  it("devuelve true para un sabado", () => {
    expect(esTarifaFinDeSemana("2026-04-18")).toBe(true);
  });

  it("devuelve true para un domingo", () => {
    expect(esTarifaFinDeSemana("2026-04-19")).toBe(true);
  });

  it("devuelve false para un lunes", () => {
    expect(esTarifaFinDeSemana("2026-04-20")).toBe(false);
  });

  it("detecta un festivo CO en dia de semana", () => {
    expect(esTarifaFinDeSemana("2026-06-29")).toBe(true);
  });

  it("acepta un objeto Date igual que un string", () => {
    expect(esTarifaFinDeSemana(new Date("2026-04-18T12:00:00"))).toBe(true);
  });
});
