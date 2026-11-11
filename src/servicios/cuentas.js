import { clienteSupabase } from './clienteSupabase.js'

// El saldo se pide como texto: leerlo como número de JSON perdería precisión (RNF-04).
// No se filtra por usuario: RLS devuelve solo la cuenta del propietario del JWT.
export async function ObtenerCuenta() {
  const { data: cuenta, error } = await clienteSupabase
    .from('bat_cuentas')
    .select('id, nombre, moneda, saldo::text')
    .single()

  if (error) {
    throw error
  }

  return cuenta
}
