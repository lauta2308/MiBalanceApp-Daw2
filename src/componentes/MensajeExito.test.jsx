import { StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import MensajeExito from './MensajeExito.jsx'

const MENSAJE = 'Ingreso registrado con éxito.'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('MensajeExito', () => {
  it('test_mensaje_exito_rol_estado_sin_boton: muestra el texto con role="status" y sin botones', () => {
    render(<MensajeExito mensaje={MENSAJE} alCerrar={vi.fn()} />)

    expect(screen.getByRole('status')).toHaveTextContent(MENSAJE)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('test_mensaje_exito_llama_al_cerrar_a_los_3000_ms: no llama a alCerrar a los 2999 ms y sí a los 3000 ms, una sola vez', () => {
    const alCerrar = vi.fn()
    render(<MensajeExito mensaje={MENSAJE} alCerrar={alCerrar} />)

    act(() => {
      vi.advanceTimersByTime(2999)
    })
    expect(alCerrar).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(alCerrar).toHaveBeenCalledTimes(1)

    act(() => {
      vi.advanceTimersByTime(10000)
    })
    expect(alCerrar).toHaveBeenCalledTimes(1)
  })

  it('test_mensaje_exito_cancela_temporizador_al_desmontar: desmontado antes de los 3000 ms no llama a alCerrar', () => {
    const alCerrar = vi.fn()
    const { unmount } = render(<MensajeExito mensaje={MENSAJE} alCerrar={alCerrar} />)

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    unmount()
    act(() => {
      vi.advanceTimersByTime(5000)
    })

    expect(alCerrar).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('test_mensaje_exito_rerender_no_reinicia_temporizador: un nuevo alCerrar a los 2000 ms no reinicia la cuenta y se llama el último', () => {
    const alCerrarInicial = vi.fn()
    const alCerrarNuevo = vi.fn()
    const { rerender } = render(<MensajeExito mensaje={MENSAJE} alCerrar={alCerrarInicial} />)

    act(() => {
      vi.advanceTimersByTime(2000)
    })
    rerender(<MensajeExito mensaje={MENSAJE} alCerrar={alCerrarNuevo} />)
    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(alCerrarInicial).not.toHaveBeenCalled()
    expect(alCerrarNuevo).toHaveBeenCalledTimes(1)
  })

  it('test_mensaje_exito_region_vacia_sin_temporizador: sin mensaje renderiza la región role="status" vacía y no programa ningún cierre', () => {
    const alCerrar = vi.fn()
    render(<MensajeExito mensaje={null} alCerrar={alCerrar} />)

    expect(screen.getByRole('status')).toBeEmptyDOMElement()
    expect(vi.getTimerCount()).toBe(0)

    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(alCerrar).not.toHaveBeenCalled()
  })

  it('test_mensaje_exito_misma_region_al_llegar_texto: al recibir el mensaje cambia solo el texto de la misma región y desde ahí corren los 3000 ms', () => {
    const alCerrar = vi.fn()
    const { rerender } = render(<MensajeExito mensaje={null} alCerrar={alCerrar} />)
    const region = screen.getByRole('status')

    act(() => {
      vi.advanceTimersByTime(5000)
    })
    rerender(<MensajeExito mensaje={MENSAJE} alCerrar={alCerrar} />)

    expect(screen.getByRole('status')).toBe(region)
    expect(region).toHaveTextContent(MENSAJE)

    act(() => {
      vi.advanceTimersByTime(2999)
    })
    expect(alCerrar).not.toHaveBeenCalled()
    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(alCerrar).toHaveBeenCalledTimes(1)
  })

  it('test_mensaje_exito_modo_estricto_un_solo_cierre: en modo estricto llama a alCerrar una sola vez a los 3000 ms', () => {
    const alCerrar = vi.fn()
    render(
      <StrictMode>
        <MensajeExito mensaje={MENSAJE} alCerrar={alCerrar} />
      </StrictMode>,
    )

    act(() => {
      vi.advanceTimersByTime(3000)
    })

    expect(alCerrar).toHaveBeenCalledTimes(1)
  })
})
