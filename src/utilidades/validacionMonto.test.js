import { describe, expect, it } from 'vitest'
import { MENSAJE_MONTO_INVALIDO, ValidarMonto } from './validacionMonto.js'

describe('ValidarMonto', () => {
  it('test_validar_monto_valido: devuelve el monto normalizado con punto decimal', () => {
    expect(ValidarMonto('500')).toBe('500')
    expect(ValidarMonto('1500,5')).toBe('1500.5')
    expect(ValidarMonto(' 0,01 ')).toBe('0.01')
  })

  it('test_validar_monto_punto_decimal: acepta el punto como separador decimal', () => {
    expect(ValidarMonto('1500.50')).toBe('1500.50')
  })

  it('test_validar_monto_sin_perdida_precision: no pierde dígitos en montos mayores que la precisión de un float', () => {
    expect(ValidarMonto('999999999999,99')).toBe('999999999999.99')
  })

  it('test_validar_monto_invalido_rechazado: devuelve null para vacío, cero, negativo, no numérico o con más de dos decimales', () => {
    for (const texto of ['', '   ', '0', '0,00', '-5', 'abc', '1,234']) {
      expect(ValidarMonto(texto), `texto: "${texto}"`).toBeNull()
    }
  })

  it('test_validar_monto_no_texto: devuelve null si no recibe texto', () => {
    expect(ValidarMonto(null)).toBeNull()
    expect(ValidarMonto(undefined)).toBeNull()
  })
})

describe('MENSAJE_MONTO_INVALIDO', () => {
  it('test_mensaje_monto_invalido_texto_fijo: es el texto fijo de FR-07', () => {
    expect(MENSAJE_MONTO_INVALIDO).toBe('El monto debe ser mayor a 0.')
  })
})
