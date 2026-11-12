import { describe, expect, it } from 'vitest'
import {
  AplicarMascaraMonto,
  CalcularPosicionCursor,
  ContarSignificativos,
  NormalizarMontoPegado,
} from './mascaraMonto.js'

describe('AplicarMascaraMonto', () => {
  it('test_mascara_rechaza_signo_y_letras: quita signos y letras del monto', () => {
    expect(AplicarMascaraMonto('-50')).toBe('50')
    expect(AplicarMascaraMonto('abc50')).toBe('50')
    expect(AplicarMascaraMonto('+5 0e')).toBe('50')
  })

  it('test_mascara_agrupa_miles: agrupa la parte entera con punto cada tres dígitos', () => {
    expect(AplicarMascaraMonto('1500,50')).toBe('1.500,50')
    expect(AplicarMascaraMonto('1234567')).toBe('1.234.567')
    expect(AplicarMascaraMonto('999')).toBe('999')
  })

  it('test_mascara_tercer_decimal_rechazado: conserva a lo sumo dos decimales', () => {
    expect(AplicarMascaraMonto('10,555')).toBe('10,55')
    expect(AplicarMascaraMonto('10,5,5')).toBe('10,55')
  })

  it('test_mascara_ceros_y_coma_inicial: normaliza ceros a la izquierda y coma inicial', () => {
    expect(AplicarMascaraMonto(',5')).toBe('0,5')
    expect(AplicarMascaraMonto('05')).toBe('5')
    expect(AplicarMascaraMonto('00')).toBe('0')
    expect(AplicarMascaraMonto('1500,')).toBe('1.500,')
    expect(AplicarMascaraMonto('')).toBe('')
  })

  it('test_mascara_quita_puntos_previos: descarta los puntos de miles anteriores y reagrupa', () => {
    expect(AplicarMascaraMonto('1.5005')).toBe('15.005')
    expect(AplicarMascaraMonto('1.00')).toBe('100')
  })

  it('test_mascara_no_texto_invalido: una entrada que no es texto es inválida y da vacío sin lanzar', () => {
    expect(AplicarMascaraMonto(undefined)).toBe('')
    expect(AplicarMascaraMonto(null)).toBe('')
    expect(AplicarMascaraMonto(5)).toBe('')
  })

  it('test_mascara_texto_largo_sin_retroceso: procesa 10.000 caracteres mezclados en menos de 50 ms y una parte entera de 500.000 dígitos en tiempo lineal', () => {
    const textoLargo = '1a.2,'.repeat(2000)
    const inicio = performance.now()
    const resultado = AplicarMascaraMonto(textoLargo)
    const duracion = performance.now() - inicio

    expect(duracion).toBeLessThan(50)
    expect(resultado).toMatch(/^\d{1,3}(\.\d{3})*,\d{1,2}$/)

    // Parte entera de 500.000 dígitos: ejercita la agrupación de miles,
    // que tiene que ser lineal (una versión cuadrática tarda segundos).
    const enteraLarga = '1a.2'.repeat(250000) + ',5'
    const inicioLargo = performance.now()
    const resultadoLargo = AplicarMascaraMonto(enteraLarga)
    const duracionLarga = performance.now() - inicioLargo

    // Cota amplia: sola tarda ~70 ms, pero con la suite en paralelo llega a
    // ~300 ms. La versión cuadrática tarda entre 1,8 s y 4,3 s, así que 1 s
    // la sigue rechazando sin volver inestable la prueba.
    expect(duracionLarga).toBeLessThan(1000)
    expect(resultadoLargo.length).toBe(500000 + 166666 + 2)
    expect(resultadoLargo.startsWith('12.121.212')).toBe(true)
    expect(resultadoLargo.endsWith('.212,5')).toBe(true)
  })
})

describe('NormalizarMontoPegado', () => {
  it('test_monto_pegado_punto_decimal: cambia el punto decimal por coma solo con uno o dos decimales', () => {
    expect(NormalizarMontoPegado('1500.50')).toBe('1500,50')
    expect(NormalizarMontoPegado(' 12.5 ')).toBe('12,5')
    expect(NormalizarMontoPegado('1.500')).toBe('1.500')
    expect(NormalizarMontoPegado('1.500.000')).toBe('1.500.000')
    expect(NormalizarMontoPegado('1500,50')).toBe('1500,50')
    expect(NormalizarMontoPegado(null)).toBe('')
  })
})

describe('CalcularPosicionCursor', () => {
  it('test_posicion_cursor: ubica el cursor según los significativos a la derecha', () => {
    expect(CalcularPosicionCursor('1.500,50', 2)).toBe(6)
    expect(CalcularPosicionCursor('1.500,50', 0)).toBe(8)
    expect(CalcularPosicionCursor('1.500,50', 99)).toBe(0)
    expect(CalcularPosicionCursor('1.500', 3)).toBe(1)
  })
})

describe('ContarSignificativos', () => {
  it('test_contar_significativos: cuenta solo dígitos y comas', () => {
    expect(ContarSignificativos('1.500,50')).toBe(7)
    expect(ContarSignificativos('1a.500')).toBe(4)
    expect(ContarSignificativos('.')).toBe(0)
    expect(ContarSignificativos('')).toBe(0)
  })
})
