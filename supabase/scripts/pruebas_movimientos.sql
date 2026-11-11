-- FEAT-001b: pruebas manuales del alta de movimientos (ADR-003).
--
-- ATENCIÓN: ejecutar SOLO en el proyecto de desarrollo, nunca en producción.
-- Se ejecuta a mano, entero, desde el SQL Editor del panel de Supabase (como postgres).
-- Todo corre entre "begin" y "rollback": no deja usuarios, cuentas, movimientos ni el trigger temporal.
-- Cada caso imprime PASÓ o FALLÓ con "raise notice" y además lo guarda en la tabla temporal
-- resultados_pruebas, que se muestra al final como grilla de resultados (el SQL Editor puede
-- no mostrar los "notice"). Los insert en esa tabla se hacen siempre como postgres.
--
-- Casos:
--   (a) AC-31: si el alta falla después de escribir el movimiento y antes de actualizar el saldo,
--       no queda el movimiento y el saldo no cambia.
--   (b) Borrar un usuario con movimientos borra su cuenta, sus categorías y sus movimientos.
--   (c) Borrar una categoría en uso se rechaza con foreign_key_violation.
--
-- Requiere aplicada la migración 20261111000001_agregar_movimiento.sql.

begin;

-- Resultados de cada caso, creada como postgres; desaparece con la transacción.

create temp table resultados_pruebas (
  caso text not null,
  resultado text not null,
  detalle text
) on commit drop;

-- Usuarios de prueba: el trigger BATR_CREAR_CUENTA_USUARIO les crea la cuenta y las categorías.

select set_config('pruebas.id_usuario_uno', gen_random_uuid()::text, true);
select set_config('pruebas.id_usuario_dos', gen_random_uuid()::text, true);

insert into auth.users (id, instance_id, aud, role, raw_user_meta_data, raw_app_meta_data, is_anonymous, created_at, updated_at)
values
  (current_setting('pruebas.id_usuario_uno')::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   '{"es_prueba": true}', '{}', true, now(), now()),
  (current_setting('pruebas.id_usuario_dos')::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   '{"es_prueba": true}', '{}', true, now(), now());

-- (a) AC-31: falla después del insert y antes del update del saldo.
-- El trigger temporal se crea como postgres, antes de cambiar de rol.

create function public.BATF_PRUEBA_FALLA_SALDO()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Falla simulada al actualizar el saldo';
end;
$$;

create trigger BATR_PRUEBA_FALLA_SALDO
  before update on public.BAT_CUENTAS
  for each row
  execute function public.BATF_PRUEBA_FALLA_SALDO();

do $$
declare
  v_id_usuario uuid := current_setting('pruebas.id_usuario_uno')::uuid;
  v_id_cuenta uuid;
  v_id_categoria uuid;
  v_llamada_fallo boolean := false;
  v_mensaje_error text;
  v_detalle text;
  v_cantidad_movimientos integer;
  v_saldo numeric;
begin
  select c.id, cat.id into v_id_cuenta, v_id_categoria
  from public.BAT_CUENTAS c
  join public.BAT_CATEGORIAS cat on cat.id_cuenta = c.id
  where c.id_usuario = v_id_usuario
    and cat.tipo = 'INGRESO'
    and cat.es_defecto;

  begin
    set local role authenticated;
    perform set_config(
      'request.jwt.claims',
      json_build_object('sub', v_id_usuario, 'role', 'authenticated')::text,
      true
    );
    perform public.BASP_AGREGAR_MOVIMIENTO('INGRESO', 1000, current_date, v_id_categoria);
  exception
    when others then
      v_llamada_fallo := true;
      v_mensaje_error := sqlerrm;
  end;

  reset role;

  select count(*) into v_cantidad_movimientos
  from public.BAT_MOVIMIENTOS
  where id_cuenta = v_id_cuenta;

  select saldo into v_saldo
  from public.BAT_CUENTAS
  where id = v_id_cuenta;

  -- El mensaje confirma que la falla vino del trigger, es decir, después del insert y en el update.
  if v_llamada_fallo
    and v_mensaje_error = 'Falla simulada al actualizar el saldo'
    and v_cantidad_movimientos = 0
    and v_saldo = 0 then
    raise notice '(a) AC-31: PASÓ';
    insert into resultados_pruebas values ('(a) AC-31', 'PASÓ', null);
  else
    v_detalle := format('la llamada falló: %s, error: %s, movimientos: %s, saldo: %s',
      v_llamada_fallo, v_mensaje_error, v_cantidad_movimientos, v_saldo);
    raise notice '(a) AC-31: FALLÓ (%)', v_detalle;
    insert into resultados_pruebas values ('(a) AC-31', 'FALLÓ', v_detalle);
  end if;
