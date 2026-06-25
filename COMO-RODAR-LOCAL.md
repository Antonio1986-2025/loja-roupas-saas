# 🚀 Como Rodar Localmente - Passo a Passo

## ⚡ Opção 1: Docker (RECOMENDADO)

### 1. Inicie o Docker Desktop

- Abra o **Docker Desktop** no Windows
- Aguarde até aparecer "Docker Desktop is running"

### 2. Abra o terminal na pasta do projeto

```cmd
cd "c:\Users\Admin\Downloads\KIRO PROJETOS\loja de roupas\californiastore-saas"
```

### 3. Suba apenas o PostgreSQL

```cmd
docker-compose up -d postgres
```

### 4. Aguarde 10 segundos para o banco iniciar

### 5. Execute as migrations

```cmd
npx prisma migrate dev --name init
```

### 6. Popule o banco com dados de teste

```cmd
npm run db:seed
```

### 7. Inicie o servidor

```cmd
npm run dev
```

### 8. Acesse no navegador

```
http://localhost:3000
```

**Login:**
- Email: `admin@demo.com`
- Senha: `admin123`

---

## ⚡ Opção 2: PostgreSQL Local (SEM DOCKER)

Se preferir não usar Docker:

### 1. Instale o PostgreSQL

Download: https://www.postgresql.org/download/windows/

### 2. Crie o banco de dados

Abra o **pgAdmin** ou **psql** e execute:

```sql
CREATE USER california WITH PASSWORD 'california123';
CREATE DATABASE californiastore OWNER california;
GRANT ALL PRIVILEGES ON DATABASE californiastore TO california;
```

### 3. Verifique a conexão no .env

Arquivo `.env` deve conter:

```env
DATABASE_URL="postgresql://california:california123@localhost:5432/californiastore"
```

### 4. Execute as migrations

```cmd
npx prisma migrate dev --name init
```

### 5. Popule com dados

```cmd
npm run db:seed
```

### 6. Inicie o servidor

```cmd
npm run dev
```

### 7. Acesse

```
http://localhost:3000
```

---

## 🐛 Problemas Comuns

### "Cannot connect to database"

**Solução 1**: Verifique se o Docker Desktop está rodando

**Solução 2**: Verifique se o PostgreSQL está ativo:

```cmd
docker ps
```

Deve mostrar um container `californiastore-db` rodando.

**Solução 3**: Reinicie o PostgreSQL:

```cmd
docker-compose restart postgres
```

### "Port 5432 already in use"

Você já tem PostgreSQL rodando localmente. Opções:

**A) Parar o PostgreSQL local:**

```cmd
net stop postgresql-x64-14
```

**B) Usar outra porta no docker-compose.yml:**

Edite `docker-compose.yml` e mude:

```yaml
ports:
  - "5433:5432"  # Mudou de 5432 para 5433
```

E no `.env`:

```env
DATABASE_URL="postgresql://california:california123@localhost:5433/californiastore"
```

### "Prisma Client is not generated"

Execute:

```cmd
npx prisma generate
```

### "Migration failed"

Resetar o banco:

```cmd
npx prisma migrate reset
```

---

## ✅ Comandos Úteis

```cmd
# Ver logs do Docker
docker-compose logs -f postgres

# Parar tudo
docker-compose down

# Reiniciar banco
docker-compose restart postgres

# Acessar o banco diretamente
docker exec -it californiastore-db psql -U california -d californiastore

# Ver tabelas criadas
docker exec californiastore-db psql -U california -d californiastore -c "\dt"

# Abrir Prisma Studio (visualizador do banco)
npx prisma studio
```

---

## 🎯 Checklist de Sucesso

- [ ] Docker Desktop rodando
- [ ] Container postgres ativo (`docker ps`)
- [ ] Migrations executadas (sem erros)
- [ ] Seed executado (criou usuário admin)
- [ ] Servidor rodando (`npm run dev`)
- [ ] Acessou http://localhost:3000
- [ ] Fez login com admin@demo.com

---

## 💡 Dica

Se continuar com problemas, me avise qual erro específico está aparecendo!
