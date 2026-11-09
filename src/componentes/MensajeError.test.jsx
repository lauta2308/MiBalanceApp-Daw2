import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import MensajeError from './MensajeError.jsx'

const MENSAJE = 'No se pudo iniciar la sesión. Vuelva a intentarlo.'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('MensajeError', () => {
  it('AC-04: sigue visible a los 10 segundos y solo llama a alAceptar al presionar "Aceptar"', () => {
    vi.useFakeTimers()
    const alAceptar = vi.fn()
    render(<MensajeError mensaje={MENSAJE} alAceptar={alAceptar} />)

    act(() => {
      vi.advanceTimersByTime(10000)
    })

    expect(screen.getByRole('alertdialog')).toHaveTextContent(MENSAJE)
    expect(alAceptar).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Aceptar' }))

    expect(alAceptar).toHaveBeenCalledTimes(1)
  })

  it('es un diálogo de alerta modal con nombre accesible', () => {
    render(<MensajeError mensaje={MENSAJE} alAceptar={vi.fn()} />)

    const dialogo = screen.getByRole('alertdialog', { name: MENSAJE })

    expect(dialogo).toHaveAttribute('aria-modal', 'true')
  })

  it('con deshabilitado no permite presionar "Aceptar"', () => {
    const alAceptar = vi.fn()
    render(<MensajeError mensaje={MENSAJE} alAceptar={alAceptar} deshabilitado />)

    const boton = screen.getByRole('button', { name: 'Aceptar' })
    fireEvent.click(boton)

    expect(boton).toBeDisabled()
    expect(alAceptar).not.toHaveBeenCalled()
  })

  it('muestra el mensaje como texto, sin interpretar HTML', () => {
    render(<MensajeError mensaje="<img src=x>" alAceptar={vi.fn()} />)

    expect(screen.getByRole('alertdialog')).toHaveTextContent('<img src=x>')
    expect(screen.getByRole('alertdialog').querySelector('img')).toBeNull()
  })
})
