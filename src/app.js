import { parseCSV, compareCSV } from "./core.js";
import {
  $,
  init,
  message,
  table,
  stats,
  csv,
  download,
  textImport,
  guard,
  ready,
} from "./ui.js";
init();
let result = null;
const run = () => {
  const delimiter =
    $("delimiter").value === "tab" ? "\t" : $("delimiter").value;
  result = compareCSV(
    parseCSV($("left").value, delimiter),
    parseCSV($("right").value, delimiter),
    $("key").value,
  );
  const counts = ["Added", "Removed", "Changed", "Unchanged"].map((label) => [
    label,
    result.rows.filter((r) => r.status === label).length,
  ]);
  stats(counts);
  render();
  message(
    `Compared ${result.rows.length} keys. Added columns: ${result.addedColumns.join(", ") || "none"}. Removed columns: ${result.removedColumns.join(", ") || "none"}.`,
  );
  ready();
};
function render() {
  const rows = result.rows.filter(
    (r) => $("filter").value === "all" || r.status !== "Unchanged",
  );
  table(
    ["Status", "Key", "Column", "Before", "After"],
    rows.flatMap((r) =>
      r.changes.length
        ? r.changes.map((c) => [
            r.status,
            r.key,
            c.column,
            c.before ?? "— absent —",
            c.after ?? "— absent —",
          ])
        : [[r.status, r.key, "—", "—", "—"]],
    ),
  );
}
$("run").onclick = guard(run);
$("filter").onchange = () => {
  if (result) render();
};
$("export").onclick = () =>
  download(
    csv([
      ["status", "key", "column", "before", "after"],
      ...result.rows.flatMap((r) =>
        r.changes.map((c) => [r.status, r.key, c.column, c.before, c.after]),
      ),
    ]),
    "rowdelta-changes.csv",
    "text/csv;charset=utf-8",
  );
textImport("file-left", "left", () => {
  $("export").disabled = true;
});
textImport("file-right", "right", () => {
  $("export").disabled = true;
});
$("demo").onclick = guard(() => {
  $("left").value =
    "id,name,plan\n1001,Ada,Free\n1002,Lin,Pro\n1003,Sam,Free\n1004,Jo,Team";
  $("right").value =
    "id,name,plan\n1001,Ada,Pro\n1002,Lin,Pro\n1004,Jo,Team\n1005,Ren,Free";
  $("key").value = "id";
  $("delimiter").value = ",";
  run();
});
