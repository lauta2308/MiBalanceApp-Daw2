import { describe, expect, it } from 'vitest'
import {
  MENSAJE_MONTO_INVALIDO,
  MENSAJE_MONTO_MAXIMO,
  ValidarMonto,
  ValidarMontoMaximo,
} from './validacionMonto.js'

describe('ValidarMonto', () => {
  it('test_validar_monto_valido: devuelve el monto normalizado con punto decimal', () => {
    expect(ValidarMonto('500')).toBe('500')
    expect(ValidarMonto('1500,5')).toBe('1500.5')
    expect(ValidarMonto(' 0,01 ')).toBe('0.01')
  })

  it('test_validar_monto_con_miles: lee el punto de miles y la coma decimal', () => {
    expect(ValidarMonto('1.500,50')).toBe('1500.50')
    expect(ValidarMonto('999.999.999.999,99')).toBe('999999999999.99')
    expect(ValidarMonto('10')).toBe('10')
  })

  it('test_validar_monto_punto_decimal: el punto se lee como separador de miles, no como decimal', () => {
    expect(ValidarMonto('1.234')).toBe('1234')
    expect(ValidarMonto('1.23')).toBeNull()
  })

  it('test_validar_monto_sin_perdida_precision: no pierde dígitos en montos mayores que la precisión de un float', () => {
    expect(ValidarMonto('999999999999,99')).toBe('999999999999.99')
  })

  it('test_validar_monto_invalido_rechazado: devuelve null para vacío, cero, negativo, no numérico o con formato inválido', () => {
    for (const texto of ['', '   ', '0', '0,00', '-5', 'abc', '1,234', '10,555', '1..000']) {
      expect(ValidarMonto(texto), `texto: "${texto}"`).toBeNull()
    }
  })

  it('test_validar_monto_no_texto: devuelve null si no recibe texto', () => {
    expect(ValidarMonto(null)).toBeNull()
    expect(ValidarMonto(undefined)).toBeNull()
  })
})

describe('ValidarMontoMaximo', () => {
  it('test_validar_monto_maximo_rechazado: rechaza montos con más de 12 dígitos enteros', () => {
    expect(ValidarMontoMaximo('1000000000000.00')).toBe(false)
    expect(ValidarMontoMaximo('999999999999.99')).toBe(true)
    expect(ValidarMontoMaximo('000999999999999.99')).toBe(true)
  })
})

describe('MENSAJE_MONTO_INVALIDO', () => {
  it('test_mensaje_monto_invalido_texto_fijo: es el texto fijo de FR-07', () => {
    expect(MENSAJE_MONTO_INVALIDO).toBe('El monto debe ser mayor a 0.')
  })
})

describe('MENSAJE_MONTO_MAXIMO', () => {
  it('test_mensaje_monto_maximo_texto_fijo: es el texto fijo de FR-03', () => {
    expect(MENSAJE_MONTO_MAXIMO).toBe('El monto máximo es 999.999.999.999,99.')
  })
})
