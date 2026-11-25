# Idea del proyecto

## Qué es

Sistema web de gestión de turnos para la barbería **tatypeluqueria**.

## Alcance controlado

El sistema no incluye pagos reales, no envía correos reales y no depende del reloj real del servidor.

En su lugar se usa:

- un **reloj simulado** para fechas y horarios;
- una **bandeja interna de correos simulados** para las notificaciones.

## Roles de acceso (login)

Hay dos roles, cada uno con vistas diferenciadas.

### Cliente

- Ve los servicios.
- Reserva y cancela sus turnos.
- Usa el chat de IA.

### Administrador

- Ve toda la agenda del día.
- Controla el reloj simulado.
- Revisa la bandeja de correos simulados.
