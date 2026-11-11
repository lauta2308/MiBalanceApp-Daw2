-- FEAT-001b: alta atómica de un ingreso (ADR-001, ADR-003).
-- El movimiento y el saldo se escriben en una sola función: si algo falla, PostgreSQL revierte todo.
-- La cuenta sale de auth.uid(); no existe un parámetro para elegir otra cuenta.

create function public.BASP_AGREGAR_MOVIMIENTO(
  p_tipo text,
  p_monto numeric,
  p_fecha date,
  p_id_categoria uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id_usuario uuid;
  v_id_cuenta uuid;
  v_id_movimiento uuid;
begin
  -- 1. Sesión
  v_id_usuario := auth.uid();

  if v_id_usuario is null then
    raise exception 'Operación no permitida.' using errcode = '42501';
  end if;

  -- 2. Parámetros: por ahora solo ingresos; monto positivo con a lo sumo dos decimales, sin redondear
  if p_tipo is null or p_tipo <> 'INGRESO'
    or p_monto is null or p_monto <= 0 or p_monto <> round(p_monto, 2)
    or p_fecha is null
    or p_id_categoria is null then
    raise exception 'Datos del movimiento inválidos.' using errcode = '22023';
  end if;

  -- 3. Cuenta del llamador, bloqueada hasta el final de la transacción
  select id into v_id_cuenta
  from public.BAT_CUENTAS
  where id_usuario = v_id_usuario
  for update;

  -- 4. La categoría es de la misma cuenta y del mismo tipo (sin revelar si existe).
  --    Si el usuario no tuviera cuenta, v_id_cuenta es nulo y la comprobación también rechaza.
  if not exists (
    select 1
    from public.BAT_CATEGORIAS
    where id = p_id_categoria
      and id_cuenta = v_id_cuenta
      and tipo = p_tipo
  ) then
    raise exception 'Operación no permitida.' using errcode = '42501';
  end if;

  -- 5. Movimiento (antes del saldo a propósito: ver caso a de pruebas_movimientos.sql)
  insert into public.BAT_MOVIMIENTOS (id_cuenta, id_categoria, tipo, monto, fecha)
  values (v_id_cuenta, p_id_categoria, p_tipo, p_monto, p_fecha)
  returning id into v_id_movimiento;

  -- 6. Saldo
  update public.BAT_CUENTAS
  set saldo = saldo + p_monto
  where id = v_id_cuenta;

  -- 7. Resultado
  return v_id_movimiento;
end;
$$;

-- Permisos: solo usuarios con sesión

revoke execute on function public.BASP_AGREGAR_MOVIMIENTO(text, numeric, date, uuid) from public, anon;

grant execute on function public.BASP_AGREGAR_MOVIMIENTO(text, numeric, date, uuid) to authenticated;

-- Rollback: no crea tablas ni cambia datos existentes. Para revertirla, ejecutar:
--   drop function public.BASP_AGREGAR_MOVIMIENTO(text, numeric, date, uuid);
