import { StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'

const { ObtenerCuentaSimulado, ObtenerMovimientosSimulado, AsegurarSesionSimulado } = vi.hoisted(() => ({
  ObtenerCuentaSimulado: vi.fn(),
  ObtenerMovimientosSimulado: vi.fn(),
  AsegurarSesionSimulado: vi.fn(),
}))

vi.mock('../servicios/cuentas.js', () => ({
  ObtenerCuenta: ObtenerCuentaSimulado,
}))
// clienteSupabase.js lanza al importarse sin variables VITE_* (el CI corre sin ellas):
// App importa el formulario, que importa estos servicios.
vi.mock('../servicios/movimientos.js', () => ({
  AgregarIngreso: vi.fn(),
  ObtenerMovimientos: ObtenerMovimientosSimulado,
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
const MOVIMIENTOS = [
  { id: 'id-1', tipo: 'INGRESO', monto: '1500.5', fecha: '2026-11-11', nombreCategoria: 'Sueldo' },
  { id: 'id-2', tipo: 'INGRESO', monto: '500.00', fecha: '2026-11-11', nombreCategoria: 'Pago Ingresado' },
  { id: 'id-3', tipo: 'INGRESO', monto: '20', fecha: '2026-11-09', nombreCategoria: 'Pago Ingresado' },
]
const MENSAJE_ERROR = 'No se pudo cargar su cuenta. Vuelva a intentarlo.'
const MENSAJE_SIN_MOVIMIENTOS = 'Aquí verá sus movimientos.'
const MENSAJE_EXITO = 'Ingreso registrado con éxito.'
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

// Muestra la ruta y el state de la navegación para comprobarlos desde la prueba.
function SondaUbicacion() {
  const ubicacion = useLocation()
  return (
    <>
      <p data-testid="sonda-ubicacion">{ubicacion.pathname}</p>
      <p data-testid="sonda-estado">{JSON.stringify(ubicacion.state)}</p>
    </>
  )
}

function RenderizarSeccion({ estadoNavegacion = null, estricto = false } = {}) {
  const arbol = (
    <MemoryRouter initialEntries={[{ pathname: '/', state: estadoNavegacion }]}>
      <Routes>
        <Route path="/" element={<SeccionCuenta />} />
        <Route path="/ingresos/nuevo" element={<p>Formulario</p>} />
      </Routes>
      <SondaUbicacion />
    </MemoryRouter>
  )

  return render(estricto ? <StrictMode>{arbol}</StrictMode> : arbol)
}

function ObtenerBotonAceptar() {
  return screen.getByRole('button', { name: 'Aceptar' })
}

function ObtenerEncabezado(nombre) {
  return screen.findByRole('heading', { level: 1, name: nombre })
}

// El contenido de la sección sin las sondas de la prueba.
function ObtenerTextoSeccion(container) {
  return container.textContent
    .replace(screen.getByTestId('sonda-ubicacion').textContent, '')
    .replace(screen.getByTestId('sonda-estado').textContent, '')
}

beforeEach(() => {
  ObtenerCuentaSimulado.mockReset()
  ObtenerMovimientosSimulado.mockReset()
  AsegurarSesionSimulado.mockReset()
  ObtenerCuentaSimulado.mockResolvedValue(CUENTA)
  ObtenerMovimientosSimulado.mockResolvedValue([])
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

describe('SeccionCuenta', () => {
  it('test_carga_cuenta_y_movimientos_en_paralelo: muestra "Cargando…" y pide la cuenta y los movimientos en paralelo', async () => {
    const cuenta = CrearPromesaControlada()
    const movimientos = CrearPromesaControlada()
    ObtenerCuentaSimulado.mockReturnValue(cuenta.promesa)
    ObtenerMovimientosSimulado.mockReturnValue(movimientos.promesa)

    RenderizarSeccion()

    expect(screen.getByText('Cargando…')).toBeInTheDocument()
    expect(ObtenerCuentaSimulado).toHaveBeenCalledTimes(1)
    expect(ObtenerMovimientosSimulado).toHaveBeenCalledTimes(1)

    await act(async () => {
      cuenta.resolver(CUENTA)
      movimientos.resolver([])
    })

    expect(screen.queryByText('Cargando…')).not.toBeInTheDocument()
  })

  it('AC-01: con la cuenta nueva y 0 movimientos muestra "Mi Cuenta (USD)" y "USD 0,00"', async () => {
    RenderizarSeccion()

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

    RenderizarSeccion()

    expect(await screen.findByText(saldoFormateado)).toBeInTheDocument()
  })

  it('test_lista_vacia_mensaje: sin movimientos muestra "Aquí verá sus movimientos." y no muestra la lista', async () => {
    RenderizarSeccion()

    expect(await screen.findByText(MENSAJE_SIN_MOVIMIENTOS)).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument()
  })

  it('test_seccion_muestra_lista_agrupada: con movimientos muestra la lista agrupada por fecha y no "Aquí verá sus movimientos."', async () => {
    ObtenerMovimientosSimulado.mockResolvedValue(MOVIMIENTOS)

    RenderizarSeccion()

    await ObtenerEncabezado('Mi Cuenta (USD)')
    expect(screen.queryByText(MENSAJE_SIN_MOVIMIENTOS)).not.toBeInTheDocument()
    expect(
      screen.getAllByRole('heading', { level: 2 }).map((encabezado) => encabezado.textContent),
    ).toEqual(['11/11/2026', '09/11/2026'])
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Sueldo+1.500,50',
      'Pago Ingresado+500,00',
      'Pago Ingresado+20,00',
    ])
  })

  it('test_boton_anadir_ingreso_navega: "Añadir Ingreso" navega a "/ingresos/nuevo"', async () => {
    const usuario = userEvent.setup()
    RenderizarSeccion()
    await ObtenerEncabezado('Mi Cuenta (USD)')

    await usuario.click(screen.getByRole('button', { name: 'Añadir Ingreso' }))

    expect(screen.getByTestId('sonda-ubicacion')).toHaveTextContent(/^\/ingresos\/nuevo$/)
    expect(screen.getByText('Formulario')).toBeInTheDocument()
  })

  it('renderiza el nombre de la cuenta como texto, sin interpretar HTML', async () => {
    const nombre = '<img src=x onerror=alert(1)>'
    ObtenerCuentaSimulado.mockResolvedValue({ ...CUENTA, nombre })

    const { container } = RenderizarSeccion()

    expect(await ObtenerEncabezado(`${nombre} (USD)`)).toBeInTheDocument()
    expect(container.querySelector('img')).toBeNull()
  })

  it('si ObtenerCuenta es rechazada muestra solo el mensaje con "Aceptar", sin el detalle técnico', async () => {
    ObtenerCuentaSimulado.mockRejectedValue(new Error(ERROR_TECNICO))

    const { container } = RenderizarSeccion()

    expect(await screen.findByRole('alertdialog')).toBeInTheDocument()
    expect(ObtenerBotonAceptar()).toBeEnabled()
    expect(ObtenerTextoSeccion(container)).toBe(`${MENSAJE_ERROR}Aceptar`)
  })

  it('test_error_carga_movimientos: si ObtenerMovimientos falla muestra "No se pudo cargar su cuenta. Vuelva a intentarlo." con "Aceptar"', async () => {
    ObtenerMovimientosSimulado.mockRejectedValue(new Error(ERROR_TECNICO))

    const { container } = RenderizarSeccion()

    await screen.findByRole('alertdialog')
    expect(ObtenerMovimientosSimulado).toHaveBeenCalledTimes(1)
    expect(ObtenerBotonAceptar()).toBeEnabled()
    expect(ObtenerTextoSeccion(container)).toBe(`${MENSAJE_ERROR}Aceptar`)
  })

  it.each([
    ['un monto "abc"', { monto: 'abc' }],
    ['una fecha "11/11/2026"', { fecha: '11/11/2026' }],
    ['un monto numérico', { monto: 500 }],
    ['un tipo desconocido', { tipo: 'OTRO' }],
  ])('test_movimiento_invalido_error_carga: un movimiento con %s muestra el error de carga y ningún monto', async (_caso, cambio) => {
    ObtenerMovimientosSimulado.mockResolvedValue([MOVIMIENTOS[0], { ...MOVIMIENTOS[1], ...cambio }])

    const { container } = RenderizarSeccion()

    await screen.findByRole('alertdialog')
    expect(ObtenerMovimientosSimulado).toHaveBeenCalledTimes(1)
    expect(ObtenerTextoSeccion(container)).toBe(`${MENSAJE_ERROR}Aceptar`)
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
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

    const { container } = RenderizarSeccion()

    await screen.findByRole('alertdialog')
    expect(ObtenerTextoSeccion(container)).toBe(`${MENSAJE_ERROR}Aceptar`)
    expect(screen.queryByText(/USD/)).not.toBeInTheDocument()
  })

  it('al presionar "Aceptar" reintenta la carga y muestra la cuenta', async () => {
    const usuario = userEvent.setup()
    ObtenerCuentaSimulado.mockRejectedValueOnce(new Error(ERROR_TECNICO))
    ObtenerCuentaSimulado.mockResolvedValueOnce(CUENTA)

    RenderizarSeccion()
    await screen.findByRole('alertdialog')

    await usuario.click(ObtenerBotonAceptar())

    expect(await ObtenerEncabezado('Mi Cuenta (USD)')).toBeInTheDocument()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(ObtenerCuentaSimulado).toHaveBeenCalledTimes(2)
    expect(ObtenerMovimientosSimulado).toHaveBeenCalledTimes(2)
  })

  it('"Aceptar" se deshabilita mientras reintenta y si el reintento falla vuelve habilitado', async () => {
    const usuario = userEvent.setup()
    const reintento = CrearPromesaControlada()
    ObtenerCuentaSimulado.mockRejectedValueOnce(new Error(ERROR_TECNICO))
    ObtenerCuentaSimulado.mockReturnValueOnce(reintento.promesa)

    const { container } = RenderizarSeccion()
    await screen.findByRole('alertdialog')

    await usuario.click(ObtenerBotonAceptar())

    await waitFor(() => expect(ObtenerBotonAceptar()).toBeDisabled())

    await act(async () => {
      reintento.rechazar(new Error(ERROR_TECNICO))
    })

    await waitFor(() => expect(ObtenerBotonAceptar()).toBeEnabled())
    expect(ObtenerTextoSeccion(container)).toBe(`${MENSAJE_ERROR}Aceptar`)
  })

  it('un doble clic en "Aceptar" lanza un solo reintento', async () => {
    const reintento = CrearPromesaControlada()
    ObtenerCuentaSimulado.mockRejectedValueOnce(new Error(ERROR_TECNICO))
    ObtenerCuentaSimulado.mockReturnValueOnce(reintento.promesa)

    RenderizarSeccion()
    await screen.findByRole('alertdialog')

    const boton = ObtenerBotonAceptar()
    fireEvent.click(boton)
    fireEvent.click(boton)

    expect(ObtenerCuentaSimulado).toHaveBeenCalledTimes(2)
    expect(ObtenerMovimientosSimulado).toHaveBeenCalledTimes(2)

    await act(async () => {
      reintento.resolver(CUENTA)
    })
  })

  it('en modo estricto hace una sola carga y muestra la cuenta', async () => {
    RenderizarSeccion({ estricto: true })

    expect(await ObtenerEncabezado('Mi Cuenta (USD)')).toBeInTheDocument()
    expect(ObtenerCuentaSimulado).toHaveBeenCalledTimes(1)
    expect(ObtenerMovimientosSimulado).toHaveBeenCalledTimes(1)
  })

  it('en desarrollo envía el detalle técnico a console.error', async () => {
    const errorTecnico = new Error(ERROR_TECNICO)
    ObtenerCuentaSimulado.mockRejectedValue(errorTecnico)

    RenderizarSeccion()
    await screen.findByRole('alertdialog')

    expect(console.error).toHaveBeenCalledWith(errorTecnico)
  })

  it('fuera de desarrollo no envía el detalle técnico a console.error', async () => {
    vi.stubEnv('DEV', false)
    const errorTecnico = new Error(ERROR_TECNICO)
    ObtenerCuentaSimulado.mockRejectedValue(errorTecnico)

    RenderizarSeccion()
    await screen.findByRole('alertdialog')

    expect(console.error).not.toHaveBeenCalledWith(errorTecnico)
  })

  it('test_mensaje_exito_desde_navegacion: con state.mensajeExito "Ingreso registrado con éxito." lo muestra con role="status" y limpia el state', async () => {
    RenderizarSeccion({ estadoNavegacion: { mensajeExito: MENSAJE_EXITO } })

    await ObtenerEncabezado('Mi Cuenta (USD)')

    expect(screen.getByRole('status')).toHaveTextContent(MENSAJE_EXITO)
    await waitFor(() => expect(screen.getByTestId('sonda-estado')).toHaveTextContent(/^null$/))
    expect(screen.getByTestId('sonda-ubicacion')).toHaveTextContent(/^\/$/)
    expect(screen.getByRole('status')).toHaveTextContent(MENSAJE_EXITO)
  })

  it('test_mensaje_exito_en_modo_estricto: con StrictMode el mensaje de éxito se muestra una vez y el state de la navegación queda limpio', async () => {
    RenderizarSeccion({ estadoNavegacion: { mensajeExito: MENSAJE_EXITO }, estricto: true })

    await ObtenerEncabezado('Mi Cuenta (USD)')

    await waitFor(() => expect(screen.getByTestId('sonda-estado')).toHaveTextContent(/^null$/))
    const mensajes = screen.getAllByRole('status')
    expect(mensajes).toHaveLength(1)
    expect(mensajes[0]).toHaveTextContent(MENSAJE_EXITO)
    expect(screen.getAllByText(MENSAJE_EXITO)).toHaveLength(1)
  })

  it.each([
    ['otro texto', { mensajeExito: '<b>Pago aprobado</b>' }],
    ['el texto sin punto final', { mensajeExito: 'Ingreso registrado con éxito' }],
    ['un valor que no es texto', { mensajeExito: { texto: MENSAJE_EXITO } }],
  ])('test_mensaje_desconocido_rechazado: state.mensajeExito con %s no muestra ningún mensaje', async (_caso, estadoNavegacion) => {
    RenderizarSeccion({ estadoNavegacion })

    await ObtenerEncabezado('Mi Cuenta (USD)')

    expect(screen.getByRole('status')).toBeEmptyDOMElement()
    expect(screen.queryByText(/Pago aprobado|registrado/)).not.toBeInTheDocument()
    await waitFor(() => expect(screen.getByTestId('sonda-estado')).toHaveTextContent(/^null$/))
  })

  it('test_region_estado_siempre_montada: sin mensaje de éxito la región role="status" ya está montada y vacía', async () => {
    RenderizarSeccion()

    await ObtenerEncabezado('Mi Cuenta (USD)')

    const region = screen.getByRole('status')
    expect(region).toBeEmptyDOMElement()
    expect(screen.queryByRole('button', { name: 'Aceptar' })).not.toBeInTheDocument()
  })
})

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
