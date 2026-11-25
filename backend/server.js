const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;

const SERVICIOS = [
  { id: "corte-clasico", nombre: "Corte clásico", precio: 10000, duracionMinutos: 30 },
  { id: "corte-barba", nombre: "Corte + Barba", precio: 14000, duracionMinutos: 30 },
  { id: "corte-lavado", nombre: "Corte + Lavado", precio: 12000, duracionMinutos: 30 }
];

const USUARIOS = [
  { id: "cli-1", nombre: "Cliente Demo", email: "cliente@tatypeluqueria.local", rol: "Cliente" },
  { id: "adm-1", nombre: "Administrador Demo", email: "admin@tatypeluqueria.local", rol: "Administrador" }
];

const CUPO_MAXIMO_SIMULTANEO = 5;
const MAX_TURNOS_CONFIRMADOS_CLIENTE = 2;
const ANTICIPACION_MINIMA_CANCELACION_MS = 2 * 60 * 60 * 1000;

function obtenerProximoDiaHabilDiezAM(fechaBase = new Date()) {
  const f = new Date(fechaBase);
  f.setHours(10, 0, 0, 0);
  while (f.getDay() === 0 || f.getDay() === 6) {
    f.setDate(f.getDate() + 1);
  }
  return f;
}

const estado = {
  relojSimulado: obtenerProximoDiaHabilDiezAM().toISOString(),
  turnos: [],
  correosSimulados: []
};

let contadorTurnos = 1;
let contadorCorreos = 1;

function sincronizarTurnosCompletados() {
  const ahoraMs = new Date(estado.relojSimulado).getTime();
  for (const turno of estado.turnos) {
    if (turno.estado === "Confirmado" && new Date(turno.fechaHoraFin).getTime() <= ahoraMs) {
      turno.estado = "Completado";
    }
  }
}

function registrarCorreoSimulado(para, asunto, cuerpo) {
  estado.correosSimulados.push({
    id: `mail-${contadorCorreos++}`,
    para,
    asunto,
    cuerpo,
    emitidoEnRelojSimulado: estado.relojSimulado
  });
}

function validarFranjaHoraria(inicioIso) {
  const inicio = new Date(inicioIso);
  if (Number.isNaN(inicio.getTime())) {
    return { ok: false, error: "Fecha y hora inválida." };
  }
  const diaSemana = inicio.getDay();
  if (diaSemana === 0 || diaSemana === 6) {
    return { ok: false, error: "La barbería atiende solo de lunes a viernes." };
  }
  const minutos = inicio.getMinutes();
  const segundos = inicio.getSeconds();
  if ((minutos !== 0 && minutos !== 30) || segundos !== 0) {
    return { ok: false, error: "Los turnos solo se reservan en bloques de 30 minutos." };
  }
  const totalMinutosDesdeMedianoche = inicio.getHours() * 60 + minutos;
  const aperturaMin = 11 * 60;
  const ultimoInicioMin = 17 * 60 + 30;

  if (totalMinutosDesdeMedianoche < aperturaMin || totalMinutosDesdeMedianoche > ultimoInicioMin) {
    return {
      ok: false,
      error: "Horario fuera de atención: lunes a viernes de 11:00 a 18:00 (último turno a las 17:30)."
    };
  }

  const fin = new Date(inicio.getTime() + 30 * 60 * 1000);
  return { ok: true, inicio, fin };
}

function obtenerCuposOcupados(inicioMs, finMs) {
  return estado.turnos.filter((t) => {
    if (t.estado !== "Confirmado") return false;
    const tInicio = new Date(t.fechaHoraInicio).getTime();
    const tFin = new Date(t.fechaHoraFin).getTime();
    return tInicio < finMs && tFin > inicioMs;
  }).length;
}

function responderJson(res, codigo, payload) {
  res.writeHead(codigo, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload, null, 2));
}

function leerCuerpoJson(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk.toString("utf8");
    });
    req.on("end", () => {
      if (!raw.trim()) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("JSON inválido en el cuerpo de la solicitud."));
      }
    });
    req.on("error", reject);
  });
}

