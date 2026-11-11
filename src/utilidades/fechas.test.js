import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ConvertirFechaATexto,
  ConvertirTextoAFecha,
  FormatearFecha,
  ObtenerFechaHoy,
} from './fechas.js'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('ObtenerFechaHoy', () => {
  it('test_fecha_hoy_local: usa la fecha local aunque la hora esté cerca de medianoche', () => {
    // En UTC-3 las 23:30 del 5 de enero son las 02:30 del 6 en UTC: pasar por UTC correría el día.
    vi.stubEnv('TZ', 'America/Argentina/Buenos_Aires')
    const fecha = new Date(2026, 0, 5, 23, 30)

    expect(fecha.getTimezoneOffset()).toBe(180)
    expect(ObtenerFechaHoy(fecha)).toBe('2026-01-05')
  })

  it('test_fecha_hoy_completa_ceros: completa con cero el mes y el día de un dígito, también a las 00:30', () => {
    expect(ObtenerFechaHoy(new Date(2026, 8, 1, 0, 30))).toBe('2026-09-01')
  })

  it('test_fecha_hoy_sin_argumento: sin argumento devuelve la fecha local de hoy', () => {
    const ahora = new Date()
    const esperada = [
      String(ahora.getFullYear()),
      String(ahora.getMonth() + 1).padStart(2, '0'),
      String(ahora.getDate()).padStart(2, '0'),
    ].join('-')

    expect(ObtenerFechaHoy()).toBe(esperada)
  })
})

describe('FormatearFecha', () => {
  it('test_formatear_fecha: convierte AAAA-MM-DD en DD/MM/AAAA', () => {
    expect(FormatearFecha('2026-11-11')).toBe('11/11/2026')
    expect(FormatearFecha('2026-01-05')).toBe('05/01/2026')
  })

  it('test_fecha_invalida_rechazada: rechaza textos que no son AAAA-MM-DD', () => {
    expect(() => FormatearFecha('11/11/2026')).toThrow('Formato de fecha inválido')
    expect(() => FormatearFecha('')).toThrow('Formato de fecha inválido')
  })

  it('test_fecha_no_texto_rechazada: rechaza un valor que no es texto', () => {
    expect(() => FormatearFecha(null)).toThrow('Formato de fecha inválido')
  })
})

describe('ConvertirTextoAFecha', () => {
  it('test_convertir_texto_a_fecha_local: da la medianoche local del día, también en UTC-3', () => {
    vi.stubEnv('TZ', 'America/Argentina/Buenos_Aires')
    const fecha = ConvertirTextoAFecha('2026-11-06')

    // new Date("2026-11-06") sería la medianoche UTC: en UTC-3, las 21:00 del día 5.
    expect(fecha.getTimezoneOffset()).toBe(180)
    expect(fecha.getFullYear()).toBe(2026)
    expect(fecha.getMonth()).toBe(10)
    expect(fecha.getDate()).toBe(6)
    expect(fecha.getHours()).toBe(0)
    expect(fecha.getMinutes()).toBe(0)
  })

  it('test_convertir_texto_a_fecha_invalido_rechazado: rechaza otro formato, un día inexistente y un valor que no es texto', () => {
    expect(() => ConvertirTextoAFecha('06/11/2026')).toThrow('Formato de fecha inválido')
    expect(() => ConvertirTextoAFecha('2026-02-30')).toThrow('Formato de fecha inválido')
    expect(() => ConvertirTextoAFecha('2026-13-01')).toThrow('Formato de fecha inválido')
    expect(() => ConvertirTextoAFecha(undefined)).toThrow('Formato de fecha inválido')
    expect(() => ConvertirTextoAFecha(new Date(2026, 10, 6))).toThrow('Formato de fecha inválido')
  })
})

describe('ConvertirFechaATexto', () => {
  it('test_convertir_fecha_a_texto_local: arma AAAA-MM-DD con el día local, también en UTC-3 a las 23:30', () => {
    vi.stubEnv('TZ', 'America/Argentina/Buenos_Aires')
    // A las 23:30 en UTC-3 ya es el 16 en UTC: pasar por UTC correría el día.
    const fecha = new Date(1990, 2, 15, 23, 30)

    expect(fecha.getTimezoneOffset()).toBe(180)
    expect(ConvertirFechaATexto(fecha)).toBe('1990-03-15')
    expect(ConvertirFechaATexto(new Date(2026, 8, 1, 0, 30))).toBe('2026-09-01')
    // ObtenerFechaHoy conserva su resultado de FEAT-001b (test_fecha_hoy_local).
    expect(ObtenerFechaHoy(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05')
    expect(ObtenerFechaHoy(fecha)).toBe(ConvertirFechaATexto(fecha))
  })
})
