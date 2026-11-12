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

// Categorías propias: el cliente no puede crearlas, así que solo existen en el servicio simulado.
// Van ya ordenadas, como las entrega ObtenerCategoriasIngreso.
const CATEGORIAS_PROPIAS = [
  { id: 'id-pago-ingresado', nombre: 'Pago Ingresado', es_defecto: true },
  { id: 'id-sueldo', nombre: 'Sueldo', es_defecto: false },
  { id: 'id-ventas', nombre: 'Ventas', es_defecto: false },
]

// Montos en centavos con BigInt: nunca float (RNF-04).
function ConvertirMontoACentavos(montoTexto) {
  const [enteros, decimales = ''] = montoTexto.split('.')
  return BigInt(enteros) * 100n + BigInt(decimales.padEnd(2, '0'))
}

function ConvertirCentavosAMonto(centavos) {
  return `${centavos / 100n}.${String(centavos % 100n).padStart(2, '0')}`
}

// Guarda el alta en la base simulada con su orden de alta, como fecha_alta en BAT_MOVIMIENTOS.
async function GuardarIngresoEnBase({ montoTexto, fecha, idCategoria }) {
  const categoria = CATEGORIAS_PROPIAS.find((categoriaActual) => categoriaActual.id === idCategoria)

  if (!categoria) {
    throw new Error('Categoría inexistente')
  }

  const ordenAlta = baseSimulada.movimientos.length + 1
  baseSimulada = {
    saldo: ConvertirCentavosAMonto(
      ConvertirMontoACentavos(baseSimulada.saldo) + ConvertirMontoACentavos(montoTexto),
    ),
    movimientos: [
      ...baseSimulada.movimientos,
      { id: `id-movimiento-${ordenAlta}`, tipo: 'INGRESO', monto: montoTexto, fecha, nombreCategoria: categoria.nombre, ordenAlta },
    ],
  }
}

// Mismo orden que la consulta real de ObtenerMovimientos: fecha desc y después fecha_alta desc.
// La base guarda en orden de alta (el más viejo primero), así que sin ordenar la lista saldría al revés.
function ObtenerMovimientosOrdenadosDeBase() {
  const ordenados = [...baseSimulada.movimientos].sort(
    (movimientoA, movimientoB) =>
      movimientoB.fecha.localeCompare(movimientoA.fecha) || movimientoB.ordenAlta - movimientoA.ordenAlta,
  )

  return Promise.resolve(
    ordenados.map(({ id, tipo, monto, fecha, nombreCategoria }) => ({ id, tipo, monto, fecha, nombreCategoria })),
  )
}

// Abre el calendario y elige un día de 2026 con el selector de mes, sin cambiar el año.
async function ElegirDiaDe2026(usuario, { mes, dia }) {
  await usuario.click(screen.getByRole('button', { name: /^Fecha \d{2}\/\d{2}\/\d{4}$/ }))
  await usuario.selectOptions(screen.getByRole('combobox', { name: 'Elegir el mes' }), mes)
  // "\b" evita que el 1 encuentre también el 11, el 21 o el 31.
  await usuario.click(
    screen.getByRole('button', { name: new RegExp(`\\b${dia} de ${mes.toLowerCase()} de 2026`) }),
  )
}

async function RegistrarIngreso(usuario, { monto, nombreCategoria, mes, dia }) {
  await AbrirFormulario(usuario)
  await usuario.type(screen.getByLabelText('Monto'), monto)
  await usuario.selectOptions(screen.getByLabelText('Categoría'), nombreCategoria)

  if (mes) {
    await ElegirDiaDe2026(usuario, { mes, dia })
  }

  await usuario.click(screen.getByRole('button', { name: 'Guardar' }))
  await ObtenerEncabezadoCuenta()
}

function LeerGruposDeLista() {
  return screen.getAllByRole('heading', { level: 2 }).map((encabezado) => ({
    fecha: encabezado.textContent,
    movimientos: within(encabezado.closest('section'))
      .getAllByRole('listitem')
      .map((item) => item.textContent),
  }))
}

