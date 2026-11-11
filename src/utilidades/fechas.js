const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/

// La fecha de un movimiento es un día calendario local: no se pasa por UTC, que correría el día.
export function ObtenerFechaHoy(fecha = new Date()) {
  const anio = String(fecha.getFullYear())
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')

  return `${anio}-${mes}-${dia}`
}

// Se parte el texto sin crear un Date, que interpretaría "AAAA-MM-DD" como UTC.
export function FormatearFecha(fechaTexto) {
  if (typeof fechaTexto !== 'string' || !FORMATO_FECHA.test(fechaTexto)) {
    throw new Error('Formato de fecha inválido')
  }

  const [anio, mes, dia] = fechaTexto.split('-')

  return `${dia}/${mes}/${anio}`
}
