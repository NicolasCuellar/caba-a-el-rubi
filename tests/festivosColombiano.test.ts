import { describe, expect, it } from "vitest";

import { festivosColombiano } from "@/lib/tarifas";

describe("festivosColombiano", () => {
  it("contiene el festivo fijo de Año Nuevo para 2026", () => {
    const festivos = festivosColombiano(2026);

    expect(festivos).toBeInstanceOf(Set);
    expect(festivos.has("2026-01-01")).toBe(true);
  });
});
