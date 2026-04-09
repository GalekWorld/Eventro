# Eventro

Plataforma social mobile-first centrada en ocio, eventos, mapa social y gestión profesional para locales.

Hecho por **GalekNetwork**.

## Descripción

Eventro une en una sola aplicación varias capas de producto:

- red social visual y geolocalizada
- descubrimiento de ocio y eventos
- chats privados, grupos y comunidad
- mapa social con amigos y locales activos
- venta y validación de entradas con QR
- herramientas profesionales para locales
- panel de administración, moderación y auditoría

La app está pensada principalmente para móvil, aunque mantiene experiencia completa en escritorio.

## Funcionalidades principales

### Red social

- perfiles públicos y privados
- `username` único como identidad pública
- foto de perfil, bio, ciudad y ubicación opcional
- feed `Descubre`
- feed `Amigos` para relaciones mutuas
- publicaciones con imagen
- historias con duración configurable
- posibilidad de mostrar o no un post en el perfil
- seguidores, seguidos y lista real de amigos
- comentarios y likes
- likes en comentarios
- búsqueda de usuarios
- notificaciones

### Comunidad y mensajería

- mensajes privados 1 a 1
- estados de leído
- indicador de escribiendo
- grupos públicos y privados
- invitaciones y solicitudes de acceso a grupos privados
- chat dentro de grupos
- chat temporal por evento para usuarios con entrada
- actualización en tiempo real para mensajes y notificaciones

### Eventos

- publicación de eventos por locales verificados
- detalle completo del evento
- enlaces limpios mediante `slug`
- ubicación precisa
- subida de imagen por archivo
- tipos de entrada por evento
- control de precio, cupo y visibilidad
- enlace para compartir el evento

### Entradas y acceso

- compra de entradas
- QR único por entrada
- cartera de entradas del usuario
- vista individual de cada entrada
- descarga de entrada
- política de no devolución reflejada en producto
- validación en puerta
- personal autorizado por local
- control de acceso ligado al local correcto
- una entrada solo puede validarse una vez

### Locales

- solicitud de alta como local
- aprobación, rechazo o veto por admin
- verificación visual pública
- gestión de eventos
- asignación de porteros / staff de puerta
- panel avanzado con métricas
- ingresos brutos y netos estimados
- comisión de plataforma
- compradores, visitas, conversión y rankings
- exportación CSV
- payouts y liquidaciones preparados para Stripe Connect

### Mapa social

- mapa real con Leaflet y OpenStreetMap
- amigos cercanos con privacidad configurable
- locales con actividad por rango temporal
- clustering de marcadores
- recentrado en tu posición
- modo fantasma, ubicación aproximada o exacta
- ficha del local en mapa
- acceso a rutas externas para llegar

### Moderación y administración

- panel admin
- revisión de locales
- reportes de usuarios y contenido
- bloqueo de usuarios
- suspensión de cuentas
- ocultación automática por umbral de reportes
- auditoría de acciones administrativas
- alertas por Telegram

### Seguridad de cuenta

- cierre de sesión seguro
- cambio de contraseña por correo
- tokens temporales para reseteo
- invalidación de sesiones al cambiar contraseña

## Seguridad implementada

- sesiones con cookie `httpOnly`
- validación en servidor de acciones sensibles
- comprobación estricta de roles y ownership
- rate limiting en login, registro y acciones críticas
- rate limiting persistente para escenarios de abuso
- validación de origen en APIs sensibles
- cabeceras de seguridad
- protección básica anti-spam
- validación de uploads por tipo, tamaño y firma real
- auditoría de acciones administrativas
- eventos de seguridad listos para alertas

## Pagos

La base de pagos está preparada para Stripe y Stripe Connect:

- checkout persistido
- estados de pago
- webhooks
- liquidaciones
- desglose entre:
  - precio base
  - comisión de plataforma
  - gastos de gestión

Actualmente el sistema está listo para conectarse a cuentas reales de Stripe cuando se configuren las claves necesarias.

## Stack técnico

- Next.js App Router
- React 19
- TypeScript
- Tailwind CSS
- Prisma
- PostgreSQL
- WebSocket (`ws`)
- Leaflet / React Leaflet
- Stripe
- Zod

## Estructura del proyecto

- `src/app`
  Rutas y páginas de la aplicación
- `src/app/actions`
  Server Actions
- `src/components`
  Componentes reutilizables y formularios
- `src/features`
  Lógica de dominio
- `src/lib`
  Utilidades, seguridad, analytics, realtime, pagos, mapa y helpers
- `prisma`
  Esquema, cliente y seed
- `scripts`
  Scripts auxiliares

## Requisitos

- Node.js 20+
- PostgreSQL
- npm

## Puesta en marcha

1. Instala dependencias

```bash
npm install
```

2. Crea el archivo de entorno

```bash
copy .env.example .env
```

3. Configura la base de datos y genera Prisma

```bash
node_modules\.bin\prisma.cmd db push
node_modules\.bin\prisma.cmd generate
```

4. Arranca en desarrollo

```bash
npm run dev
```

La app quedará disponible, por defecto, en:

```text
http://localhost:3000
```

## Scripts útiles

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

## Variables de entorno importantes

### Base

- `DATABASE_URL`
- `JWT_SECRET`
- `APP_URL`
- `NEXT_PUBLIC_APP_URL`

### Telegram

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`

### Email

- `RESEND_API_KEY`
- `EMAIL_FROM`

### Stripe

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

## Despliegue

El proyecto está preparado para desplegarse en plataformas Node con soporte para:

- Next.js
- WebSocket
- PostgreSQL
- procesos persistentes

### Railway

La opción recomendada para este proyecto es **Railway**, porque la app usa:

- servidor custom en `server.ts`
- WebSocket con `ws`
- base de datos externa

Para facilitar el despliegue, el repositorio incluye:

- `Dockerfile`
- `.dockerignore`

Pasos recomendados en Railway:

1. Crea un proyecto nuevo en Railway
2. Conecta este repositorio o súbelo desde GitHub
3. Railway detectará el `Dockerfile`
4. Añade las variables de entorno del archivo `.env`
5. Configura una base de datos PostgreSQL
6. Asegúrate de poner:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `APP_URL`
   - `NEXT_PUBLIC_APP_URL`
7. Despliega

Una vez desplegado, la app arrancará con:

```bash
npm run start
```

que internamente usa el servidor custom con WebSocket.

## Estado del proyecto

Eventro está en una fase avanzada de producto, con la mayor parte de la funcionalidad principal ya integrada:

- red social
- eventos
- mapa
- locales
- admin
- tickets
- QR
- pagos preparados

Los siguientes pasos naturales de cierre suelen ser:

- conexión real de Stripe
- QA completo por roles
- pulido final de responsive
- endurecimiento final de seguridad e infraestructura

## Créditos

Desarrollado por **GalekNetwork & OpenAI**.
