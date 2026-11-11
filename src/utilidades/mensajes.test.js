import { describe, expect, it } from 'vitest'
import { MENSAJE_EXITO_INGRESO } from './mensajes.js'

describe('mensajes', () => {
  it('test_mensaje_exito_ingreso_texto_fijo: el mensaje de éxito del alta es "Ingreso registrado con éxito."', () => {
    expect(MENSAJE_EXITO_INGRESO).toBe('Ingreso registrado con éxito.')
  })
})
