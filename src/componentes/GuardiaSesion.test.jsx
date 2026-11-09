import { StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const { ObtenerSesionActualSimulado, IniciarSesionProvisoriaSimulado } = vi.hoisted(() => ({
  ObtenerSesionActualSimulado: vi.fn(),
  IniciarSesionProvisoriaSimulado: vi.fn(),
}))

vi.mock('../servicios/clienteSupabase.js', () => ({ clienteSupabase: {} }))
vi.mock('../autenticacion/sesionProvisoria.js', async (importarOriginal) => ({
  ...(await importarOriginal()),
  ObtenerSesionActual: ObtenerSesionActualSimulado,
  IniciarSesionProvisoria: IniciarSesionProvisoriaSimulado,
}))

const MENSAJE = 'No se pudo iniciar la sesión. Vuelva a intentarlo.'
const ERROR_TECNICO = 'AuthApiError: anonymous_provider_disabled'
const SESION = { access_token: 'token', user: { id: 'usuario' } }
const CONTENIDO = 'Contenido protegido'

function CrearPromesaControlada() {
  let resolver
  let rechazar
  const promesa = new Promise((alResolver, alRechazar) => {
    resolver = alResolver
    rechazar = alRechazar
  })
  return { promesa, resolver, rechazar }
}

// sesion.js guarda la promesa a nivel de módulo: cada prueba importa una copia nueva.
async function RenderizarGuardia() {
  const { default: GuardiaSesion } = await import('./GuardiaSesion.jsx')

  return render(
    <StrictMode>
      <GuardiaSesion>
        <p>{CONTENIDO}</p>
      </GuardiaSesion>
    </StrictMode>,
  )
}

function ObtenerBotonAceptar() {
  return screen.getByRole('button', { name: 'Aceptar' })
}

beforeEach(() => {
  vi.resetModules()
  ObtenerSesionActualSimulado.mockReset()
  IniciarSesionProvisoriaSimulado.mockReset()
  ObtenerSesionActualSimulado.mockResolvedValue(null)
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

describe('GuardiaSesion', () => {
  it('muestra "Cargando…" mientras espera y luego los children', async () => {
    const inicio = CrearPromesaControlada()
    IniciarSesionProvisoriaSimulado.mockReturnValue(inicio.promesa)

    await RenderizarGuardia()

    expect(await screen.findByText('Cargando…')).toBeInTheDocument()
    expect(screen.queryByText(CONTENIDO)).not.toBeInTheDocument()

    inicio.resolver(SESION)

    expect(await screen.findByText(CONTENIDO)).toBeInTheDocument()
    expect(screen.queryByText('Cargando…')).not.toBeInTheDocument()
  })

  it('AC-03: con sesión existente muestra los children sin iniciar otra', async () => {
    ObtenerSesionActualSimulado.mockResolvedValue(SESION)

    await RenderizarGuardia()

    expect(await screen.findByText(CONTENIDO)).toBeInTheDocument()
    expect(IniciarSesionProvisoriaSimulado).not.toHaveBeenCalled()
  })

  it('en modo estricto inicia una sola sesión', async () => {
    IniciarSesionProvisoriaSimulado.mockResolvedValue(SESION)

    await RenderizarGuardia()

    expect(await screen.findByText(CONTENIDO)).toBeInTheDocument()
    expect(IniciarSesionProvisoriaSimulado).toHaveBeenCalledTimes(1)
  })

  it('AC-04: si se rechaza el inicio muestra exactamente el mensaje con "Aceptar" y sin el error técnico', async () => {
    IniciarSesionProvisoriaSimulado.mockRejectedValue(new Error(ERROR_TECNICO))

    const { container } = await RenderizarGuardia()

    expect(await screen.findByRole('alertdialog')).toBeInTheDocument()
    expect(ObtenerBotonAceptar()).toBeEnabled()
    expect(container.textContent).toBe(`${MENSAJE}Aceptar`)
    expect(container.innerHTML).not.toContain(ERROR_TECNICO)
    expect(screen.queryByText(CONTENIDO)).not.toBeInTheDocument()
  })

  it('AC-04: "Aceptar" se deshabilita mientras reintenta y si el reintento falla vuelve el mensaje habilitado', async () => {
    const usuario = userEvent.setup()
    const reintento = CrearPromesaControlada()
    IniciarSesionProvisoriaSimulado.mockRejectedValueOnce(new Error(ERROR_TECNICO))
    IniciarSesionProvisoriaSimulado.mockReturnValueOnce(reintento.promesa)

    const { container } = await RenderizarGuardia()
    await screen.findByRole('alertdialog')

    await usuario.click(ObtenerBotonAceptar())

    await waitFor(() => expect(ObtenerBotonAceptar()).toBeDisabled())
    expect(IniciarSesionProvisoriaSimulado).toHaveBeenCalledTimes(2)

    reintento.rechazar(new Error(ERROR_TECNICO))

    await waitFor(() => expect(ObtenerBotonAceptar()).toBeEnabled())
    expect(container.textContent).toBe(`${MENSAJE}Aceptar`)
    expect(screen.queryByText(CONTENIDO)).not.toBeInTheDocument()
  })

  it('AC-04: si el reintento funciona muestra los children', async () => {
    const usuario = userEvent.setup()
    IniciarSesionProvisoriaSimulado.mockRejectedValueOnce(new Error(ERROR_TECNICO))
    IniciarSesionProvisoriaSimulado.mockResolvedValueOnce(SESION)

    await RenderizarGuardia()
    await screen.findByRole('alertdialog')

    await usuario.click(ObtenerBotonAceptar())

    expect(await screen.findByText(CONTENIDO)).toBeInTheDocument()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('en desarrollo envía el detalle técnico a console.error', async () => {
    const errorTecnico = new Error(ERROR_TECNICO)
    IniciarSesionProvisoriaSimulado.mockRejectedValue(errorTecnico)

    await RenderizarGuardia()
    await screen.findByRole('alertdialog')

    expect(console.error).toHaveBeenCalledWith(errorTecnico)
  })

  it('fuera de desarrollo no envía el detalle técnico a console.error', async () => {
    vi.stubEnv('DEV', false)
    const errorTecnico = new Error(ERROR_TECNICO)
    IniciarSesionProvisoriaSimulado.mockRejectedValue(errorTecnico)

    await RenderizarGuardia()
    await screen.findByRole('alertdialog')

    expect(console.error).not.toHaveBeenCalledWith(errorTecnico)
  })
})
