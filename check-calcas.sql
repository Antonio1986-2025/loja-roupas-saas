SELECT 
  p.nome,
  p."categoriaId",
  COUNT(pv.id) as total_variantes,
  SUM(pv."qtdEstoque") as total_estoque,
  SUM(pv."qtdDisponivel") as total_disponivel,
  STRING_AGG(DISTINCT pv.tamanho, ', ' ORDER BY pv.tamanho) as tamanhos
FROM "Produto" p
JOIN "ProdutoVariante" pv ON pv."produtoId" = p.id
JOIN "Tenant" t ON t.id = p."tenantId"
WHERE t.slug = 'california-store'
  AND (
    LOWER(p.nome) LIKE '%cal%a%'
    OR LOWER(p.nome) LIKE '%pant%'
    OR LOWER(p.nome) LIKE '%jeans%'
    OR LOWER(p.nome) LIKE '%bermuda%'
    OR LOWER(p.nome) LIKE '%calça%'
    OR LOWER(p.nome) LIKE '%calca%'
  )
GROUP BY p.id, p.nome, p."categoriaId"
ORDER BY p.nome;
