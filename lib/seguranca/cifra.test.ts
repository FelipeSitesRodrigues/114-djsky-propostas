import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { cifrar, codigoPublico, decifrar, hashSecreto } from "./cifra.ts";

const k = randomBytes(32);

test("cifra e decifra, e cada cifragem sai diferente", () => {
  const dado = { cpf: "52998224725", rua: "Rua A, 10" };
  const a = cifrar(dado, k);
  const b = cifrar(dado, k);
  assert.notEqual(a, b);
  assert.ok(!a.includes("52998224725"));
  assert.deepEqual(decifrar(a, k), dado);
});

test("texto adulterado ou chave errada não decifra", () => {
  const a = cifrar("x", k);
  const partes = a.split(".");
  partes[3] = Buffer.from("y").toString("base64url");
  assert.throws(() => decifrar(partes.join("."), k));
  assert.throws(() => decifrar(a, randomBytes(32)));
});

test("código público tem 24 caracteres sem ambíguos e não repete", () => {
  const vistos = new Set();
  for (let i = 0; i < 2000; i++) {
    const c = codigoPublico();
    assert.match(c, /^[A-HJ-NP-Za-km-z2-9]{24}$/);
    vistos.add(c);
  }
  assert.equal(vistos.size, 2000);
  assert.equal(hashSecreto("1.2.3.4", k), hashSecreto("1.2.3.4", k));
});
