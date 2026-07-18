const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const p = new PrismaClient();
p.configuracao.findUnique({where:{tenantId:'cmqv85i07000011oi3t1fj698'}})
.then(c => { 
  if(c?.certificadoA1) { 
    fs.writeFileSync('scripts/certificado.pfx.base64', c.certificadoA1, 'utf-8');
    fs.writeFileSync('scripts/senha.txt', c.senhaCertificado, 'utf-8');
    console.log('OK - cert saved, length:', c.certificadoA1.length);
  } else { console.log('No cert'); }
  return p.$disconnect();
})
.catch(e => console.error(e));
