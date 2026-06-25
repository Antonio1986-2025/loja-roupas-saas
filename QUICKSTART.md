# 🚀 Guia Rápido - California Store

Comece a usar o California Store em menos de 5 minutos!

## ⚡ Instalação Rápida

### Opção 1: Setup Automático (Recomendado)

```bash
# Clone o repositório
git clone <seu-repositorio>
cd californiastore-saas

# Execute o script de setup
chmod +x scripts/setup.sh
./scripts/setup.sh

# Inicie o servidor
npm run dev
```

### Opção 2: Docker (Mais Rápido)

```bash
# Clone o repositório
git clone <seu-repositorio>
cd californiastore-saas

# Configure o .env
cp .env.example .env
# Edite o .env se necessário

# Suba tudo com Docker
docker-compose up -d

# Execute migrations
docker exec californiastore-app npx prisma migrate deploy
docker exec californiastore-app npx prisma db seed
```

Pronto! Acesse: http://localhost:3000

## 🔑 Credenciais Padrão

Após o seed do banco:

```
Email: admin@demo.com
Senha: admin123
```

**⚠️ IMPORTANTE:** Mude essas credenciais em produção!

## 📋 Checklist Pós-Instalação

- [ ] Acessou o sistema com as credenciais padrão
- [ ] Criou sua primeira categoria de produtos
- [ ] Cadastrou um produto
- [ ] Registrou um cliente
- [ ] Verificou o dashboard

## 🎯 Primeiros Passos

### 1. Configure sua Loja

Vá em **Configurações** e preencha:
- Nome da empresa
- CNPJ
- Dados de contato
- Endereço

### 2. Crie Categorias

Em **Produtos** → **Categorias**:
- Camisetas
- Calças
- Vestidos
- Acessórios

### 3. Cadastre Produtos

Em **Produtos** → **Novo Produto**:
1. Preencha informações básicas
2. Adicione variantes (cores e tamanhos)
3. Defina preço e estoque
4. Adicione foto (opcional)

### 4. Cadastre Clientes

Em **Clientes** → **Novo Cliente**:
- Nome completo
- CPF
- Telefone/Email
- Data de nascimento (para promoções)

### 5. Realize uma Venda

Em **PDV**:
1. Busque produtos por código ou nome
2. Adicione ao carrinho
3. Informe cliente (opcional)
4. Selecione forma de pagamento
5. Finalize a venda

## 🛠️ Comandos Úteis

```bash
# Desenvolvimento
npm run dev                 # Inicia servidor dev
npm run build              # Build para produção
npm run start              # Inicia produção

# Database
npm run db:generate        # Gera Prisma Client
npm run db:migrate         # Executa migrations
npm run db:push            # Envia schema sem migration
npm run db:studio          # Abre Prisma Studio
npm run db:seed            # Popula banco com dados

# Docker
docker-compose up -d       # Sobe containers
docker-compose down        # Para containers
docker-compose logs -f     # Ver logs
docker-compose restart     # Reinicia
```

## 📊 Estrutura do Dashboard

O Dashboard mostra:

- **Vendas Hoje**: Total de vendas do dia atual
- **Vendas do Mês**: Faturamento mensal
- **Produtos Ativos**: Quantidade no catálogo
- **Clientes**: Total de clientes cadastrados
- **Alertas**: Estoque baixo, consignações vencidas

## 🔒 Segurança

### Produção

Antes de colocar em produção:

1. **Gere um NEXTAUTH_SECRET forte:**
   ```bash
   openssl rand -base64 32
   ```

2. **Configure variáveis de ambiente:**
   ```env
   NODE_ENV=production
   NEXTAUTH_URL=https://seu-dominio.com
   DATABASE_URL=postgresql://...
   ```

3. **Use HTTPS obrigatório**

4. **Configure firewall:**
   - Libere apenas portas 80, 443
   - Bloqueie porta 5432 (PostgreSQL)

5. **Configure backup automático do banco**

## 🚀 Deploy em VPS

### Passo a Passo

1. **Conecte no servidor:**
   ```bash
   ssh user@seu-servidor
   ```

2. **Instale Docker:**
   ```bash
   curl -fsSL https://get.docker.com | sh
   sudo apt install docker-compose
   ```

3. **Clone o projeto:**
   ```bash
   git clone <seu-repositorio>
   cd californiastore-saas
   ```

4. **Configure .env para produção:**
   ```bash
   cp .env.example .env
   nano .env
   ```

5. **Execute o script de deploy:**
   ```bash
   chmod +x scripts/deploy-vps.sh
   ./scripts/deploy-vps.sh
   ```

6. **Configure Nginx (opcional mas recomendado):**
   ```bash
   sudo apt install nginx
   sudo nano /etc/nginx/sites-available/californiastore
   ```

   ```nginx
   server {
       listen 80;
       server_name seu-dominio.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

   ```bash
   sudo ln -s /etc/nginx/sites-available/californiastore /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

7. **Configure SSL com Certbot:**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d seu-dominio.com
   ```

Pronto! Seu ERP está no ar! 🎉

## 📱 Acesso Mobile

O sistema é totalmente responsivo. Acesse pelo navegador mobile:

- Chrome (Android)
- Safari (iOS)

## 🆘 Problemas Comuns

### Erro de conexão com banco

```bash
# Verifique se o PostgreSQL está rodando
docker-compose ps

# Veja os logs
docker-compose logs postgres
```

### Porta 3000 já em uso

```bash
# Encontre o processo
lsof -i :3000

# Mate o processo (substitua PID)
kill -9 PID
```

### Prisma Client desatualizado

```bash
npm run db:generate
```

### Esqueceu a senha

Conecte no banco e altere:

```sql
-- Com bcrypt hash de "novaSenha123"
UPDATE users 
SET password = '$2a$10$exemplo...' 
WHERE email = 'admin@demo.com';
```

Ou recrie com seed:
```bash
npm run db:seed
```

## 📞 Suporte

- **Documentação**: Veja README.md e ARCHITECTURE.md
- **Issues**: Reporte bugs no GitHub
- **Email**: suporte@californiastore.com

## 🎓 Próximos Passos

1. Leia o [ARCHITECTURE.md](./ARCHITECTURE.md) para entender a arquitetura
2. Veja o [CONTRIBUTING.md](./CONTRIBUTING.md) para padrões de código
3. Explore a [Documentação da API](./docs/API.md) (em breve)
4. Junte-se à comunidade no Discord (em breve)

---

**Dica**: Marque ⭐ este repositório para acompanhar atualizações!