describe('Flujo de alta con categoría y fecha elegidas', () => {
  // Solo se falsea Date: userEvent y el mensaje de éxito siguen con los temporizadores reales.
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 6, 12, 0))
    ObtenerCategoriasIngresoSimulado.mockResolvedValue(CATEGORIAS_PROPIAS)
    AgregarIngresoSimulado.mockImplementation(GuardarIngresoEnBase)
    ObtenerMovimientosSimulado.mockImplementation(ObtenerMovimientosOrdenadosDeBase)
  })

  it('test_alta_con_categoria_elegida_flujo: con saldo USD 10.000,00 se registra 1000 en "Sueldo" con la fecha de hoy y la cuenta muestra "Sueldo" "+1.000,00" bajo hoy, "USD 11.000,00" y el mensaje de éxito', async () => {
    const usuario = userEvent.setup()
    baseSimulada = { saldo: '10000', movimientos: [] }

    RenderizarApp()
    expect(await screen.findByText('USD 10.000,00')).toBeInTheDocument()

    await AbrirFormulario(usuario)
    expect(screen.getByRole('button', { name: 'Fecha 06/11/2026' })).toBeInTheDocument()
    await usuario.type(screen.getByLabelText('Monto'), '1000')
    await usuario.selectOptions(screen.getByLabelText('Categoría'), 'Sueldo')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await ObtenerEncabezadoCuenta()).toBeInTheDocument()
    expect(await screen.findByText('USD 11.000,00')).toBeInTheDocument()
    expect(AgregarIngresoSimulado).toHaveBeenCalledTimes(1)
    expect(AgregarIngresoSimulado).toHaveBeenCalledWith({
      montoTexto: '1000',
      fecha: '2026-11-06',
      idCategoria: 'id-sueldo',
    })

    const grupo = screen.getByRole('heading', { level: 2, name: '06/11/2026' }).closest('section')
    const items = within(grupo).getAllByRole('listitem')
    expect(items).toHaveLength(1)
    expect(within(items[0]).getByText('Sueldo')).toBeInTheDocument()
    expect(within(items[0]).getByText('+1.000,00')).toBeInTheDocument()
    expect(screen.queryByText('Pago Ingresado')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(MENSAJE_EXITO)
  })

  it('test_lista_ordenada_por_fecha_y_alta: tras registrar 1.500 en "Sueldo" el 17/09/2026, 50.000 en "Ventas" el 01/10/2026 y 800 en "Pago Ingresado" el 01/10/2026, la lista muestra 01/10/2026 ("Pago Ingresado", "Ventas") y después 17/09/2026 ("Sueldo")', async () => {
    const usuario = userEvent.setup()

    RenderizarApp()
    expect(await screen.findByText('USD 0,00')).toBeInTheDocument()

    await RegistrarIngreso(usuario, { monto: '1500', nombreCategoria: 'Sueldo', mes: 'Septiembre', dia: 17 })
    await RegistrarIngreso(usuario, { monto: '50000', nombreCategoria: 'Ventas', mes: 'Octubre', dia: 1 })
    await RegistrarIngreso(usuario, { monto: '800', nombreCategoria: 'Pago Ingresado', mes: 'Octubre', dia: 1 })

    expect(await screen.findByText('USD 52.300,00')).toBeInTheDocument()
    expect(AgregarIngresoSimulado.mock.calls.map(([datosAlta]) => datosAlta)).toEqual([
      { montoTexto: '1500', fecha: '2026-09-17', idCategoria: 'id-sueldo' },
      { montoTexto: '50000', fecha: '2026-10-01', idCategoria: 'id-ventas' },
      { montoTexto: '800', fecha: '2026-10-01', idCategoria: 'id-pago-ingresado' },
    ])
    expect(LeerGruposDeLista()).toEqual([
      { fecha: '01/10/2026', movimientos: ['Pago Ingresado+800,00', 'Ventas+50.000,00'] },
      { fecha: '17/09/2026', movimientos: ['Sueldo+1.500,00'] },
    ])
  })
})

