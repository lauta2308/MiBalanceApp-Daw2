import { clienteSupabase } from './clienteSupabase.js'

// La categoría por defecto ("Pago Ingresado") va primero. RLS devuelve solo las de la cuenta del usuario.
export async function ObtenerCategoriasIngreso() {
  const { data: categorias, error } = await clienteSupabase
    .from('bat_categorias')
    .select('id, nombre, es_defecto')
    .eq('tipo', 'INGRESO')
    .order('es_defecto', { ascending: false })
    .order('nombre')

  if (error) {
    throw error
  }

  return categorias
}
