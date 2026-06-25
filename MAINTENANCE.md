# 🔧 Guia de Manutenção - California Store

## 📊 Monitoramento

### Métricas Essenciais

Monitore diariamente:

- ✅ Uptime do servidor
- ✅ Tempo de resposta (< 2s)
- ✅ Uso de CPU (< 70%)
- ✅ Uso de RAM (< 80%)
- ✅ Uso de disco (< 80%)
- ✅ Conexões do banco (< 80% do pool)
- ✅ Taxa de erro (< 1%)

### Ferramentas Recomendadas

**Gratuitas:**
- UptimeRobot - Monitoramento de uptime
- Google Analytics - Uso do sistema
- Grafana + Prometheus - Métricas customizadas

**Pagas:**
- DataDog - APM completo
- New Relic - Performance
- Sentry - Error tracking

## 💾 Backup

### Estratégia 3-2-1

- **3** cópias dos dados
- **2** tipos de mídia diferentes
- **1** cópia offsite

### Backup do PostgreSQL

#### Backup Manual

```bash
# Backup completo
docker exec californiastore-db pg_dump -U california californiastore > backup_$(date +%Y%m%d).sql

# Compactar
gzip backup_$(date +%Y%m%d).sql
```

#### Backup Automatizado (Cron)

```bash
# Editar crontab
crontab -e

# Adicionar (backup diário às 3h da manhã)
0 3 * * * /usr/local/bin/backup-california.sh
```

**Script de backup:**

```bash
#!/bin/bash
# /usr/local/bin/backup-california.sh

BACKUP_DIR="/backup/californiastore"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="californiastore"
RETENTION_DAYS=30

mkdir -p $BACKUP_DIR

# Backup do banco
docker exec californiastore-db pg_dump -U california $DB_NAME | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Backup de uploads (se houver)
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz /var/californiastore/uploads

# Enviar para S3 (opcional)
# aws s3 cp $BACKUP_DIR/db_$DATE.sql.gz s3://meu-bucket/backups/

# Remover backups antigos
find $BACKUP_DIR -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup concluído: $DATE"
```

```bash
# Dar permissão de execução
chmod +x /usr/local/bin/backup-california.sh
```

### Restaurar Backup

```bash
# Parar aplicação
docker-compose down app

# Restaurar banco
gunzip backup_20260616.sql.gz
docker exec -i californiastore-db psql -U california californiastore < backup_20260616.sql

# Reiniciar
docker-compose up -d
```

## 🔄 Atualizações

### Atualizar Código

```bash
# 1. Fazer backup
./scripts/backup.sh

# 2. Baixar última versão
git pull origin main

# 3. Instalar dependências
npm install

# 4. Executar migrations
npm run db:migrate

# 5. Rebuild (se Docker)
docker-compose build

# 6. Reiniciar
docker-compose restart
```

### Atualizar Dependências

```bash
# Ver dependências desatualizadas
npm outdated

# Atualizar patch versions
npm update

# Atualizar major versions (cuidado!)
npm install package@latest
```

### Rollback

Se algo der errado:

```bash
# Voltar commit
git reset --hard HEAD~1

# Rebuild
docker-compose build

# Restaurar banco (se necessário)
# ... usar backup
```

## 🐛 Troubleshooting

### Aplicação não inicia

```bash
# Ver logs
docker-compose logs app

# Problemas comuns:
# 1. Banco não conecta - verificar DATABASE_URL
# 2. Porta ocupada - mudar porta no docker-compose
# 3. Memória insuficiente - aumentar RAM do container
```

### Banco de dados travado

```bash
# Ver conexões ativas
docker exec californiastore-db psql -U california -c "SELECT * FROM pg_stat_activity;"

# Matar conexões problemáticas
docker exec californiastore-db psql -U california -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'californiastore';"
```

### Disco cheio

```bash
# Ver uso de disco
df -h

# Limpar logs do Docker
docker system prune -a

# Limpar backups antigos
find /backup -mtime +30 -delete
```

### Memória alta

```bash
# Ver uso de memória
free -h

# Reiniciar aplicação
docker-compose restart app

# Aumentar swap (temporário)
sudo swapon --show
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

## 🔒 Segurança

### Checklist Mensal

- [ ] Atualizar dependências com vulnerabilidades
- [ ] Revisar logs de acesso
- [ ] Verificar tentativas de login falhadas
- [ ] Atualizar sistema operacional
- [ ] Revisar permissões de usuários
- [ ] Testar restauração de backup

### Hardening

```bash
# Firewall (UFW)
sudo ufw allow 22/tcp  # SSH
sudo ufw allow 80/tcp  # HTTP
sudo ufw allow 443/tcp # HTTPS
sudo ufw enable

# Fail2ban (proteção contra brute force)
sudo apt install fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Auto-updates de segurança
sudo apt install unattended-upgrades
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

### Auditoria de Segurança

```bash
# Escanear vulnerabilidades npm
npm audit

# Corrigir automaticamente
npm audit fix

# Escanear portas abertas
nmap localhost

# Verificar SSL
openssl s_client -connect seu-dominio.com:443
```

