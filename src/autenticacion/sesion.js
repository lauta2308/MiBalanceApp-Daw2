import { IniciarSesionProvisoria, ObtenerSesionActual } from './sesionProvisoria.js'

export { MENSAJE_ERROR_SESION } from './sesionProvisoria.js'

let promesaSesion = null

async function ResolverSesion() {
  const sesionActual = await ObtenerSesionActual()

  return sesionActual ?? IniciarSesionProvisoria()
}

export function AsegurarSesion() {
  if (!promesaSesion) {
    promesaSesion = ResolverSesion().finally(() => {
      promesaSesion = null
    })
  }

  return promesaSesion
}
