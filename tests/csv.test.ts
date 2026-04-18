import assert from "node:assert/strict";
import { escapeCsvCell } from "../src/lib/csv.ts";

export function runCsvTests() {
  assert.equal(escapeCsvCell("=SUM(A1:A2)"), "\"'=SUM(A1:A2)\"");
  assert.equal(escapeCsvCell("+cmd"), "\"'+cmd\"");
  assert.equal(escapeCsvCell("-10"), "\"'-10\"");
  assert.equal(escapeCsvCell("@evil"), "\"'@evil\"");

  assert.equal(escapeCsvCell("Sala \"Central\""), "\"Sala \"\"Central\"\"\"");
  assert.equal(escapeCsvCell(42), "\"42\"");
  assert.equal(escapeCsvCell(null), "\"\"");
}
