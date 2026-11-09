import { clienteSupabase } from '../servicios/clienteSupabase.js'

export const MENSAJE_ERROR_SESION = 'No se pudo iniciar la sesión. Vuelva a intentarlo.'

export async function ObtenerSesionActual() {
  const { data, error } = await clienteSupabase.auth.getSession()

  if (error) {
    throw error
  }

  return data.session
}

export async function IniciarSesionProvisoria() {
  const { data, error } = await clienteSupabase.auth.signInAnonymously()

  if (error) {
    throw error
  }

  if (!data.session) {
    throw new Error('La respuesta no trae una sesión')
  }

  return data.session
}
