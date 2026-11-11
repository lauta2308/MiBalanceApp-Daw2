import { clienteSupabase } from './clienteSupabase.js'

// El monto viaja como texto para no perder precisión (RNF-04). La cuenta la toma la función SQL de auth.uid().
export async function AgregarIngreso({ montoTexto, fecha, idCategoria }) {
  const { error } = await clienteSupabase.rpc('basp_agregar_movimiento', {
    p_tipo: 'INGRESO',
    p_monto: montoTexto,
    p_fecha: fecha,
    p_id_categoria: idCategoria,
  })

  if (error) {
    throw error
  }
}

// El monto se pide como texto. No se filtra por usuario: RLS devuelve solo los movimientos del propietario del JWT.
export async function ObtenerMovimientos() {
  const { data: movimientos, error } = await clienteSupabase
    .from('bat_movimientos')
    .select('id, tipo, monto::text, fecha, bat_categorias(nombre)')
    .order('fecha', { ascending: false })
    .order('fecha_alta', { ascending: false })

  if (error) {
    throw error
  }

  return movimientos.map(({ id, tipo, monto, fecha, bat_categorias: categoria }) => ({
    id,
    tipo,
    monto,
    fecha,
    nombreCategoria: categoria.nombre,
  }))
}
