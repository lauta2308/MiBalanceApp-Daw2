const FORMATO_SALDO = /^-?\d+(\.\d{1,2})?$/
const FORMATO_CODIGO_MONEDA = /^[A-Z]{3}$/
const POSICIONES_SEPARADOR_MILES = /\B(?=(\d{3})+$)/g
const FORMATO_MONTO_MOVIMIENTO = /^\d+(\.\d{1,2})?$/
const SIGNOS_POR_TIPO = { INGRESO: '+', GASTO: '-' }

// Recibe un número sin signo como texto ("1500.5") y devuelve "1.500,50".
function AgruparMontoSinSigno(montoSinSigno) {
  const [enteros, decimales = ''] = montoSinSigno.split('.')
  const enterosAgrupados = enteros.replace(POSICIONES_SEPARADOR_MILES, '.')
  const decimalesCompletos = decimales.padEnd(2, '0')

  return `${enterosAgrupados},${decimalesCompletos}`
}

// El saldo se procesa solo como texto: convertirlo a número perdería precisión (RNF-04).
export function FormatearSaldo(saldoTexto, codigoMoneda) {
  if (
    typeof saldoTexto !== 'string' ||
    typeof codigoMoneda !== 'string' ||
    !FORMATO_SALDO.test(saldoTexto) ||
    !FORMATO_CODIGO_MONEDA.test(codigoMoneda)
  ) {
    throw new Error('Formato de saldo inválido')
  }

  const esNegativo = saldoTexto.startsWith('-')
  const saldoSinSigno = esNegativo ? saldoTexto.slice(1) : saldoTexto

  return `${codigoMoneda} ${esNegativo ? '-' : ''}${AgruparMontoSinSigno(saldoSinSigno)}`
}

// El monto de un movimiento es siempre positivo; el signo sale del tipo. Solo texto (RNF-04).
export function FormatearMontoMovimiento(montoTexto, tipo) {
  if (
    typeof montoTexto !== 'string' ||
    !FORMATO_MONTO_MOVIMIENTO.test(montoTexto) ||
    !Object.hasOwn(SIGNOS_POR_TIPO, tipo)
  ) {
    throw new Error('Formato de monto inválido')
  }

  return `${SIGNOS_POR_TIPO[tipo]}${AgruparMontoSinSigno(montoTexto)}`
}