// El monto se escribe con la máscara del campo y la base simulada suma en centavos con BigInt,
// así la cuenta muestra exactamente lo que dejan la máscara, la validación y el formato (NFR-01).
describe('Flujo del monto con máscara y límites', () => {
  const MENSAJE_MONTO_MAXIMO = 'El monto máximo es 999.999.999.999,99.'

  beforeEach(() => {
    ObtenerCategoriasIngresoSimulado.mockResolvedValue(CATEGORIAS_PROPIAS)
    AgregarIngresoSimulado.mockImplementation(GuardarIngresoEnBase)
    ObtenerMovimientosSimulado.mockImplementation(ObtenerMovimientosOrdenadosDeBase)
  })

  it('test_alta_monto_con_miles_flujo: con saldo 10000.00 escribe "1500,50", el campo muestra "1.500,50" y al guardar la cuenta muestra "+1.500,50" y "USD 11.500,50" (AC-16)', async () => {
    const usuario = userEvent.setup()
    baseSimulada = { saldo: '10000.00', movimientos: [] }

    RenderizarApp()
    expect(await screen.findByText('USD 10.000,00')).toBeInTheDocument()

    await AbrirFormulario(usuario)
    const campoMonto = screen.getByLabelText('Monto')
    await usuario.type(campoMonto, '1500,50')
    expect(campoMonto).toHaveValue('1.500,50')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await ObtenerEncabezadoCuenta()).toBeInTheDocument()
    expect(await screen.findByText('USD 11.500,50')).toBeInTheDocument()
    expect(AgregarIngresoSimulado).toHaveBeenCalledTimes(1)
    expect(AgregarIngresoSimulado.mock.calls[0][0]).toMatchObject({ montoTexto: '1500.50' })
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(1)
    expect(within(items[0]).getByText('+1.500,50')).toBeInTheDocument()
  })

  it('test_monto_maximo_flujo: con saldo 0, "1000000000000,00" muestra "El monto máximo es 999.999.999.999,99." y no registra nada; después "999999999999,99" registra y la cuenta muestra "USD 999.999.999.999,99" (AC-19)', async () => {
    const usuario = userEvent.setup()

    RenderizarApp()
    expect(await screen.findByText('USD 0,00')).toBeInTheDocument()

    await AbrirFormulario(usuario)
    const campoMonto = screen.getByLabelText('Monto')
    await usuario.type(campoMonto, '1000000000000,00')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    const dialogo = await screen.findByRole('alertdialog')
    expect(dialogo.textContent).toBe(`${MENSAJE_MONTO_MAXIMO}Aceptar`)
    expect(AgregarIngresoSimulado).not.toHaveBeenCalled()
    expect(baseSimulada).toEqual({ saldo: '0', movimientos: [] })
    expect(campoMonto).toHaveValue('1.000.000.000.000,00')

    await usuario.click(within(dialogo).getByRole('button', { name: 'Aceptar' }))
    await usuario.clear(campoMonto)
    await usuario.type(campoMonto, '999999999999,99')
    expect(campoMonto).toHaveValue('999.999.999.999,99')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await ObtenerEncabezadoCuenta()).toBeInTheDocument()
    expect(await screen.findByText('USD 999.999.999.999,99')).toBeInTheDocument()
    expect(AgregarIngresoSimulado).toHaveBeenCalledTimes(1)
    expect(AgregarIngresoSimulado.mock.calls[0][0]).toMatchObject({ montoTexto: '999999999999.99' })
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(1)
    expect(within(items[0]).getByText('+999.999.999.999,99')).toBeInTheDocument()
  })

  it('test_suma_decimales_flujo: con saldo 0, registrar "0,10" y "0,20" muestra "USD 0,30" (AC-29)', async () => {
    const usuario = userEvent.setup()

    RenderizarApp()
    expect(await screen.findByText('USD 0,00')).toBeInTheDocument()

    await RegistrarIngreso(usuario, { monto: '0,10', nombreCategoria: 'Pago Ingresado' })
    await RegistrarIngreso(usuario, { monto: '0,20', nombreCategoria: 'Pago Ingresado' })

    expect(await screen.findByText('USD 0,30')).toBeInTheDocument()
    expect(AgregarIngresoSimulado.mock.calls.map(([datosAlta]) => datosAlta.montoTexto)).toEqual(['0.10', '0.20'])
    expect(baseSimulada.saldo).toBe('0.30')
  })

  it('test_dos_montos_maximos_flujo: con saldo 0, registrar dos veces "999999999999,99" muestra "USD 1.999.999.999.999,98" (AC-30)', async () => {
    const usuario = userEvent.setup()

    RenderizarApp()
    expect(await screen.findByText('USD 0,00')).toBeInTheDocument()

    await RegistrarIngreso(usuario, { monto: '999999999999,99', nombreCategoria: 'Pago Ingresado' })
    await RegistrarIngreso(usuario, { monto: '999999999999,99', nombreCategoria: 'Pago Ingresado' })

    expect(await screen.findByText('USD 1.999.999.999.999,98')).toBeInTheDocument()
    expect(AgregarIngresoSimulado.mock.calls.map(([datosAlta]) => datosAlta.montoTexto)).toEqual([
      '999999999999.99',
      '999999999999.99',
    ])
    expect(baseSimulada.saldo).toBe('1999999999999.98')
  })
})

