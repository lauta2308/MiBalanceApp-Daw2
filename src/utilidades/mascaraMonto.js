// Máscara propia del campo "Monto" (ADR-005). Todo se procesa como texto,
// nunca con Number, para no perder precisión (RNF-04).

const NO_DIGITO_NI_COMA = /[^\d,]/g
const SIGNIFICATIVO = /[\d,]/
const MONTO_PEGADO_PUNTO_DECIMAL = /^\d+\.\d{1,2}$/

// Agrupa la parte entera con punto cada tres dígitos. El primer tramo lleva
// los dígitos que sobran (largo % 3, o 3) y el resto son tramos fijos de tres.
// Solo push y slice, sin unshift ni lookahead, en tiempo lineal (threat R-04).
function AgruparMiles(entera) {
  const largoPrimerTramo = entera.length % 3 || 3
  const tramos = [entera.slice(0, largoPrimerTramo)]

  for (let inicio = largoPrimerTramo; inicio < entera.length; inicio += 3) {
    tramos.push(entera.slice(inicio, inicio + 3))
  }

  return tramos.join('.')
}

function QuitarCerosIzquierda(entera) {
  let inicio = 0

  while (inicio < entera.length - 1 && entera[inicio] === '0') {
    inicio += 1
  }

  return entera.slice(inicio)
}

// Devuelve el texto que muestra el campo: solo dígitos y una coma, con a lo
// sumo dos decimales y el punto de miles en la parte entera.
export function AplicarMascaraMonto(texto) {
  if (typeof texto !== 'string') {
    return ''
  }

  const limpio = texto.replace(NO_DIGITO_NI_COMA, '')

  if (limpio === '') {
    return ''
  }

  const posicionComa = limpio.indexOf(',')
  const tieneComa = posicionComa !== -1
  const enteraCruda = tieneComa ? limpio.slice(0, posicionComa) : limpio
  const decimales = tieneComa
    ? limpio.slice(posicionComa + 1).replaceAll(',', '').slice(0, 2)
    : ''

  const entera = enteraCruda === '' ? '0' : QuitarCerosIzquierda(enteraCruda)
  const enteraAgrupada = AgruparMiles(entera)

  return tieneComa ? `${enteraAgrupada},${decimales}` : enteraAgrupada
}

// Se aplica solo al texto pegado: "1500.50" pasa a "1500,50". Cualquier otro
// texto queda igual ("1.500" sigue siendo mil quinientos).
export function NormalizarMontoPegado(texto) {
  if (typeof texto !== 'string') {
    return ''
  }

  const recortado = texto.trim()

  if (MONTO_PEGADO_PUNTO_DECIMAL.test(recortado)) {
    return recortado.replace('.', ',')
  }

  return texto
}

// Cantidad de dígitos y comas del texto: lo que la máscara conserva.
export function ContarSignificativos(texto) {
  let cantidad = 0

  for (const caracter of texto) {
    if (SIGNIFICATIVO.test(caracter)) {
      cantidad += 1
    }
  }

  return cantidad
}

// Menor índice de textoMostrado con exactamente cantidadSignificativosDespues
// dígitos o comas a su derecha. Si no alcanzan, devuelve 0.
export function CalcularPosicionCursor(textoMostrado, cantidadSignificativosDespues) {
  if (cantidadSignificativosDespues <= 0) {
    return textoMostrado.length
  }

  let significativosContados = 0

  for (let posicion = textoMostrado.length - 1; posicion >= 0; posicion -= 1) {
    if (SIGNIFICATIVO.test(textoMostrado[posicion])) {
      significativosContados += 1

      if (significativosContados === cantidadSignificativosDespues) {
        let posicionMinima = posicion

        while (posicionMinima > 0 && !SIGNIFICATIVO.test(textoMostrado[posicionMinima - 1])) {
          posicionMinima -= 1
        }

        return posicionMinima
      }
    }
  }

  return 0
}
