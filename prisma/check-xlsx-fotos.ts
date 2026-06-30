import * as XLSX from "xlsx";
import path from "path";

const file = path.resolve(__dirname, "../California (LOJA ROUPAS).xlsx");
const wb = XLSX.readFile(file);

const sheet = wb.Sheets["Geral"];
const data = XLSX.utils.sheet_to_json(sheet, { defval: "" }) as Record<string, unknown>[];

console.log(`Total linhas: ${data.length}\n`);

// Quantas linhas tem FOTOS preenchidas
const comFoto = data.filter((r) => r["FOTOS"] && String(r["FOTOS"]).trim() !== "");
console.log(`Linhas com FOTOS preenchidas: ${comFoto.length}`);

// Mostra algumas amostras de fotos
console.log("\n=== Amostras de FOTOS ===");
for (const row of comFoto.slice(0, 10)) {
  console.log(`- ${row["CODIGO/INTERNO"]}: "${row["FOTOS"]}"`);
}

// Categorias únicas
const categorias = new Set<string>();
for (const row of data) {
  const cat = String(row["CATEGORIA"] ?? "").trim();
  if (cat) categorias.add(cat);
}
console.log(`\n=== Categorias únicas (${categorias.size}) ===`);
console.log([...categorias].sort().join(", "));

// Marcas únicas
const marcas = new Set<string>();
for (const row of data) {
  const m = String(row["MARCA"] ?? "").trim();
  if (m) marcas.add(m);
}
console.log(`\n=== Marcas únicas (${marcas.size}) ===`);
console.log([...marcas].sort().join(", "));

// Quantos produtos únicos (agrupando por DESCRIÇÃO+MARCA+CATEGORIA+GENERO)
const produtos = new Set<string>();
for (const row of data) {
  const k = `${row["DESCRIÇÃO"]}|${row["MARCA"]}|${row["CATEGORIA"]}|${row["GENERO"]}`;
  produtos.add(k);
}
console.log(`\nProdutos únicos (agrupados): ${produtos.size}`);
console.log(`Variantes (linhas): ${data.length}`);

// Códigos duplicados
const codigos = new Map<string, number>();
for (const row of data) {
  const c = String(row["CODIGO/INTERNO"] ?? "").trim();
  if (c) codigos.set(c, (codigos.get(c) ?? 0) + 1);
}
const duplicados = [...codigos.entries()].filter(([, n]) => n > 1);
console.log(`\nCódigos duplicados: ${duplicados.length}`);
if (duplicados.length > 0 && duplicados.length <= 20) {
  duplicados.forEach(([c, n]) => console.log(`  ${c}: ${n}x`));
}

// Linhas sem código interno
const semCodigo = data.filter((r) => !r["CODIGO/INTERNO"] || String(r["CODIGO/INTERNO"]).trim() === "");
console.log(`\nLinhas sem CODIGO/INTERNO: ${semCodigo.length}`);