// Copia de la de SeccionCuenta.test.jsx: deja el alta pendiente hasta que la prueba decida.
function CrearPromesaControlada() {
  let resolver
  let rechazar
  const promesa = new Promise((alResolver, alRechazar) => {
    resolver = alResolver
    rechazar = alRechazar
  })
  return { promesa, resolver, rechazar }
}

const MENSAJE_MONTO_CERO = 'El monto debe ser mayor a 0.'
const MENSAJE_ERROR_CARGA_CUENTA = 'No se pudo cargar su cuenta. Vuelva a intentarlo.'
const ERROR_TECNICO_CARGA = 'FetchError: connect ECONNREFUSED 127.0.0.1:54321 /rest/v1/bat_cuentas'

async function CompletarFormulario(usuario) {
  await usuario.type(screen.getByLabelText('Monto'), '500')
  await usuario.selectOptions(screen.getByLabelText('Categoría'), 'Sueldo')
  await ElegirDiaDe2026(usuario, { mes: 'Octubre', dia: 1 })
  expect(screen.getByLabelText('Monto')).toHaveValue('500')
  expect(screen.getByLabelText('Categoría')).toHaveDisplayValue('Sueldo')
  expect(screen.getByRole('button', { name: 'Fecha 01/10/2026' })).toBeInTheDocument()
}

function ComprobarFormularioLimpio() {
  expect(screen.getByLabelText('Monto')).toHaveValue('')
  expect(screen.getByLabelText('Categoría')).toHaveDisplayValue('Pago Ingresado')
  expect(screen.getByRole('button', { name: 'Fecha 06/11/2026' })).toBeInTheDocument()
}

