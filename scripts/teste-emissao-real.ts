// Teste real (Opção B aprovada pelo usuário): chama a MESMA função usada
// pela API do app (/api/nfe/emitir) para emitir a NF-e de teste da venda
// real da Berenice, no ambiente de HOMOLOGAÇÃO da SEFAZ (sem validade fiscal).
import { emitirNFe, NfeEmissaoError } from "../src/lib/services/nfe-emissao.service";

const TENANT_ID = "cmqv85i07000011oi3t1fj698"; // California Store
const VENDA_ID = "cmrpbo7ok00r3a26t7wymc8ia"; // Venda #158 - Berenice Bezerra

async function main() {
  console.log("Emitindo NF-e de teste (homologação) para a venda #158...");
  try {
    const resultado = await emitirNFe(TENANT_ID, VENDA_ID, "NFE");
    console.log("RESULTADO:", JSON.stringify(resultado, null, 2));
  } catch (err) {
    if (err instanceof NfeEmissaoError) {
      console.log("ERRO NfeEmissaoError:", err.code, "-", err.message, "sCodigo:", err.sCodigo);
    } else {
      console.log("ERRO inesperado:", err);
    }
  }
}

main();
