import { describe, expect, it } from 'vitest'
import { FormatearMontoMovimiento, FormatearSaldo } from './formatoMoneda.js'

describe('FormatearMontoMovimiento', () => {
  it('test_monto_movimiento_con_signo: antepone + al ingreso y - al gasto, con punto de miles y coma decimal', () => {
    expect(FormatearMontoMovimiento('500', 'INGRESO')).toBe('+500,00')
    expect(FormatearMontoMovimiento('10000', 'INGRESO')).toBe('+10.000,00')
    expect(FormatearMontoMovimiento('1500.5', 'GASTO')).toBe('-1.500,50')
  })

  it('test_monto_movimiento_sin_perdida_precision: no pierde dígitos en montos mayores que la precisión de un float', () => {
    expect(FormatearMontoMovimiento('999999999999.99', 'INGRESO')).toBe('+999.999.999.999,99')
  })

  it('test_monto_movimiento_invalido_rechazado: rechaza un monto o un tipo inválidos', () => {
    expect(() => FormatearMontoMovimiento('abc', 'INGRESO')).toThrow('Formato de monto inválido')
    expect(() => FormatearMontoMovimiento('500', 'OTRO')).toThrow('Formato de monto inválido')
  })

  it.each([
    ['negativo', '-500'],
    ['coma decimal', '1,5'],
    ['tres decimales', '1.234'],
    ['vacío', ''],
    ['nulo', null],
  ])('test_monto_movimiento_formato_rechazado: rechaza el monto inválido: %s', (_descripcion, montoTexto) => {
    expect(() => FormatearMontoMovimiento(montoTexto, 'INGRESO')).toThrow('Formato de monto inválido')
  })
})

describe('FormatearSaldo', () => {
  it('formatea el saldo cero con dos decimales', () => {
    expect(FormatearSaldo('0', 'USD')).toBe('USD 0,00')
  })

  it('agrupa los miles con punto', () => {
    expect(FormatearSaldo('11000', 'USD')).toBe('USD 11.000,00')
  })

  it('completa los decimales a dos con ceros', () => {
    expect(FormatearSaldo('1500.5', 'USD')).toBe('USD 1.500,50')
  })

  it('conserva dos decimales ya completos', () => {
    expect(FormatearSaldo('1234.56', 'USD')).toBe('USD 1.234,56')
  })

  it('no agrega punto de miles con tres dígitos enteros o menos', () => {
    expect(FormatearSaldo('999', 'USD')).toBe('USD 999,00')
  })

  it('coloca el signo negativo después de la moneda', () => {
    expect(FormatearSaldo('-1000', 'USD')).toBe('USD -1.000,00')
  })

  it('no pierde dígitos en montos mayores que la precisión de un float', () => {
    expect(FormatearSaldo('1999999999999.98', 'USD')).toBe('USD 1.999.999.999.999,98')
  })

  it.each([
    ['vacío', ''],
    ['letras', 'abc'],
    ['coma decimal', '1,5'],
    ['tres decimales', '1.234'],
    ['nulo', null],
  ])('rechaza el saldo inválido: %s', (_descripcion, saldoTexto) => {
    expect(() => FormatearSaldo(saldoTexto, 'USD')).toThrow('Formato de saldo inválido')
  })

  it.each([
    ['minúsculas', 'usd'],
    ['menos de tres letras', 'US'],
  ])('rechaza la moneda inválida: %s', (_descripcion, codigoMoneda) => {
    expect(() => FormatearSaldo('10', codigoMoneda)).toThrow('Formato de saldo inválido')
  })
})
