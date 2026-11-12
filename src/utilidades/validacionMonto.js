export const MENSAJE_MONTO_INVALIDO = 'El monto debe ser mayor a 0.'
export const MENSAJE_MONTO_MAXIMO = 'El monto máximo es 999.999.999.999,99.'

// El punto solo es separador de miles; la coma es el único separador decimal.
const FORMATO_MONTO_CON_MILES = /^\d{1,3}(\.\d{3})*(,\d{1,2})?$/
const FORMATO_MONTO_SIN_MILES = /^\d+(,\d{1,2})?$/
const SOLO_CEROS = /^0+(\.0+)?$/
const CEROS_IZQUIERDA = /^0+/
const MAXIMO_DIGITOS_ENTEROS = 12

// Devuelve el monto como texto con punto decimal y sin separador de miles
// ("1.500,50" → "1500.50"), o null si no es válido.
// Se trabaja solo con texto: convertirlo a número perdería precisión (RNF-04).
export function ValidarMonto(texto) {
  if (typeof texto !== 'string') {
    return null
  }

  const montoRecortado = texto.trim()

  if (
    !FORMATO_MONTO_CON_MILES.test(montoRecortado) &&
    !FORMATO_MONTO_SIN_MILES.test(montoRecortado)
  ) {
    return null
  }

  const montoNormalizado = montoRecortado.replaceAll('.', '').replace(',', '.')

  if (SOLO_CEROS.test(montoNormalizado)) {
    return null
  }

  return montoNormalizado
}

// Recibe el resultado de ValidarMonto. Con 12 dígitos enteros o menos el monto
// es como mucho 999.999.999.999,99, porque ValidarMonto ya limita los decimales.
export function ValidarMontoMaximo(montoNormalizado) {
  const entera = montoNormalizado.split('.')[0].replace(CEROS_IZQUIERDA, '')
  return entera.length <= MAXIMO_DIGITOS_ENTEROS
}
