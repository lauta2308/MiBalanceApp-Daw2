import { useEffect, useState } from 'react'
import { AsegurarSesion, MENSAJE_ERROR_SESION } from '../autenticacion/sesion.js'
import MensajeError from './MensajeError.jsx'

const ESTADO_CARGANDO = 'cargando'
const ESTADO_CON_SESION = 'con-sesion'
const ESTADO_CON_ERROR = 'con-error'

async function ObtenerEstadoSesion() {
  try {
    await AsegurarSesion()
    return ESTADO_CON_SESION
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error(error)
    }
    return ESTADO_CON_ERROR
  }
}

export default function GuardiaSesion({ children }) {
  const [estado, EstablecerEstado] = useState(ESTADO_CARGANDO)
  const [reintentando, EstablecerReintentando] = useState(false)

  useEffect(() => {
    let activo = true

    ObtenerEstadoSesion().then((estadoObtenido) => {
      if (activo) {
        EstablecerEstado(estadoObtenido)
      }
    })

    return () => {
      activo = false
    }
  }, [])

  async function ManejarAceptar() {
    EstablecerReintentando(true)
    EstablecerEstado(await ObtenerEstadoSesion())
    EstablecerReintentando(false)
  }

  if (estado === ESTADO_CARGANDO) {
    return <p>Cargando…</p>
  }

  if (estado === ESTADO_CON_ERROR) {
    return (
      <MensajeError
        mensaje={MENSAJE_ERROR_SESION}
        alAceptar={ManejarAceptar}
        deshabilitado={reintentando}
      />
    )
  }

  return children
}