function responderAgenteIaAcotado(preguntaRaw = "") {
  const pregunta = String(preguntaRaw).toLowerCase();
  if (pregunta.includes("precio") || pregunta.includes("servicio") || pregunta.includes("corte") || pregunta.includes("barba") || pregunta.includes("lavado")) {
    return {
      respuesta: "Servicios disponibles (30 min cada uno): Corte clásico ($10.000), Corte + Barba ($14.000) y Corte + Lavado ($12.000). No hay pagos reales en la plataforma.",
      alcance: "acotado-tatypeluqueria"
    };
  }
  if (pregunta.includes("horario") || pregunta.includes("cupo") || pregunta.includes("turno") || pregunta.includes("cancel")) {
    return {
      respuesta: "Atención de lunes a viernes de 11:00 a 18:00 (último turno 17:30), en bloques de 30 minutos y hasta 5 turnos simultáneos sin peluqueros nominales. Máximo 2 turnos Confirmado por cliente y cancelación con al menos 2 horas de anticipación.",
      alcance: "acotado-tatypeluqueria"
    };
  }
  return {
    respuesta: "Puedo ayudarte únicamente con reglas, horarios, servicios, precios, cupos, cancelaciones, roles o reloj simulado de tatypeluqueria.",
    alcance: "acotado-tatypeluqueria"
  };
}

