import { StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router'

const { ObtenerCuentaSimulado, ContarMovimientosSimulado, AsegurarSesionSimulado } = vi.hoisted(() => ({
  ObtenerCuentaSimulado: vi.fn(),
  ContarMovimientosSimulado: vi.fn(),
  AsegurarSesionSimulado: vi.fn(),
}))

vi.mock('../servicios/cuentas.js', () => ({
  ObtenerCuenta: ObtenerCuentaSimulado,
  ContarMovimientos: ContarMovimientosSimulado,
}))
// clienteSupabase.js lanza al importarse sin variables VITE_* (el CI corre sin ellas):
// App importa el formulario, que importa estos servicios.
vi.mock('../servicios/movimientos.js', () => ({
  AgregarIngreso: vi.fn(),
  ObtenerMovimientos: vi.fn(),
}))
vi.mock('../servicios/categorias.js', () => ({
  ObtenerCategoriasIngreso: vi.fn().mockResolvedValue([
    { id: 'id-pago-ingresado', nombre: 'Pago Ingresado', es_defecto: true },
  ]),
}))
vi.mock('../autenticacion/sesion.js', () => ({
  AsegurarSesion: AsegurarSesionSimulado,
  MENSAJE_ERROR_SESION: 'No se pudo iniciar la sesión. Vuelva a intentarlo.',
}))

import App from '../App.jsx'
import SeccionCuenta from './SeccionCuenta.jsx'

const CUENTA = { id: 'id-cuenta', nombre: 'Mi Cuenta', moneda: 'USD', saldo: '0' }
const MENSAJE_ERROR = 'No se pudo cargar su cuenta. Vuelva a intentarlo.'
const MENSAJE_SIN_MOVIMIENTOS = 'Aquí verá sus movimientos.'
const ERROR_TECNICO = 'PGRST116: JSON object requested, multiple (or no) rows returned'

function CrearPromesaControlada() {
  let resolver
  let rechazar
  const promesa = new Promise((alResolver, alRechazar) => {
    resolver = alResolver
    rechazar = alRechazar
  })
  return { promesa, resolver, rechazar }
}

function ObtenerBotonAceptar() {
  return screen.getByRole('button', { name: 'Aceptar' })
}

function ObtenerEncabezado(nombre) {
  return screen.findByRole('heading', { level: 1, name: nombre })
}

beforeEach(() => {
  ObtenerCuentaSimulado.mockReset()
  ContarMovimientosSimulado.mockReset()
  AsegurarSesionSimulado.mockReset()
  ObtenerCuentaSimulado.mockResolvedValue(CUENTA)
  ContarMovimientosSimulado.mockResolvedValue(0)
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

describe('SeccionCuenta', () => {
  it('muestra "Cargando…" y pide la cuenta y el conteo en paralelo', async () => {
    const cuenta = CrearPromesaControlada()
    const conteo = CrearPromesaControlada()
    ObtenerCuentaSimulado.mockReturnValue(cuenta.promesa)
    ContarMovimientosSimulado.mockReturnValue(conteo.promesa)

    render(<SeccionCuenta />)

    expect(screen.getByText('Cargando…')).toBeInTheDocument()
    expect(ObtenerCuentaSimulado).toHaveBeenCalledTimes(1)
    expect(ContarMovimientosSimulado).toHaveBeenCalledTimes(1)

    await act(async () => {
      cuenta.resolver(CUENTA)
      conteo.resolver(0)
    })

    expect(screen.queryByText('Cargando…')).not.toBeInTheDocument()
  })

  it('AC-01: con la cuenta nueva y 0 movimientos muestra "Mi Cuenta (USD)" y "USD 0,00"', async () => {
    render(<SeccionCuenta />)

    expect(await ObtenerEncabezado('Mi Cuenta (USD)')).toBeInTheDocument()
    expect(screen.getByText('USD 0,00')).toBeInTheDocument()
  })

  it.each([
    ['11000', 'USD 11.000,00'],
    ['1500.5', 'USD 1.500,50'],
    ['-1000', 'USD -1.000,00'],
    ['1999999999999.98', 'USD 1.999.999.999.999,98'],
  ])('muestra el saldo %s formateado desde el texto como %s', async (saldo, saldoFormateado) => {
    ObtenerCuentaSimulado.mockResolvedValue({ ...CUENTA, saldo })

    render(<SeccionCuenta />)

    expect(await screen.findByText(saldoFormateado)).toBeInTheDocument()
  })

  it('AC-22: con 0 movimientos muestra "Aquí verá sus movimientos."', async () => {
    ContarMovimientosSimulado.mockResolvedValue(0)

    render(<SeccionCuenta />)

    expect(await screen.findByText(MENSAJE_SIN_MOVIMIENTOS)).toBeInTheDocument()
  })

  it('AC-22: con 3 movimientos no muestra "Aquí verá sus movimientos."', async () => {
    ContarMovimientosSimulado.mockResolvedValue(3)

    render(<SeccionCuenta />)

    await ObtenerEncabezado('Mi Cuenta (USD)')
    expect(screen.queryByText(MENSAJE_SIN_MOVIMIENTOS)).not.toBeInTheDocument()
  })

  it('renderiza el nombre de la cuenta como texto, sin interpretar HTML', async () => {
    const nombre = '<img src=x onerror=alert(1)>'
    ObtenerCuentaSimulado.mockResolvedValue({ ...CUENTA, nombre })

    const { container } = render(<SeccionCuenta />)

    expect(await ObtenerEncabezado(`${nombre} (USD)`)).toBeInTheDocument()
    expect(container.querySelector('img')).toBeNull()
  })

  it('si ObtenerCuenta es rechazada muestra solo el mensaje con "Aceptar", sin el detalle técnico', async () => {
    ObtenerCuentaSimulado.mockRejectedValue(new Error(ERROR_TECNICO))

    const { container } = render(<SeccionCuenta />)

    expect(await screen.findByRole('alertdialog')).toBeInTheDocument()
    expect(ObtenerBotonAceptar()).toBeEnabled()
    expect(container.textContent).toBe(`${MENSAJE_ERROR}Aceptar`)
  })

  it('si ContarMovimientos es rechazada muestra el mismo mensaje y no muestra el saldo', async () => {
    ContarMovimientosSimulado.mockRejectedValue(new Error(ERROR_TECNICO))

    const { container } = render(<SeccionCuenta />)

    await screen.findByRole('alertdialog')
    expect(container.textContent).toBe(`${MENSAJE_ERROR}Aceptar`)
  })

  it.each([
    ['un error de 0 filas', () => Promise.reject({ code: 'PGRST116', message: ERROR_TECNICO })],
    ['un saldo "abc"', () => Promise.resolve({ ...CUENTA, saldo: 'abc' })],
    ['un saldo numérico', () => Promise.resolve({ ...CUENTA, saldo: 0 })],
    ['un saldo nulo', () => Promise.resolve({ ...CUENTA, saldo: null })],
    ['una moneda inválida', () => Promise.resolve({ ...CUENTA, moneda: 'usd' })],
    ['una cuenta nula', () => Promise.resolve(null)],
  ])('con %s muestra el mismo mensaje y ningún saldo', async (_caso, ObtenerRespuesta) => {
    ObtenerCuentaSimulado.mockImplementation(ObtenerRespuesta)

    const { container } = render(<SeccionCuenta />)

    await screen.findByRole('alertdialog')
    expect(container.textContent).toBe(`${MENSAJE_ERROR}Aceptar`)
    expect(screen.queryByText(/USD/)).not.toBeInTheDocument()
  })

  it('al presionar "Aceptar" reintenta la carga y muestra la cuenta', async () => {
    const usuario = userEvent.setup()
    ObtenerCuentaSimulado.mockRejectedValueOnce(new Error(ERROR_TECNICO))
    ObtenerCuentaSimulado.mockResolvedValueOnce(CUENTA)

    render(<SeccionCuenta />)
    await screen.findByRole('alertdialog')

    await usuario.click(ObtenerBotonAceptar())

    expect(await ObtenerEncabezado('Mi Cuenta (USD)')).toBeInTheDocument()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(ObtenerCuentaSimulado).toHaveBeenCalledTimes(2)
    expect(ContarMovimientosSimulado).toHaveBeenCalledTimes(2)
  })

  it('"Aceptar" se deshabilita mientras reintenta y si el reintento falla vuelve habilitado', async () => {
    const usuario = userEvent.setup()
    const reintento = CrearPromesaControlada()
    ObtenerCuentaSimulado.mockRejectedValueOnce(new Error(ERROR_TECNICO))
    ObtenerCuentaSimulado.mockReturnValueOnce(reintento.promesa)

    const { container } = render(<SeccionCuenta />)
    await screen.findByRole('alertdialog')

    await usuario.click(ObtenerBotonAceptar())

    await waitFor(() => expect(ObtenerBotonAceptar()).toBeDisabled())

    await act(async () => {
      reintento.rechazar(new Error(ERROR_TECNICO))
    })

    await waitFor(() => expect(ObtenerBotonAceptar()).toBeEnabled())
    expect(container.textContent).toBe(`${MENSAJE_ERROR}Aceptar`)
  })

  it('un doble clic en "Aceptar" lanza un solo reintento', async () => {
    const reintento = CrearPromesaControlada()
    ObtenerCuentaSimulado.mockRejectedValueOnce(new Error(ERROR_TECNICO))
    ObtenerCuentaSimulado.mockReturnValueOnce(reintento.promesa)

    render(<SeccionCuenta />)
    await screen.findByRole('alertdialog')

    const boton = ObtenerBotonAceptar()
    fireEvent.click(boton)
    fireEvent.click(boton)

    expect(ObtenerCuentaSimulado).toHaveBeenCalledTimes(2)
    expect(ContarMovimientosSimulado).toHaveBeenCalledTimes(2)

    await act(async () => {
      reintento.resolver(CUENTA)
    })
  })

  it('en modo estricto hace una sola carga y muestra la cuenta', async () => {
    render(
      <StrictMode>
        <SeccionCuenta />
      </StrictMode>,
    )

    expect(await ObtenerEncabezado('Mi Cuenta (USD)')).toBeInTheDocument()
    expect(ObtenerCuentaSimulado).toHaveBeenCalledTimes(1)
    expect(ContarMovimientosSimulado).toHaveBeenCalledTimes(1)
  })

  it('en desarrollo envía el detalle técnico a console.error', async () => {
    const errorTecnico = new Error(ERROR_TECNICO)
    ObtenerCuentaSimulado.mockRejectedValue(errorTecnico)

    render(<SeccionCuenta />)
    await screen.findByRole('alertdialog')

    expect(console.error).toHaveBeenCalledWith(errorTecnico)
  })

  it('fuera de desarrollo no envía el detalle técnico a console.error', async () => {
    vi.stubEnv('DEV', false)
    const errorTecnico = new Error(ERROR_TECNICO)
    ObtenerCuentaSimulado.mockRejectedValue(errorTecnico)

    render(<SeccionCuenta />)
    await screen.findByRole('alertdialog')

    expect(console.error).not.toHaveBeenCalledWith(errorTecnico)
  })
})

function SondaUbicacion() {
  const ubicacion = useLocation()
  return <p data-testid="sonda-ubicacion">{ubicacion.pathname}</p>
}

function RenderizarApp(ruta = '/') {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <App />
      <SondaUbicacion />
    </MemoryRouter>,
  )
}

describe('App', () => {
  it('AC-01: muestra la sección Cuenta como pantalla inicial recién cuando hay sesión', async () => {
    const sesion = CrearPromesaControlada()
    AsegurarSesionSimulado.mockReturnValue(sesion.promesa)

    RenderizarApp()

    expect(screen.getByText('Cargando…')).toBeInTheDocument()
    expect(ObtenerCuentaSimulado).not.toHaveBeenCalled()

    await act(async () => {
      sesion.resolver({ user: { id: 'usuario' } })
    })

    expect(await ObtenerEncabezado('Mi Cuenta (USD)')).toBeInTheDocument()
    expect(screen.getByText('USD 0,00')).toBeInTheDocument()
  })

  it('test_ruta_desconocida_redirige: en "/otra" muestra la sección Cuenta y reemplaza la ruta por "/"', async () => {
    AsegurarSesionSimulado.mockResolvedValue({ user: { id: 'usuario' } })

    RenderizarApp('/otra')

    expect(await ObtenerEncabezado('Mi Cuenta (USD)')).toBeInTheDocument()
    expect(screen.getByTestId('sonda-ubicacion')).toHaveTextContent(/^\/$/)
  })

  it('test_ruta_formulario_ingreso: en "/ingresos/nuevo" muestra el formulario "Añadir Ingreso" y no la sección Cuenta', async () => {
    AsegurarSesionSimulado.mockResolvedValue({ user: { id: 'usuario' } })

    RenderizarApp('/ingresos/nuevo')

    expect(await ObtenerEncabezado('Añadir Ingreso')).toBeInTheDocument()
    expect(ObtenerCuentaSimulado).not.toHaveBeenCalled()
  })
})
