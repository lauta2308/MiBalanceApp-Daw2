import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router'

const {
  ObtenerCuentaSimulado,
  ObtenerMovimientosSimulado,
  AgregarIngresoSimulado,
  ObtenerCategoriasIngresoSimulado,
  AsegurarSesionSimulado,
} = vi.hoisted(() => ({
  ObtenerCuentaSimulado: vi.fn(),
  ObtenerMovimientosSimulado: vi.fn(),
  AgregarIngresoSimulado: vi.fn(),
  ObtenerCategoriasIngresoSimulado: vi.fn(),
  AsegurarSesionSimulado: vi.fn(),
}))

// Todos los servicios se simulan: clienteSupabase.js lanza al importarse sin variables VITE_*
// y el CI corre sin ellas.
vi.mock('./servicios/cuentas.js', () => ({ ObtenerCuenta: ObtenerCuentaSimulado }))
vi.mock('./servicios/movimientos.js', () => ({
  AgregarIngreso: AgregarIngresoSimulado,
  ObtenerMovimientos: ObtenerMovimientosSimulado,
}))
vi.mock('./servicios/categorias.js', () => ({ ObtenerCategoriasIngreso: ObtenerCategoriasIngresoSimulado }))
vi.mock('./autenticacion/sesion.js', () => ({
  AsegurarSesion: AsegurarSesionSimulado,
  MENSAJE_ERROR_SESION: 'No se pudo iniciar la sesión. Vuelva a intentarlo.',
}))

import App from './App.jsx'
import { FormatearFecha, ObtenerFechaHoy } from './utilidades/fechas.js'

const CATEGORIAS = [{ id: 'id-pago-ingresado', nombre: 'Pago Ingresado', es_defecto: true }]
const MENSAJE_EXITO = 'Ingreso registrado con éxito.'
const MENSAJE_ERROR_ALTA = 'No se pudo registrar el ingreso. Vuelva a intentarlo.'
const MENSAJE_SIN_MOVIMIENTOS = 'Aquí verá sus movimientos.'
const ERROR_TECNICO = 'P0001: new row violates check constraint bat_movimientos'

// Base de datos simulada: el saldo y los movimientos solo cambian si AgregarIngreso lo hace.
let baseSimulada

function ObtenerCuentaDeBase() {
  return Promise.resolve({ id: 'id-cuenta', nombre: 'Mi Cuenta', moneda: 'USD', saldo: baseSimulada.saldo })
}

function ObtenerMovimientosDeBase() {
  return Promise.resolve([...baseSimulada.movimientos])
}

function SondaUbicacion() {
  const ubicacion = useLocation()
  return <p data-testid="sonda-ubicacion">{ubicacion.pathname}</p>
}

function RenderizarApp() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <App />
      <SondaUbicacion />
    </MemoryRouter>,
  )
}

function ObtenerEncabezadoCuenta() {
  return screen.findByRole('heading', { level: 1, name: 'Mi Cuenta (USD)' })
}

async function AbrirFormulario(usuario) {
  await ObtenerEncabezadoCuenta()
  await usuario.click(screen.getByRole('button', { name: 'Añadir Ingreso' }))
  await screen.findByRole('heading', { level: 1, name: 'Añadir Ingreso' })
}

// Resuelve las promesas pendientes de los servicios simulados sin avanzar los relojes.
async function VaciarPromesas() {
  for (let vuelta = 0; vuelta < 10; vuelta += 1) {
    await act(async () => {
      await Promise.resolve()
    })
  }
}