## 📊 Otimização de Performance

### Database

```sql
-- Analisar queries lentas
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Vacuum (manutenção do banco)
VACUUM ANALYZE;

-- Reindex
REINDEX DATABASE californiastore;
```

### Índices Importantes

```sql
-- Já criados no schema, mas se precisar adicionar:
CREATE INDEX idx_produtos_tenant ON produtos(tenantId);
CREATE INDEX idx_vendas_created ON vendas(createdAt);
CREATE INDEX idx_variantes_barcode ON produto_variantes(codigoBarras);
```

### Application

```bash
# Analisar bundle size
npm run build
du -sh .next

# Habilitar compressão no Nginx
gzip on;
gzip_comp_level 5;
gzip_types text/plain text/css application/json application/javascript;
```

## 📈 Escalabilidade

### Quando escalar?

Sinais de que precisa escalar:

- ⚠️ CPU consistentemente > 70%
- ⚠️ RAM consistentemente > 80%
- ⚠️ Response time > 3s
- ⚠️ Mais de 1000 usuários simultâneos
- ⚠️ Database queries lentas

### Escala Vertical (Simples)

```bash
# Aumentar recursos do VPS
# Via painel do provedor:
# - CPU: 2 → 4 cores
# - RAM: 4GB → 8GB
# - Disco: 50GB → 100GB
```

### Escala Horizontal (Avançado)

```
                    ┌─────────────┐
                    │   Nginx     │
                    │Load Balancer│
                    └─────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
   ┌─────────┐       ┌─────────┐      ┌─────────┐
   │  App 1  │       │  App 2  │      │  App 3  │
   └─────────┘       └─────────┘      └─────────┘
        │                 │                 │
        └─────────────────┼─────────────────┘
                          ▼
                  ┌──────────────┐
                  │  PostgreSQL  │
                  │   (Master)   │
                  └──────────────┘
                          │
                          ▼
                  ┌──────────────┐
                  │  PostgreSQL  │
                  │   (Replica)  │
                  └──────────────┘
```

## 🔔 Alertas

### Configurar Alertas no UptimeRobot

1. Criar conta em uptimerobot.com
2. Adicionar monitor HTTP(S)
3. Configurar notificações:
   - Email
   - SMS
   - Webhook (Slack/Discord)

### Alertas de Disco

```bash
# Script de alerta
#!/bin/bash
THRESHOLD=80
USAGE=$(df -h / | tail -1 | awk '{print $5}' | sed 's/%//')

if [ $USAGE -gt $THRESHOLD ]; then
    echo "ALERTA: Disco em ${USAGE}%" | mail -s "Disco Cheio" admin@email.com
fi
```

## 📝 Logs

### Localização

```bash
# Logs do Docker
docker-compose logs app
docker-compose logs postgres

# Logs do Nginx
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Logs do sistema
tail -f /var/log/syslog
```

### Rotação de Logs

```bash
# /etc/logrotate.d/californiastore
/var/log/californiastore/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        docker-compose restart app > /dev/null
    endscript
}
```

## 🎯 Checklist Semanal

- [ ] Verificar uptime (deve estar > 99%)
- [ ] Revisar logs de erro
- [ ] Verificar uso de recursos
- [ ] Testar backup (restaurar em ambiente de teste)
- [ ] Verificar velocidade do site
- [ ] Atualizar dependências críticas

## 🎯 Checklist Mensal

- [ ] Executar `npm audit`
- [ ] Revisar e otimizar queries lentas
- [ ] Limpar dados antigos (logs, sessões)
- [ ] Revisar permissões de usuários
- [ ] Atualizar sistema operacional
- [ ] Verificar certificado SSL (validade)
- [ ] Revisar capacidade de infraestrutura

## 🎯 Checklist Trimestral

- [ ] Auditoria completa de segurança
- [ ] Revisar e atualizar documentação
- [ ] Planejar melhorias de performance
- [ ] Revisar plano de disaster recovery
- [ ] Testar procedimento de rollback
- [ ] Revisar custos de infraestrutura

## 📞 Contatos de Emergência

| Tipo | Contato |
|------|---------|
| Desenvolvedor Principal | dev@californiastore.com |
| DevOps | devops@californiastore.com |
| Suporte Técnico | suporte@californiastore.com |
| Provedor VPS | suporte@provedor.com |

## 🆘 Plano de Disaster Recovery

### RTO (Recovery Time Objective)

Tempo máximo aceitável de downtime: **4 horas**

### RPO (Recovery Point Objective)

Máximo de dados que podemos perder: **24 horas**

### Procedimento

1. **Detectar**: Sistema de monitoramento alerta
2. **Avaliar**: Determinar gravidade (P1-P4)
3. **Comunicar**: Notificar clientes
4. **Restaurar**: Executar plano de recuperação
5. **Validar**: Testar sistema restaurado
6. **Documentar**: Pós-mortem completo

---

**Mantenha este documento atualizado!**
