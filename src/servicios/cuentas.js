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

export async function ContarMovimientos() {
  const { count: cantidad, error } = await clienteSupabase
    .from('bat_movimientos')
    .select('id', { count: 'exact', head: true })

  if (error) {
    throw error
  }

  // Un 404 sin cuerpo a un pedido HEAD llega sin error y sin conteo.
  if (typeof cantidad !== 'number') {
    throw new Error('No se obtuvo el conteo de movimientos')
  }

  return cantidad
}