exception
  when others then
    -- La excepción revierte el "set local role"; se repite por las dudas antes de escribir.
    reset role;
    raise notice '(a) AC-31: FALLÓ (error inesperado: %)', sqlerrm;
    insert into resultados_pruebas values ('(a) AC-31', 'FALLÓ', 'error inesperado: ' || sqlerrm);
end;
$$;

reset role;

drop trigger BATR_PRUEBA_FALLA_SALDO on public.BAT_CUENTAS;
drop function public.BATF_PRUEBA_FALLA_SALDO();

-- (b) Borrar un usuario con movimientos.

do $$
declare
  v_id_usuario uuid := current_setting('pruebas.id_usuario_uno')::uuid;
  v_id_cuenta uuid;
  v_id_categoria uuid;
  v_cantidad_movimientos integer;
  v_cantidad_restante integer;
  v_detalle text;
begin
  select c.id, cat.id into v_id_cuenta, v_id_categoria
  from public.BAT_CUENTAS c
  join public.BAT_CATEGORIAS cat on cat.id_cuenta = c.id
  where c.id_usuario = v_id_usuario
    and cat.tipo = 'INGRESO'
    and cat.es_defecto;

  set local role authenticated;
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_id_usuario, 'role', 'authenticated')::text,
    true
  );
  perform public.BASP_AGREGAR_MOVIMIENTO('INGRESO', 500, current_date, v_id_categoria);
  reset role;

  select count(*) into v_cantidad_movimientos
  from public.BAT_MOVIMIENTOS
  where id_cuenta = v_id_cuenta;

  set constraints all immediate;

  delete from auth.users where id = v_id_usuario;

  select
    (select count(*) from public.BAT_CUENTAS where id = v_id_cuenta or id_usuario = v_id_usuario)
    + (select count(*) from public.BAT_CATEGORIAS where id_cuenta = v_id_cuenta)
    + (select count(*) from public.BAT_MOVIMIENTOS where id_cuenta = v_id_cuenta)
  into v_cantidad_restante;

  if v_cantidad_movimientos = 1 and v_cantidad_restante = 0 then
    raise notice '(b) Borrar un usuario con movimientos: PASÓ';
    insert into resultados_pruebas values ('(b) Borrar un usuario con movimientos', 'PASÓ', null);
  else
    v_detalle := format('movimientos antes: %s, filas restantes: %s', v_cantidad_movimientos, v_cantidad_restante);
    raise notice '(b) Borrar un usuario con movimientos: FALLÓ (%)', v_detalle;
    insert into resultados_pruebas values ('(b) Borrar un usuario con movimientos', 'FALLÓ', v_detalle);
  end if;
exception
  when others then
    -- La excepción revierte el "set local role"; se repite por las dudas antes de escribir.
    reset role;
    raise notice '(b) Borrar un usuario con movimientos: FALLÓ (error inesperado: %)', sqlerrm;
    insert into resultados_pruebas
    values ('(b) Borrar un usuario con movimientos', 'FALLÓ', 'error inesperado: ' || sqlerrm);
end;
$$;

reset role;

-- (c) Borrar una categoría en uso.

do $$
declare
  v_id_usuario uuid := current_setting('pruebas.id_usuario_dos')::uuid;
  v_id_categoria uuid;
begin
  select cat.id into v_id_categoria
  from public.BAT_CUENTAS c
  join public.BAT_CATEGORIAS cat on cat.id_cuenta = c.id
  where c.id_usuario = v_id_usuario
    and cat.tipo = 'INGRESO'
    and cat.es_defecto;

  set local role authenticated;
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_id_usuario, 'role', 'authenticated')::text,
    true
  );
  perform public.BASP_AGREGAR_MOVIMIENTO('INGRESO', 300, current_date, v_id_categoria);
  reset role;

  set constraints all immediate;

  begin
    delete from public.BAT_CATEGORIAS where id = v_id_categoria;
    raise notice '(c) Borrar una categoría en uso: FALLÓ (el borrado no se rechazó)';
    insert into resultados_pruebas
    values ('(c) Borrar una categoría en uso', 'FALLÓ', 'el borrado no se rechazó');
  exception
    when foreign_key_violation then
      raise notice '(c) Borrar una categoría en uso: PASÓ';
      insert into resultados_pruebas values ('(c) Borrar una categoría en uso', 'PASÓ', null);
  end;
exception
  when others then
    -- La excepción revierte el "set local role"; se repite por las dudas antes de escribir.
    reset role;
    raise notice '(c) Borrar una categoría en uso: FALLÓ (error inesperado: %)', sqlerrm;
    insert into resultados_pruebas
    values ('(c) Borrar una categoría en uso', 'FALLÓ', 'error inesperado: ' || sqlerrm);
end;
$$;

reset role;

-- Resultado de los tres casos como grilla del SQL Editor.

select caso, resultado, detalle from resultados_pruebas order by caso;

rollback;
