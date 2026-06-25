SELECT ei.id, ei.quantidade, ei."precoUnitario"::text, ei."precoCusto"::text, ei."custoFinal"::text, ei."margemLucro"::text, ei."precoVendaSugerido"::text, ei."valorICMS"::text, ei."valorPIS"::text, ei."valorCOFINS"::text, p.nome as produto_nome, pv.nome as variante_nome
FROM entrada_mercadoria_itens ei
LEFT JOIN produto_variantes pv ON pv.id = ei."varianteId"
LEFT JOIN produtos p ON p.id = pv."produtoId"
WHERE ei."entradaId" = 'cmqr73t29000212729cbotu2a'
ORDER BY p.nome;