beforeEach(() => {
  baseSimulada = { saldo: '0', movimientos: [] }
  ObtenerCuentaSimulado.mockReset()
  ObtenerMovimientosSimulado.mockReset()
  AgregarIngresoSimulado.mockReset()
  ObtenerCategoriasIngresoSimulado.mockReset()
  AsegurarSesionSimulado.mockReset()
  ObtenerCuentaSimulado.mockImplementation(ObtenerCuentaDeBase)
  ObtenerMovimientosSimulado.mockImplementation(ObtenerMovimientosDeBase)
  ObtenerCategoriasIngresoSimulado.mockResolvedValue(CATEGORIAS)
  AsegurarSesionSimulado.mockResolvedValue({ user: { id: 'usuario' } })
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('Flujo de alta de ingreso', () => {
  it('test_alta_ingreso_flujo_completo: con saldo "0", "Añadir Ingreso" → 500 → "Guardar" muestra "USD 500,00", el grupo de hoy y "Pago Ingresado" "+500,00"', async () => {
    const usuario = userEvent.setup()
    const fechaHoy = ObtenerFechaHoy()
    AgregarIngresoSimulado.mockImplementation(async ({ montoTexto, fecha, idCategoria }) => {
      baseSimulada = {
        saldo: '500',
        movimientos: [
          { id: 'id-nuevo', tipo: 'INGRESO', monto: montoTexto, fecha, nombreCategoria: 'Pago Ingresado', idCategoria },
        ],
      }
    })

    RenderizarApp()
    expect(await screen.findByText('USD 0,00')).toBeInTheDocument()
    expect(screen.getByText(MENSAJE_SIN_MOVIMIENTOS)).toBeInTheDocument()

    await AbrirFormulario(usuario)
    await usuario.type(screen.getByLabelText('Monto'), '500')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await ObtenerEncabezadoCuenta()).toBeInTheDocument()
    expect(await screen.findByText('USD 500,00')).toBeInTheDocument()
    expect(screen.getByTestId('sonda-ubicacion')).toHaveTextContent(/^\/$/)
    expect(AgregarIngresoSimulado).toHaveBeenCalledTimes(1)
    expect(AgregarIngresoSimulado.mock.calls[0][0]).toMatchObject({ fecha: fechaHoy, idCategoria: 'id-pago-ingresado' })

    const grupo = screen.getByRole('heading', { level: 2, name: FormatearFecha(fechaHoy) }).closest('section')
    const items = within(grupo).getAllByRole('listitem')
    expect(items).toHaveLength(1)
    expect(within(items[0]).getByText('Pago Ingresado')).toBeInTheDocument()
    expect(within(items[0]).getByText('+500,00')).toBeInTheDocument()
    expect(screen.queryByText(MENSAJE_SIN_MOVIMIENTOS)).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(MENSAJE_EXITO)
  })

  it.each([
    ['"Cancelar"', 'Cancelar'],
    ['la flecha "Volver"', 'Volver'],
  ])('test_cancelar_vuelve_a_cuenta_sin_cambios: con saldo "10000", escribir 500 y presionar %s vuelve a la cuenta sin cambios', async (_caso, nombreBoton) => {
    const usuario = userEvent.setup()
    baseSimulada = { saldo: '10000', movimientos: [] }

    RenderizarApp()
    expect(await screen.findByText('USD 10.000,00')).toBeInTheDocument()

    await AbrirFormulario(usuario)
    await usuario.type(screen.getByLabelText('Monto'), '500')
    await usuario.click(screen.getByRole('button', { name: nombreBoton }))

    expect(await ObtenerEncabezadoCuenta()).toBeInTheDocument()
    expect(await screen.findByText('USD 10.000,00')).toBeInTheDocument()
    expect(screen.getByText(MENSAJE_SIN_MOVIMIENTOS)).toBeInTheDocument()
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
    expect(AgregarIngresoSimulado).not.toHaveBeenCalled()
  })

  it('test_falla_alta_sin_cambios_rechazado: con saldo "10000" y AgregarIngreso rechazado al guardar 1000 muestra el error en español y la cuenta queda sin cambios', async () => {
    const usuario = userEvent.setup()
    baseSimulada = { saldo: '10000', movimientos: [] }
    AgregarIngresoSimulado.mockRejectedValue(new Error(ERROR_TECNICO))

    const { container } = RenderizarApp()
    await screen.findByText('USD 10.000,00')

    await AbrirFormulario(usuario)
    await usuario.type(screen.getByLabelText('Monto'), '1000')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    const dialogo = await screen.findByRole('alertdialog')
    expect(dialogo.textContent).toBe(`${MENSAJE_ERROR_ALTA}Aceptar`)
    expect(container.textContent).not.toContain(ERROR_TECNICO)

    await usuario.click(within(dialogo).getByRole('button', { name: 'Aceptar' }))
    await usuario.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(await ObtenerEncabezadoCuenta()).toBeInTheDocument()
    expect(await screen.findByText('USD 10.000,00')).toBeInTheDocument()
    expect(screen.getByText(MENSAJE_SIN_MOVIMIENTOS)).toBeInTheDocument()
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
    expect(AgregarIngresoSimulado).toHaveBeenCalledTimes(1)
  })

  it('test_mensaje_exito_se_cierra_a_los_3_segundos: después de registrar, el mensaje se ve con role="status", sin "Aceptar", sigue a los 2999 ms y desaparece a los 3000 ms', async () => {
    const usuario = userEvent.setup()
    AgregarIngresoSimulado.mockImplementation(async ({ montoTexto, fecha }) => {
      baseSimulada = {
        saldo: '500',
        movimientos: [{ id: 'id-nuevo', tipo: 'INGRESO', monto: montoTexto, fecha, nombreCategoria: 'Pago Ingresado' }],
      }
    })

    RenderizarApp()
    await AbrirFormulario(usuario)
    await usuario.type(screen.getByLabelText('Monto'), '500')

    // Los relojes falsos se instalan antes de guardar: el temporizador del mensaje nace después.
    vi.useFakeTimers()
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    await VaciarPromesas()

    const mensaje = screen.getByRole('status')
    expect(mensaje).toHaveTextContent(MENSAJE_EXITO)
    expect(within(mensaje).queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Aceptar' })).not.toBeInTheDocument()
    expect(screen.getByText('USD 500,00')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(2999)
    })
    expect(screen.getByRole('status')).toHaveTextContent(MENSAJE_EXITO)

    act(() => {
      vi.advanceTimersByTime(1)
    })
    // La región sigue montada (la misma) y solo pierde el texto.
    expect(screen.getByRole('status')).toBe(mensaje)
    expect(mensaje).toBeEmptyDOMElement()
    expect(screen.queryByText(MENSAJE_EXITO)).not.toBeInTheDocument()
    expect(screen.getByText('USD 500,00')).toBeInTheDocument()
  })
})
