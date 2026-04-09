# QA Checklist

Checklist real por roles para validar la app de punta a punta antes de salida.

## Usuario

- [ ] Registro con cuenta nueva
- [ ] Login y redirección correcta a `/dashboard`
- [ ] Edición de perfil privado: nombre, username único, bio, foto y ciudad
- [ ] Cambio entre perfil privado y perfil público
- [ ] Crear publicación y decidir si se guarda o no en el perfil
- [ ] Crear historia desde el perfil privado
- [ ] Ver historia en grande
- [ ] Borrar historia manualmente
- [ ] Verificar que la historia desaparece a las 24h
- [ ] Seguir y dejar de seguir a otro usuario
- [ ] Confirmar que el seguimiento mutuo aparece como amistad
- [ ] Revisar lista de seguidores y amigos
- [ ] Buscar usuarios desde búsqueda
- [ ] Enviar y recibir mensajes privados
- [ ] Comprobar no leídos y estado leído
- [ ] Entrar en grupos públicos
- [ ] Solicitar acceso a grupo privado
- [ ] Ver notificaciones
- [ ] Entrar al mapa y probar filtros
- [ ] Comprar entrada en un evento
- [ ] Ver entrada generada en `/tickets`
- [ ] Acceder al chat del evento tras comprar entrada

## Local

- [ ] Login y redirección correcta a `/local/dashboard`
- [ ] Perfil privado con accesos de local visibles en móvil y escritorio
- [ ] Crear evento con imagen, fecha, hora de inicio y fin
- [ ] Crear varios tipos de entrada con precio, aforo y consumiciones
- [ ] Ver evento publicado en el listado y en el mapa
- [ ] Confirmar que la ubicación del local aparece correctamente en el mapa
- [ ] Revisar panel del local en móvil y escritorio
- [ ] Revisar analytics, top eventos y compradores
- [ ] Revisar exportación CSV del panel
- [ ] Revisar liquidaciones/payouts
- [ ] Gestionar porteros autorizados
- [ ] Confirmar que un local sin permisos de puerta no ve accesos indebidos al escáner

## Admin

- [ ] Login y acceso al panel admin
- [ ] Aprobar, rechazar y vetar locales
- [ ] Comprobar que el veto quita verificación y despublica eventos
- [ ] Borrar anuncios/eventos desde admin
- [ ] Revisar reportes abiertos
- [ ] Resolver y descartar reportes
- [ ] Suspender y reactivar usuarios
- [ ] Comprobar auditoría visible y eventos de seguridad
- [ ] Confirmar acceso admin al escáner

## Portero

- [ ] Login con usuario asignado como portero
- [ ] Confirmar que aparece acceso al escáner
- [ ] Ver solo eventos autorizados en `/scanner`
- [ ] Escanear entrada válida
- [ ] Confirmar que al escanear se marca como usada una sola vez
- [ ] Escanear entrada ya usada y comprobar feedback correcto
- [ ] Escanear código inválido y comprobar feedback correcto
- [ ] Ver ficha completa de la entrada tras validarla

## Seguridad y permisos

- [ ] Usuario sin sesión redirigido a login en rutas privadas
- [ ] Usuario normal sin acceso a admin, local ni escáner
- [ ] Local sin rol admin sin acceso a panel admin
- [ ] Portero sin acceso a admin ni panel local si no corresponde
- [ ] Usuario suspendido expulsado de sesión
- [ ] Username duplicado bloqueado
- [ ] Bloqueos de usuario respetados en vistas sociales principales
- [ ] Rate limiting activo en login, registro y acciones sensibles
- [ ] Uploads de imagen válidos y rechazos correctos en archivos incorrectos

## Móvil

- [ ] Dashboard sin cortes ni scrolls raros
- [ ] Mapa usable con safe areas y popup completo
- [ ] Chats cómodos con teclado abierto
- [ ] Tickets y QR visibles sin desbordes
- [ ] Escáner usable en móvil real
- [ ] Panel local usable en móvil real
- [ ] Admin usable en móvil real para tareas básicas

## Pagos

- [ ] Compra interna sin Stripe real sigue funcionando
- [ ] Estados pending / processing / failed / expired visibles correctamente
- [ ] La entrada solo aparece cuando el checkout queda completado
- [ ] Comisión de plataforma y gasto de gestión visibles correctamente
