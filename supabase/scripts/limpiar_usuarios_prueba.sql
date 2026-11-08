-- Borra los usuarios anónimos creados por las pruebas de integración.
-- Cuentas, categorías y movimientos se borran por "on delete cascade".
-- Se ejecuta a mano desde el SQL Editor del panel de Supabase.

delete from auth.users
where is_anonymous = true
  and raw_user_meta_data->>'es_prueba' = 'true'
returning id;
