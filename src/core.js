export function parseCSV(text, delimiter = ",") {
  if (![",", ";", "\t"].includes(delimiter))
    throw new Error("Unsupported delimiter.");
  text = text.replace(/^\uFEFF/, "");
  const rows = [];
  let row = [],
    field = "",
    quoted = false,
    closed = false;
  const cell = () => {
    row.push(field);
    field = "";
    closed = false;
  };
  const line = () => {
    cell();
    if (row.some((x) => x !== "")) rows.push(row);
    row = [];
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
          closed = true;
        }
      } else field += c;
      continue;
    }
    if (c === delimiter) {
      cell();
      continue;
    }
    if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      line();
      continue;
    }
    if (closed) throw new Error("Unexpected text after a closing quote.");
    if (c === '"') {
      if (field) throw new Error("A quoted field must start with a quote.");
      quoted = true;
    } else field += c;
  }
  if (quoted) throw new Error("Unclosed quoted field.");
  if (field !== "" || row.length || closed) line();
  if (!rows.length) throw new Error("The CSV is empty.");
  const headers = rows.shift();
  if (headers.some((x) => !x) || new Set(headers).size !== headers.length)
    throw new Error("Column names must be non-empty and unique.");
  rows.forEach((r, i) => {
    if (r.length !== headers.length)
      throw new Error(
        `Row ${i + 2} has ${r.length} cells; expected ${headers.length}.`,
      );
  });
  return { headers, rows };
}
export function compareCSV(a, b, key) {
  if (!a.headers.includes(key) || !b.headers.includes(key))
    throw new Error(`Both CSV files must contain the key column "${key}".`);
  const keyed = (data, label) => {
    const index = data.headers.indexOf(key),
      map = new Map();
    for (const row of data.rows) {
      const id = row[index];
      if (!id) throw new Error(`${label}: empty key.`);
      if (map.has(id))
        throw new Error(
          `${label}: duplicate key "${id}". Choose a unique key column.`,
        );
      map.set(id, row);
    }
    return map;
  };
  const left = keyed(a, "A"),
    right = keyed(b, "B"),
    headers = [...new Set([...a.headers, ...b.headers])];
  const rows = [];
  for (const id of new Set([...left.keys(), ...right.keys()])) {
    const x = left.get(id),
      y = right.get(id);
    if (!x) {
      rows.push({
        status: "Added",
        key: id,
        changes: b.headers.map((column, i) => ({
          column,
          before: null,
          after: y[i],
        })),
      });
      continue;
    }
    if (!y) {
      rows.push({
        status: "Removed",
        key: id,
        changes: a.headers.map((column, i) => ({
          column,
          before: x[i],
          after: null,
        })),
      });
      continue;
    }
    const changes = [];
    for (const column of headers) {
      const ai = a.headers.indexOf(column),
        bi = b.headers.indexOf(column),
        before = ai < 0 ? null : x[ai],
        after = bi < 0 ? null : y[bi];
      if (before !== after) changes.push({ column, before, after });
    }
    rows.push({
      status: changes.length ? "Changed" : "Unchanged",
      key: id,
      changes,
    });
  }
  return {
    rows,
    addedColumns: b.headers.filter((x) => !a.headers.includes(x)),
    removedColumns: a.headers.filter((x) => !b.headers.includes(x)),
  };
}
