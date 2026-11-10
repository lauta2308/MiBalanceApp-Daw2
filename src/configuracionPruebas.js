import '@testing-library/jest-dom/vitest'
import { afterAll, afterEach } from 'vitest'
import {
  ComprobarBloqueoTrasPrueba,
  ComprobarIntentosBloqueados,
  InstalarBloqueoRed,
} from './bloqueoRedPruebas.js'

// Las pruebas unitarias no pueden conectarse a servicios externos (FEAT-002, FR-08).
InstalarBloqueoRed()

// Falla la prueba que desinstaló el bloqueo o que intentó conectarse a un host externo,
// aunque el código bajo prueba haya capturado el error.
afterEach(() => {
  ComprobarBloqueoTrasPrueba()
})

// Intentos no atribuidos a ninguna prueba: en beforeAll, al importar o asíncronos tardíos.
afterAll(() => {
  ComprobarIntentosBloqueados()
})
