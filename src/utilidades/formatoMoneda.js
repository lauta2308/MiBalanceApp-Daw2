const formatoSaldo = /^-?\d+(\.\d{1,2})?$/
const formatoCodigoMoneda = /^[A-Z]{3}$/
const posicionesSeparadorMiles = /\B(?=(\d{3})+$)/g

// El saldo se procesa solo como texto: convertirlo a número perdería precisión (RNF-04).
export function FormatearSaldo(saldoTexto, codigoMoneda) {
  if (
    typeof saldoTexto !== 'string' ||
    typeof codigoMoneda !== 'string' ||
    !formatoSaldo.test(saldoTexto) ||
    !formatoCodigoMoneda.test(codigoMoneda)
  ) {
    throw new Error('Formato de saldo inválido')
  }

  const esNegativo = saldoTexto.startsWith('-')
  const saldoSinSigno = esNegativo ? saldoTexto.slice(1) : saldoTexto
  const [enteros, decimales = ''] = saldoSinSigno.split('.')
  const enterosAgrupados = enteros.replace(posicionesSeparadorMiles, '.')
  const decimalesCompletos = decimales.padEnd(2, '0')

  return `${codigoMoneda} ${esNegativo ? '-' : ''}${enterosAgrupados},${decimalesCompletos}`
}
