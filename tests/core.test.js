import test from "node:test";
import assert from "node:assert/strict";
import { parseCSV, compareCSV } from "../src/core.js";
test("quoted commas, newlines, escaped quotes, BOM and CRLF", () =>
  assert.deepEqual(parseCSV('\uFEFFid,note\r\n1,"a,b\n""yes"""\r\n').rows, [
    ["1", 'a,b\n"yes"'],
  ]));
test("keyed diff ignores row and column order, preserves whitespace", () => {
  const r = compareCSV(
    parseCSV("id,v\na,1\nb,2\nc,3"),
    parseCSV("v,id\n2,b\n9,a\n4,d"),
    "id",
  );
  assert.deepEqual(
    r.rows.map((x) => x.status),
    ["Changed", "Unchanged", "Removed", "Added"],
  );
});
test("schema changes are explicit even with no rows", () => {
  const r = compareCSV(parseCSV("id,a"), parseCSV("id,b"), "id");
  assert.deepEqual(r.addedColumns, ["b"]);
  assert.deepEqual(r.removedColumns, ["a"]);
});
test("rejects malformed tables and ambiguous keys", () => {
  for (const text of [
    "id,id\n1,2",
    "id,v\n1",
    'id,v\n1,"abc',
    'id,v\n1,"a"oops',
  ])
    assert.throws(() => parseCSV(text));
  assert.throws(() =>
    compareCSV(parseCSV("id,v\n1,a\n1,b"), parseCSV("id,v"), "id"),
  );
  assert.throws(() => compareCSV(parseCSV("id,v\n,x"), parseCSV("id,v"), "id"));
});
