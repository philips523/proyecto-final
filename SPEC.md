# SPEC.md — tatypeluqueria

## 1. Resumen del sistema y regla de oro
Sistema web de gestión de turnos para la barbería **tatypeluqueria**, con alcance controlado: sin pagos reales, sin envíos de correos reales, sin depender del reloj real del servidor y sin asignar peluqueros nominales.

**Regla de oro:** si más adelante se cambia o agrega alguna función o regla, primero se actualiza `SPEC.md` y recién después se modifica el código.

## 2. Roles y pantallas (`frontend/`)
- **Pantalla de Login / selección de rol**: permite ingresar como **Cliente** o **Administrador**.
- **Vista Cliente**:
  - Catálogo de servicios: *Corte clásico* ($10.000 - 30 min), *Corte + Barba* ($14.000 - 30 min), *Corte + Lavado* ($12.000 - 30 min).
  - Consulta de disponibilidad por día hábil (lunes a viernes) y bloques de 30 minutos con inicio entre 11:00 y 17:30 (cierre 18:00), controlando máximo 5 turnos simultáneos por franja y bloqueando fechas/horas pasadas según el reloj simulado.
  - Reserva de turno (validando máximo 2 turnos activos `Confirmado` por cliente).
  - Listado y cancelación de turnos propios `Confirmado` solo si faltan al menos 2 horas respecto al reloj simulado.
  - Chat del **Agente de IA** embebido.
- **Vista Administrador**:
  - Agenda completa de turnos con estados `Confirmado`, `Cancelado` y `Completado`.
  - Control del **Reloj Simulado** (inicia en día hábil a las 10:00; permite adelantar o ajustar fecha y hora).
  - **Bandeja de Correos Simulados** para revisar las notificaciones generadas por confirmaciones y cancelaciones.

## 3. Entidades y estado de datos
- `Usuario`: `id`, `nombre`, `email`, `rol` (`Cliente` | `Administrador`)
- `Servicio`: `id`, `nombre`, `precio`, `duracionMinutos` (`30`)
- `Turno`: `id`, `clienteId`, `servicioId`, `fechaHoraInicio`, `fechaHoraFin`, `estado` (`Confirmado` | `Cancelado` | `Completado`)
- `RelojSimulado`: `fechaHoraActual` (inicia en día hábil a las 10:00)
- `CorreoSimulado`: `id`, `destinatario`, `asunto`, `cuerpo`, `fechaHoraSimulada`, `tipoEvento` (`Confirmacion` | `Cancelacion`)

## 4. Reglas y endpoints clave (`backend/`)
- **Servicios y disponibilidad**: listar servicios y calcular cupos disponibles por franja de 30 min de lunes a viernes (11:00 a 17:30, fin 18:00), con tope de 5 turnos `Confirmado` por bloque y excluyendo horarios pasados respecto a `RelojSimulado`.
- **Crear turno**: validar día hábil, bloque 11:00-17:30, no pasado respecto a `RelojSimulado`, menos de 5 turnos `Confirmado` en esa franja y máximo 2 turnos `Confirmado` para ese cliente. Guarda en estado `Confirmado` y crea un `CorreoSimulado` de confirmación.
- **Cancelar turno**: validar que el turno esté `Confirmado` y que la diferencia entre `fechaHoraInicio` y `RelojSimulado.fechaHoraActual` sea de al menos 2 horas. Si falta menos de 2 horas, rechazar; si cumple, pasar a `Cancelado`, liberar el cupo y crear un `CorreoSimulado` de cancelación.
- **Sincronizar estados con reloj**: al consultar o avanzar `RelojSimulado`, todo turno `Confirmado` cuya `fechaHoraFin` sea menor o igual a `RelojSimulado.fechaHoraActual` pasa a `Completado`.
- **Reloj simulado y bandeja**: leer y adelantar/ajustar `RelojSimulado`; listar `CorreoSimulado`.
- **Agente de IA**: responder preguntas sobre servicios, precios, horarios, disponibilidad y reglas según `RelojSimulado`, sin omitir validaciones ni confirmar turnos sin confirmación explícita del usuario.