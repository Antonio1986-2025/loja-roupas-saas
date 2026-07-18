const fs = require("fs");
const xml = fs.readFileSync("scripts/xml-real-enviado.xml", "utf-8");

// Replace xNome with trimmed version (simula o que o trim() no escapeXml fará)
const xmlFixed = xml.replace(
  "<xNome>BERENICE BEZERRA </xNome>",
  "<xNome>BERENICE BEZERRA</xNome>"
);

fs.writeFileSync("scripts/xml-real-enviado-fixed.xml", xmlFixed, "utf-8");
console.log("fixed XML written");
