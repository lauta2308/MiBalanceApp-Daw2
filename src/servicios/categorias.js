import { clienteSupabase } from './clienteSupabase.js'
import { OrdenarCategorias } from '../utilidades/ordenCategorias.js'

// RLS devuelve solo las de la cuenta del usuario. El orden se aplica en el cliente (ADR-004):
// la categoría por defecto ("Pago Ingresado") primero y el resto sin distinguir mayúsculas ni tildes.
export async function ObtenerCategoriasIngreso() {
  const { data: categorias, error } = await clienteSupabase
    .from('bat_categorias')
    .select('id, nombre, es_defecto')
    .eq('tipo', 'INGRESO')

  if (error) {
    throw error
  }

  return OrdenarCategorias(categorias)
}
