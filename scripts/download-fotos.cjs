const https = require('https');
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'produtos');

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const produtos = await prisma.produto.findMany({
    where: {
      fotoUrl: { not: null },
      tenantId: 'cmqhcuaun000043wrctdkna77',
    },
    select: { id: true, codigoInterno: true, nome: true, fotoUrl: true },
  });

  console.log(`Total produtos com foto: ${produtos.length}`);

  let baixados = 0;
  let erros = 0;
  let jaExistem = 0;

  // Process in parallel batches of 3
  const BATCH = 3;

  for (let i = 0; i < produtos.length; i += BATCH) {
    const batch = produtos.slice(i, i + BATCH);
    await Promise.all(batch.map(async (prod) => {
      const ext = 'png';
      const fileName = `${prod.codigoInterno || prod.id}.${ext}`;
      const filePath = path.join(OUTPUT_DIR, fileName);

      if (fs.existsSync(filePath) && fs.statSync(filePath).size > 1000) {
        jaExistem++;
        return;
      }

      const fileId = extractId(prod.fotoUrl);
      if (!fileId) {
        erros++;
        console.log(`  ERRO: Nao foi possivel extrair ID de: ${prod.fotoUrl}`);
        return;
      }

      try {
        await downloadImage(fileId, filePath);
        baixados++;
        if (baixados % 50 === 0) console.log(`  Progresso: ${baixados} baixados, ${jaExistem} ja existem, ${erros} erros`);
      } catch (err) {
        erros++;
        console.log(`  ERRO ao baixar ${prod.codigoInterno || prod.id}: ${err.message}`);
      }
    }));

    // Small delay between batches to avoid rate limiting
    if (i + BATCH < produtos.length) {
      await sleep(300);
    }
  }

  console.log(`\nResumo:`);
  console.log(`  Baixados: ${baixados}`);
  console.log(`  Ja existem: ${jaExistem}`);
  console.log(`  Erros: ${erros}`);
  console.log(`  Total: ${produtos.length}`);

  // Now update DB URLs
  console.log(`\nAtualizando URLs no banco de dados...`);
  let atualizados = 0;
  for (const prod of produtos) {
    const fileName = `${prod.codigoInterno || prod.id}.png`;
    const filePath = path.join(OUTPUT_DIR, fileName);
    if (fs.existsSync(filePath) && fs.statSync(filePath).size > 1000) {
      await prisma.produto.update({
        where: { id: prod.id },
        data: { fotoUrl: `/produtos/${fileName}` },
      });
      atualizados++;
      if (atualizados % 100 === 0) console.log(`  Atualizados: ${atualizados}`);
    }
  }
  console.log(`  URLs atualizadas: ${atualizados}`);
}

function extractId(url) {
  if (!url) return null;
  const patterns = [
    /\/d\/([^/?&]+)/,
    /[?&]id=([^&]+)/,
    /\/file\/d\/([^/?&]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function downloadImage(fileId, filePath) {
  return new Promise((resolve, reject) => {
    const url = `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`;
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.headers.location) {
        https.get(res.headers.location, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res2) => {
          if (res2.statusCode !== 200) {
            reject(new Error(`HTTP ${res2.statusCode}`));
            return;
          }
          const stream = fs.createWriteStream(filePath);
          res2.pipe(stream);
          stream.on('finish', () => resolve());
          stream.on('error', reject);
        }).on('error', reject);
      } else {
        reject(new Error(`No redirect, HTTP ${res.statusCode}`));
      }
    }).on('error', reject);
  });
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

main().catch(console.error).finally(() => process.exit(0));
