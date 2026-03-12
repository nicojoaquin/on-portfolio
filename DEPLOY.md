# Deploy: ON Portfolio

## Paso 1: Crear la base de datos (Neon — gratis)

1. Ir a https://neon.tech y crear cuenta (con GitHub)
2. Crear un proyecto nuevo (nombre: "on-portfolio")
3. Copiar las dos URLs que te da:
   - `DATABASE_URL` (pooled connection)
   - `DIRECT_URL` (direct connection)

## Paso 2: Subir a GitHub

```bash
git init
git add .
git commit -m "Initial commit: ON Portfolio"
git remote add origin https://github.com/TU_USUARIO/on-portfolio.git
git push -u origin main
```

## Paso 3: Deploy en Vercel (gratis)

1. Ir a https://vercel.com y crear cuenta (con GitHub)
2. Click "New Project" → importar el repo `on-portfolio`
3. En "Environment Variables" agregar:
   - `DATABASE_URL` = la URL pooled de Neon
   - `DIRECT_URL` = la URL direct de Neon
4. Click "Deploy"
5. Esperar ~2 minutos

## Paso 4: Crear las tablas en la DB

Después del primer deploy, correr desde tu PC:

```bash
# Setear las variables de entorno localmente
export DATABASE_URL="postgresql://..."
export DIRECT_URL="postgresql://..."

# Pushear el schema a Neon
npx prisma db push

# (Opcional) Cargar ONs de ejemplo
npm run db:seed
```

## Listo

Tu amigo puede entrar al link que te da Vercel (algo como `on-portfolio.vercel.app`).

## Desarrollo local

Si querés correrlo local con SQLite:

1. Cambiar en `prisma/schema.prisma`:
   - `provider = "sqlite"` (en vez de "postgresql")
   - Borrar la línea `directUrl`
2. En `.env` poner: `DATABASE_URL="file:./dev.db"`
3. `npx prisma db push && npm run db:seed && npm run dev`
