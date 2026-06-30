import * as XLSX from "xlsx";
import path from "path";

const file = path.resolve(__dirname, "../California (LOJA ROUPAS).xlsx");
const wb = XLSX.readFile(file);

console.log("📄 Planilhas encontradas:");
for (const sheetName of wb.SheetNames) {
  const sheet = wb.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { defval: "" }) as Record<string, unknown>[];
  console.log(`\n=== ${sheetName} (${data.length} linhas) ===`);
  if (data.length > 0) {
    console.log("Colunas:", Object.keys(data[0]).join(", "));
    console.log("Primeira linha:");
    console.log(JSON.stringify(data[0], null, 2));
    if (data.length > 1) {
      console.log("Segunda linha:");
      console.log(JSON.stringify(data[1], null, 2));
    }
  }
}