const server = http.createServer(async (req, res) => {
  sincronizarTurnosCompletados();
  const urlObj = new URL(req.url, `http://localhost:${PORT}`);
  const ruta = urlObj.pathname;

  try {
    if (req.method === "GET" && (ruta === "/" || ruta === "/index.html")) {
      const htmlPath = path.join(__dirname, "..", "frontend", "index.html");
      const html = fs.readFileSync(htmlPath, "utf8");
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      return res.end(html);
    }

    if (req.method === "GET" && ruta === "/api/estado") {
      return responderJson(res, 200, {
        relojSimulado: estado.relojSimulado,
        servicios: SERVICIOS,
        usuarios: USUARIOS,
        turnos: estado.turnos,
        correosSimulados: estado.correosSimulados
      });
    }

    if (req.method === "GET" && ruta === "/api/disponibilidad") {
      const inicioParam = urlObj.searchParams.get("fechaHoraInicio");
      const validacion = validarFranjaHoraria(inicioParam);
      if (!validacion.ok) {
        return responderJson(res, 400, { error: validacion.error });
      }
      const ocupados = obtenerCuposOcupados(validacion.inicio.getTime(), validacion.fin.getTime());
      return responderJson(res, 200, {
        fechaHoraInicio: validacion.inicio.toISOString(),
        fechaHoraFin: validacion.fin.toISOString(),
        cupoMaximo: CUPO_MAXIMO_SIMULTANEO,
        cuposOcupados: ocupados,
        cuposDisponibles: Math.max(0, CUPO_MAXIMO_SIMULTANEO - ocupados)
      });
    }

    if (req.method === "POST" && ruta === "/api/reloj/avanzar") {
      const body = await leerCuerpoJson(req);
      const minutos = Number(body.minutos ?? 30);
      if (!Number.isFinite(minutos) || minutos <= 0) {
        return responderJson(res, 400, { error: "Indicá una cantidad de minutos mayor a 0." });
      }
      const actual = new Date(estado.relojSimulado);
      actual.setMinutes(actual.getMinutes() + minutos);
      estado.relojSimulado = actual.toISOString();
      sincronizarTurnosCompletados();
      return responderJson(res, 200, {
        relojSimulado: estado.relojSimulado,
        turnos: estado.turnos
      });
    }

    if (req.method === "POST" && ruta === "/api/turnos") {
      const body = await leerCuerpoJson(req);
      const clienteId = body.clienteId || "cli-1";
      const cliente = USUARIOS.find((u) => u.id === clienteId);
      if (!cliente) {
        return responderJson(res, 404, { error: "Cliente no encontrado." });
      }

      const servicio = SERVICIOS.find((s) => s.id === body.servicioId);
      if (!servicio) {
        return responderJson(res, 400, { error: "Servicio no válido." });
      }

      const validacion = validarFranjaHoraria(body.fechaHoraInicio);
      if (!validacion.ok) {
        return responderJson(res, 400, { error: validacion.error });
      }

      const ahoraMs = new Date(estado.relojSimulado).getTime();
      if (validacion.inicio.getTime() <= ahoraMs) {
        return responderJson(res, 400, { error: "No se puede reservar un horario pasado o ya transcurrido según el reloj simulado." });
      }

      const turnosConfirmadosCliente = estado.turnos.filter(
        (t) => t.clienteId === cliente.id && t.estado === "Confirmado"
      ).length;
      if (turnosConfirmadosCliente >= MAX_TURNOS_CONFIRMADOS_CLIENTE) {
        return responderJson(res, 400, {
          error: `El cliente ya alcanzó el máximo de ${MAX_TURNOS_CONFIRMADOS_CLIENTE} turnos Confirmado.`
        });
      }

      const ocupados = obtenerCuposOcupados(validacion.inicio.getTime(), validacion.fin.getTime());
      if (ocupados >= CUPO_MAXIMO_SIMULTANEO) {
        return responderJson(res, 409, { error: "No hay cupos disponibles en esa franja horaria (máximo 5 simultáneos)." });
      }

      const nuevoTurno = {
        id: `turno-${contadorTurnos++}`,
        clienteId: cliente.id,
        clienteNombre: cliente.nombre,
        servicioId: servicio.id,
        servicioNombre: servicio.nombre,
        precio: servicio.precio,
        duracionMinutos: servicio.duracionMinutos,
        fechaHoraInicio: validacion.inicio.toISOString(),
        fechaHoraFin: validacion.fin.toISOString(),
        estado: "Confirmado"
      };

      estado.turnos.push(nuevoTurno);
      registrarCorreoSimulado(
        cliente.email,
        `Turno Confirmado - ${nuevoTurno.servicioNombre}`,
        `Tu turno (${nuevoTurno.id}) para ${nuevoTurno.servicioNombre} ($${nuevoTurno.precio}) quedó Confirmado para ${nuevoTurno.fechaHoraInicio}.`
      );

      return responderJson(res, 201, { turno: nuevoTurno, correosSimulados: estado.correosSimulados });
    }

    if (req.method === "POST" && ruta.startsWith("/api/turnos/") && ruta.endsWith("/cancelar")) {
      const partes = ruta.split("/");
      const turnoId = partes[3];
      const body = await leerCuerpoJson(req);
      const actor = USUARIOS.find((u) => u.id === (body.usuarioId || "cli-1"));
      const turno = estado.turnos.find((t) => t.id === turnoId);

      if (!turno) {
        return responderJson(res, 404, { error: "Turno no encontrado." });
      }
      if (turno.estado !== "Confirmado") {
        return responderJson(res, 400, { error: `Solo se pueden cancelar turnos en estado Confirmado (actual: ${turno.estado}).` });
      }
      if (actor && actor.rol === "Cliente" && turno.clienteId !== actor.id) {
        return responderJson(res, 403, { error: "Un Cliente solo puede cancelar sus propios turnos." });
      }

      const ahoraMs = new Date(estado.relojSimulado).getTime();
      const inicioTurnoMs = new Date(turno.fechaHoraInicio).getTime();
      if (inicioTurnoMs - ahoraMs < ANTICIPACION_MINIMA_CANCELACION_MS) {
        return responderJson(res, 400, {
          error: "La cancelación requiere al menos 2 horas de anticipación respecto al reloj simulado."
        });
      }

      turno.estado = "Cancelado";
      registrarCorreoSimulado(
        "cliente@tatypeluqueria.local",
        `Turno Cancelado - ${turno.id}`,
        `El turno ${turno.id} (${turno.servicioNombre}) fue Cancelado.`
      );

      return responderJson(res, 200, { turno, correosSimulados: estado.correosSimulados });
    }

    if (req.method === "POST" && ruta === "/api/ia/consultar") {
      const body = await leerCuerpoJson(req);
      return responderJson(res, 200, responderAgenteIaAcotado(body.pregunta));
    }

    return responderJson(res, 404, { error: "Ruta no encontrada." });
  } catch (err) {
    return responderJson(res, 400, { error: err.message || "Error al procesar la solicitud." });
  }
});

server.listen(PORT, () => {
  console.log(`Servidor tatypeluqueria activo en http://localhost:${PORT}`);
});