describe('Flujo del formulario y de los mensajes', () => {
  // Solo se falsea Date: userEvent y los findBy siguen con los temporizadores reales.
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 6, 12, 0))
    ObtenerCategoriasIngresoSimulado.mockResolvedValue(CATEGORIAS_PROPIAS)
    AgregarIngresoSimulado.mockImplementation(GuardarIngresoEnBase)
    ObtenerMovimientosSimulado.mockImplementation(ObtenerMovimientosOrdenadosDeBase)
  })

  it('test_formulario_limpio_al_volver_flujo: tras completar 500, "Sueldo" y el 01/10/2026 y salir con la flecha, con "Cancelar" o guardando, al volver a abrir "Añadir Ingreso" se ven el monto vacío, "Pago Ingresado" y la fecha de hoy (AC-08)', async () => {
    const usuario = userEvent.setup()

    RenderizarApp()
    expect(await screen.findByText('USD 0,00')).toBeInTheDocument()

    // Sale con la flecha "Volver".
    await AbrirFormulario(usuario)
    ComprobarFormularioLimpio()
    await CompletarFormulario(usuario)
    await usuario.click(screen.getByRole('button', { name: 'Volver' }))

    // Sale con "Cancelar".
    await AbrirFormulario(usuario)
    ComprobarFormularioLimpio()
    await CompletarFormulario(usuario)
    await usuario.click(screen.getByRole('button', { name: 'Cancelar' }))

    // Sale guardando.
    await AbrirFormulario(usuario)
    ComprobarFormularioLimpio()
    await CompletarFormulario(usuario)
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(await screen.findByText('USD 500,00')).toBeInTheDocument()

    await AbrirFormulario(usuario)
    ComprobarFormularioLimpio()
    expect(AgregarIngresoSimulado).toHaveBeenCalledTimes(1)
    expect(AgregarIngresoSimulado).toHaveBeenCalledWith({
      montoTexto: '500',
      fecha: '2026-10-01',
      idCategoria: 'id-sueldo',
    })
  })

  it('test_doble_clic_guardar_flujo: con saldo 10000.00 y el alta pendiente, un clic en "Guardar" con 1500 seguido de otro envío muestra "Guardando…" y registra un solo ingreso; la cuenta muestra "USD 11.500,00" (AC-21)', async () => {
    const usuario = userEvent.setup()
    baseSimulada = { saldo: '10000.00', movimientos: [] }
    const alta = CrearPromesaControlada()
    AgregarIngresoSimulado.mockImplementation(async (datosAlta) => {
      await alta.promesa
      await GuardarIngresoEnBase(datosAlta)
    })

    RenderizarApp()
    expect(await screen.findByText('USD 10.000,00')).toBeInTheDocument()

    await AbrirFormulario(usuario)
    await usuario.type(screen.getByLabelText('Monto'), '1500')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    const botonGuardando = screen.getByRole('button', { name: 'Guardando…' })
    expect(botonGuardando).toBeDisabled()
    // El segundo envío llega a onSubmit aunque el botón esté deshabilitado: lo corta la guardia.
    fireEvent.submit(botonGuardando.closest('form'))
    expect(AgregarIngresoSimulado).toHaveBeenCalledTimes(1)

    await act(async () => {
      alta.resolver()
    })

    expect(await ObtenerEncabezadoCuenta()).toBeInTheDocument()
    expect(await screen.findByText('USD 11.500,00')).toBeInTheDocument()
    expect(AgregarIngresoSimulado).toHaveBeenCalledTimes(1)
    expect(baseSimulada.movimientos).toHaveLength(1)
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(1)
    expect(within(items[0]).getByText('+1.500,00')).toBeInTheDocument()
  })

  it('test_segundo_ingreso_con_mensaje_exito_flujo: con "Ingreso registrado con éxito." todavía en pantalla se abre "Añadir Ingreso" y se registra un segundo ingreso de 500 sin cerrar el mensaje (AC-25)', async () => {
    const usuario = userEvent.setup()

    RenderizarApp()
    expect(await screen.findByText('USD 0,00')).toBeInTheDocument()

    await AbrirFormulario(usuario)
    await usuario.type(screen.getByLabelText('Monto'), '500')

    // Relojes falsos completos antes de guardar: el cierre de 3 s no corre mientras la prueba no avance.
    vi.useFakeTimers()
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    await VaciarPromesas()

    const mensaje = screen.getByRole('status')
    expect(mensaje).toHaveTextContent(MENSAJE_EXITO)
    expect(within(mensaje).queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(screen.getByText('USD 500,00')).toBeInTheDocument()

    // Sin cerrar el mensaje, se abre el formulario y se guarda el segundo ingreso.
    fireEvent.click(screen.getByRole('button', { name: 'Añadir Ingreso' }))
    await VaciarPromesas()
    expect(screen.getByRole('heading', { level: 1, name: 'Añadir Ingreso' })).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Monto'), { target: { value: '500' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    await VaciarPromesas()

    expect(screen.getByRole('heading', { level: 1, name: 'Mi Cuenta (USD)' })).toBeInTheDocument()
    expect(screen.getByText('USD 1.000,00')).toBeInTheDocument()
    expect(AgregarIngresoSimulado).toHaveBeenCalledTimes(2)
    expect(AgregarIngresoSimulado.mock.calls.map(([datosAlta]) => datosAlta.montoTexto)).toEqual(['500', '500'])
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByRole('status')).toHaveTextContent(MENSAJE_EXITO)
  })

  it('test_mensaje_error_monto_cero_diez_segundos_flujo: con monto "0", "El monto debe ser mayor a 0." sigue visible a los 10 s y solo se cierra con "Aceptar" (AC-26)', async () => {
    const usuario = userEvent.setup()

    RenderizarApp()
    expect(await screen.findByText('USD 0,00')).toBeInTheDocument()
    await AbrirFormulario(usuario)

    // Temporizadores falsos completos: un cierre por setTimeout correría al avanzar los 10 s.
    vi.useFakeTimers()
    fireEvent.change(screen.getByLabelText('Monto'), { target: { value: '0' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    act(() => {
      vi.advanceTimersByTime(10000)
    })

    expect(screen.getByRole('alertdialog').textContent).toBe(`${MENSAJE_MONTO_CERO}Aceptar`)

    fireEvent.click(screen.getByRole('button', { name: 'Aceptar' }))

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Monto')).toHaveValue('0')
    expect(screen.getByRole('heading', { level: 1, name: 'Añadir Ingreso' })).toBeInTheDocument()
    expect(AgregarIngresoSimulado).not.toHaveBeenCalled()
  })

  it('test_error_carga_cuenta_sin_detalle_tecnico_flujo: si ObtenerCuenta es rechazado, la sección Cuenta muestra "No se pudo cargar su cuenta. Vuelva a intentarlo." con "Aceptar" y sin el error técnico (AC-33)', async () => {
    ObtenerCuentaSimulado.mockRejectedValue(new Error(ERROR_TECNICO_CARGA))

    const { container } = RenderizarApp()

    const dialogo = await screen.findByRole('alertdialog')
    expect(dialogo.textContent).toBe(`${MENSAJE_ERROR_CARGA_CUENTA}Aceptar`)
    expect(within(dialogo).getByRole('button', { name: 'Aceptar' })).toBeEnabled()
    expect(container.textContent).not.toContain(ERROR_TECNICO_CARGA)
    expect(container.textContent).not.toContain('ECONNREFUSED')
  })
})
