const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/
const MENSAJE_FORMATO_INVALIDO = 'Formato de fecha inválido'

function ValidarFormatoFecha(fechaTexto) {
  if (typeof fechaTexto !== 'string' || !FORMATO_FECHA.test(fechaTexto)) {
    throw new Error(MENSAJE_FORMATO_INVALIDO)
  }
}

// La fecha de un movimiento es un día calendario local: no se pasa por UTC, que correría el día.
export function ConvertirFechaATexto(fecha) {
  const anio = String(fecha.getFullYear())
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')

  return `${anio}-${mes}-${dia}`
}

export function ObtenerFechaHoy(fecha = new Date()) {
  return ConvertirFechaATexto(fecha)
}

// Medianoche local de ese día: new Date("AAAA-MM-DD") la leería como UTC y correría el día.
export function ConvertirTextoAFecha(fechaTexto) {
  ValidarFormatoFecha(fechaTexto)

  const [anio, mes, dia] = fechaTexto.split('-').map(Number)
  const fecha = new Date(anio, mes - 1, dia)

  // Date desborda los días inexistentes (2026-02-30 pasa a marzo): se rechazan en lugar de corregirlos.
  if (fecha.getFullYear() !== anio || fecha.getMonth() !== mes - 1 || fecha.getDate() !== dia) {
    throw new Error(MENSAJE_FORMATO_INVALIDO)
  }

  return fecha
}

// Se parte el texto sin crear un Date, que interpretaría "AAAA-MM-DD" como UTC.
export function FormatearFecha(fechaTexto) {
  ValidarFormatoFecha(fechaTexto)

  const [anio, mes, dia] = fechaTexto.split('-')

  return `${dia}/${mes}/${anio}`
}
