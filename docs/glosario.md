# Glosario

## Cliente

Persona con cuenta de rol Cliente. Ve servicios, reserva y cancela sus turnos, y usa el chat de IA.

## Administrador

Persona con cuenta de rol Administrador. Ve toda la agenda del día, controla el reloj simulado y revisa la bandeja de correos simulados.

## Turno

Reserva de un bloque de 30 minutos para un servicio, en un horario elegido por el cliente. Puede estar en estado Confirmado, Cancelado o Completado.

## Servicio

Prestación que ofrece la barbería (Corte clásico, Corte + Barba o Corte + Lavado), con su precio y una duración de 30 minutos.

## Capacidad simultánea

Cantidad máxima de reservas en la misma franja horaria: 5, porque hay 5 peluqueros. El cliente no elige peluquero; el sistema solo controla que no se superen las 5 reservas por bloque.

## Reloj simulado

Fecha y hora del sistema usadas para validar reservas, cancelaciones y el paso de los turnos a Completado. No usa el reloj real del servidor. Inicia en un día hábil a las 10:00 y el administrador puede adelantarlo o modificarlo.

## Bandeja de correos simulados

Registro interno de notificaciones. No envía correos reales. Cada confirmación o cancelación genera un registro con destinatario, asunto, hora simulada y detalle del turno.

## Agente de IA

Chat que informa disponibilidad, servicios y reglas. No se salta las validaciones ni confirma turnos sin una acción explícita del usuario.
