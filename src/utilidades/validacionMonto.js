export const MENSAJE_MONTO_INVALIDO = 'El monto debe ser mayor a 0.'

const FORMATO_MONTO = /^\d+([.,]\d{1,2})?$/
const SOLO_CEROS = /^0+(\.0+)?$/

// Devuelve el monto como texto con punto decimal, o null si no es válido.
// Se trabaja solo con texto: convertirlo a número perdería precisión (RNF-04).
export function ValidarMonto(texto) {
  if (typeof texto !== 'string') {
    return null
  }

  const montoRecortado = texto.trim()

  if (!FORMATO_MONTO.test(montoRecortado)) {
    return null
  }

  const montoNormalizado = montoRecortado.replace(',', '.')

  if (SOLO_CEROS.test(montoNormalizado)) {
    return null
  }

  return montoNormalizado
}
