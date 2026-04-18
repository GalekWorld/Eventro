# Eventro

Eventro es una plataforma social y operativa para ocio nocturno y eventos. Reúne descubrimiento social, mapa en tiempo real, mensajería, venta y validación de entradas, herramientas para locales y panel administrativo en una sola aplicación full-stack orientada a móvil.

## Descripción

El proyecto está diseñado para cubrir dos necesidades dentro del mismo producto:

- una capa social para usuarios: perfiles, publicaciones, historias, amigos, grupos, chats y mapa
- una capa operativa para negocio: eventos, tickets, QR, staff de puerta, métricas, payouts y administración

La aplicación está construida con una arquitectura de servidor real, reglas de acceso por rol, validación en backend y un set de utilidades de seguridad preparado para producción.

## Qué hace el proyecto

Eventro permite:

- descubrir eventos y locales desde un mapa interactivo
- seguir a otros usuarios, compartir contenido y participar en historias
- chatear en privado, en grupos y en chats temporales por evento
- comprar entradas y almacenarlas en cartera con QR único
- validar accesos en puerta con personal autorizado
- operar un panel profesional para locales con métricas y gestión
- moderar la plataforma desde un panel administrativo con auditoría

## Funcionalidades principales

### Social

- perfiles públicos y privados
- publicaciones con imagen y visibilidad en perfil
- historias activas y destacadas
- comentarios, likes y reacciones
- seguidores, siguiendo y relaciones mutuas
- mensajería directa y grupos
- notificaciones en tiempo real

### Eventos

- creación y edición de eventos por locales verificados
- tipos de entrada, cupos, visibilidad y horarios
- página de detalle de evento
- chat temporal para asistentes autorizados
- mapa con presencia de locales y actividad

### Tickets y acceso

- compra de entradas
- cartera personal
- QR único por ticket
- validación en puerta
- control de consumiciones
- acceso para admin o staff autorizado

### Locales y administración

- solicitud de alta como local
- aprobación, rechazo o veto por administración
- dashboard con métricas y exportación CSV
- asignación de porteros por local o evento
- panel admin con moderación, reportes y auditoría
- eventos de seguridad y alertas

## Stack tecnológico

- Next.js App Router
- React 19
- TypeScript
- Tailwind CSS
- Prisma
- PostgreSQL
- Zod
- WebSocket (`ws`)
- Leaflet / React Leaflet
- Stripe

## Estructura básica del proyecto

```text
eventro/
├─ prisma/                 # esquema, migraciones y seed
├─ scripts/                # utilidades auxiliares
├─ src/
│  ├─ app/                 # rutas, páginas, APIs y server actions
│  ├─ components/          # componentes y formularios
│  ├─ features/            # lógica de dominio por módulo
│  └─ lib/                 # utilidades transversales, seguridad, pagos, navegación, realtime
├─ server.ts               # servidor custom con soporte WebSocket
└─ README.md
```

## Instalación paso a paso

1. Instala las dependencias:

```bash
npm install
```

2. Crea el archivo de entorno:

```bash
copy .env.example .env
```

3. Configura la base de datos y sincroniza Prisma:

```bash
node_modules\.bin\prisma.cmd db push
node_modules\.bin\prisma.cmd generate
```

4. Arranca el proyecto en local:

```bash
npm run dev
```

La aplicación queda disponible por defecto en `http://localhost:3000`.

## Variables de entorno necesarias

### Base de aplicación

- `DATABASE_URL`
- `DIRECT_URL`
- `JWT_SECRET`
- `APP_URL`
- `NODE_ENV`

### Email

- `RESEND_API_KEY`
- `EMAIL_FROM`

### Push

- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`

### Stripe

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

### Rate limiting y alertas

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `TELEGRAM_SECURITY_MIN_LEVEL`

## Cómo ejecutar en local

```bash
npm run dev
```

Scripts principales:

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run test
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

## Cómo desplegar

El proyecto está pensado para entornos Node con:

- servidor custom
- WebSocket persistente
- PostgreSQL externo
- variables de entorno seguras

### Flujo recomendado

1. Provisiona la base de datos PostgreSQL.
2. Configura las variables de entorno.
3. Ejecuta `prisma generate`.
4. Ejecuta `npm run build`.
5. Arranca con `npm run start`.

### Nota de despliegue

Railway encaja bien con la arquitectura actual porque el proyecto usa `server.ts` y `ws`. Si se despliega en otra plataforma, hay que garantizar soporte para procesos persistentes y WebSocket.

## Buenas prácticas y notas importantes

- `APP_URL` es obligatoria en producción y debe usar `https`.
- La autorización se aplica en backend; ocultar botones en frontend no sustituye validaciones servidor-side.
- El proyecto incluye hardening con CSP, HSTS, validación de origen, rate limiting y eventos de seguridad.
- La suite `npm run test` cubre regresiones ligeras sobre utilidades críticas de seguridad y acceso.
- Antes de producción conviene revisar dependencias y rotar secretos si se han usado en entornos inseguros.

## Estado actual del proyecto

El producto está en una fase avanzada de implementación. La base funcional principal ya está integrada:

- red social
- eventos
- tickets y QR
- mapa
- locales
- administración
- hardening defensivo

Además, el repositorio ya dispone de una primera capa de tests para seguridad, sanitización y control de acceso.

## Próximos pasos

- ampliar cobertura automatizada de flujos completos por rol
- conectar Stripe Connect en entorno real
- reforzar observabilidad operativa
- seguir simplificando archivos grandes de UI y server actions donde aporte claridad real
