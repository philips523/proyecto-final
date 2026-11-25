# Reglas de negocio

## Días de atención

De lunes a viernes.

## Horarios de apertura y cierre

Apertura: 11:00.  
Cierre: 18:00.

## Duración de cada turno

30 minutos.

## Último turno del día

Si se cierra a las 18:00 y los turnos duran 30 minutos, el último turno arranca a las 17:30 y termina a las 18:00.

## Asignación de peluqueros

Hay 5 peluqueros y hasta 5 clientes al mismo tiempo por franja horaria.

No se asigna un peluquero específico. El cliente solo elige horario y servicio. El sistema controla que no se superen las 5 reservas por bloque.

## Servicios

| Servicio        | Precio  | Duración |
|-----------------|---------|----------|
| Corte clásico   | $10.000 | 30 min   |
| Corte + Barba   | $14.000 | 30 min   |
| Corte + Lavado  | $12.000 | 30 min   |

## Reloj simulado

Inicia en un día hábil (lunes a viernes) a las 10:00.

Permite adelantar o modificar fecha y hora para probar el sistema.

## Validación temporal

No se permite reservar:

- fuera de lunes a viernes;
- fuera del rango 11:00–17:30;
- en fechas u horas pasadas respecto al reloj simulado.

## Límite por cliente

Un mismo cliente no puede tener más de 2 turnos activos (estado **Confirmado**) al mismo tiempo.

## Anticipación mínima para cancelar

Hay que cancelar al menos 2 horas antes de la hora reservada.

Si falta menos de 2 horas (según el reloj simulado), el sistema no deja cancelar.

## Estados del turno y paso del tiempo

Tres estados posibles:

- **Confirmado**: turno activo.
- **Cancelado**: libera el cupo.
- **Completado**: cuando el reloj simulado supera la hora de fin del turno y el turno no fue cancelado.

## Correos simulados

Cada confirmación o cancelación genera un registro interno en la bandeja de correos simulados, con:

- destinatario;
- asunto;
- hora simulada;
- detalle del turno.

## Agente de IA

Informa disponibilidad, servicios y reglas.

No se salta las validaciones ni confirma turnos sin una acción explícita del usuario.
