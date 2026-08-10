import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyPgrccIatFormData } from "../src/lib/templates/pgrcc-iat/config";
import { buildDocxData } from "../src/lib/templates/pgrcc-iat/generate";

test("volume de destinação = total da classe − reutilização/reciclagem", () => {
  const form = emptyPgrccIatFormData();

  form.caracterizacao = form.caracterizacao.map((r) => {
    if (r.id === "solo") return { ...r, demolicao: "100", construcao: "" };
    if (r.id === "ceramicos") return { ...r, demolicao: "50", construcao: "" };
    if (r.id === "plasticos") return { ...r, demolicao: "30", construcao: "" };
    return r;
  });

  form.reutilizacao = form.reutilizacao.map((r) => {
    if (r.id === "solo") return { ...r, processo: "Aterro", quantidade: "40" };
    if (r.id === "ceramicos") return { ...r, processo: "Britagem", quantidade: "10" };
    if (r.id === "plasticos") return { ...r, processo: "Reciclagem", quantidade: "5" };
    return r;
  });

  const data = buildDocxData(form);

  assert.equal(data["char_total_a"], "150");
  assert.equal(data["char_total_b"], "30");
  assert.equal(data["char_total_geral"], "180");

  assert.equal(data["dest_a_volume"], "100"); // 150 − 50
  assert.equal(data["dest_b_volume"], "25"); // 30 − 5
  assert.equal(data["dest_c_volume"], ""); // sem reutilização C → 0
  assert.equal(data["dest_d_volume"], "");

  assert.equal(data["transp_quant_solo"], "60"); // 100 − 40
  assert.equal(data["transp_quant_exceto_solo"], "40"); // (150−100) − (50−40)
  assert.equal(data["transp_quant_b"], "25");
});

test("sem reutilização, volume de destinação = total da classe", () => {
  const form = emptyPgrccIatFormData();

  form.caracterizacao = form.caracterizacao.map((r) =>
    r.id === "solo" ? { ...r, demolicao: "80", construcao: "" } : r
  );

  const data = buildDocxData(form);

  assert.equal(data["dest_a_volume"], "80");
  assert.equal(data["transp_quant_solo"], "80");
});
