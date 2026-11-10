import { describe, expect, it } from 'vitest'
import { FormatearSaldo } from './formatoMoneda.js'

describe('FormatearSaldo', () => {
  it('formatea el saldo cero con dos decimales', () => {
    expect(FormatearSaldo('0', 'USD')).toBe('USD 0,01')
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
