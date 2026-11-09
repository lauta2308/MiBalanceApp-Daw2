-- FEAT-001a: esquema inicial, alta automática de la cuenta y aislamiento por usuario (ADR-001).

-- Tablas

create table public.BAT_CUENTAS (
  id uuid not null default gen_random_uuid(),
  id_usuario uuid not null,
  nombre varchar(30) not null,
  moneda char(3) not null default 'USD',
  saldo numeric not null default 0,
  fecha_alta timestamptz not null default now(),
  constraint BAPK_CUENTAS primary key (id),
  constraint BAFK_CUENTAS_USUARIO foreign key (id_usuario) references auth.users (id) on delete cascade,
  constraint BAUQ_CUENTAS_USUARIO unique (id_usuario),
  constraint BACK_CUENTAS_MONEDA_FORMATO check (moneda ~ '^[A-Z]{3}$'),
  constraint BACK_CUENTAS_SALDO_DOS_DECIMALES check (saldo = round(saldo, 2))
);

create table public.BAT_CATEGORIAS (
  id uuid not null default gen_random_uuid(),
  id_cuenta uuid not null,
  nombre varchar(30) not null,
  tipo text not null,
  es_defecto boolean not null default false,
  fecha_alta timestamptz not null default now(),
  constraint BAPK_CATEGORIAS primary key (id),
  constraint BAFK_CATEGORIAS_CUENTA foreign key (id_cuenta) references public.BAT_CUENTAS (id) on delete cascade,
  constraint BACK_CATEGORIAS_TIPO check (tipo in ('INGRESO', 'GASTO'))
);

create table public.BAT_MOVIMIENTOS (
  id uuid not null default gen_random_uuid(),
  id_cuenta uuid not null,
  id_categoria uuid not null,
  tipo text not null,
  monto numeric(14, 2) not null,
  fecha date not null,
  fecha_alta timestamptz not null default now(),
  constraint BAPK_MOVIMIENTOS primary key (id),
  constraint BAFK_MOVIMIENTOS_CUENTA foreign key (id_cuenta) references public.BAT_CUENTAS (id) on delete cascade,
  constraint BAFK_MOVIMIENTOS_CATEGORIA foreign key (id_categoria) references public.BAT_CATEGORIAS (id) on delete no action deferrable initially deferred,
  constraint BACK_MOVIMIENTOS_TIPO check (tipo in ('INGRESO', 'GASTO')),
  constraint BACK_MOVIMIENTOS_MONTO_POSITIVO check (monto > 0)
);

-- Índices

create index BAIX_CATEGORIAS_CUENTA on public.BAT_CATEGORIAS (id_cuenta);

create unique index BAUQ_CATEGORIAS_DEFECTO_CUENTA_TIPO on public.BAT_CATEGORIAS (id_cuenta, tipo) where es_defecto;

create index BAIX_MOVIMIENTOS_CUENTA_FECHA on public.BAT_MOVIMIENTOS (id_cuenta, fecha desc, fecha_alta desc);

create index BAIX_MOVIMIENTOS_CATEGORIA on public.BAT_MOVIMIENTOS (id_categoria);

-- Seguridad a nivel de fila: solo lectura del propietario, sin políticas de escritura

alter table public.BAT_CUENTAS enable row level security;
alter table public.BAT_CATEGORIAS enable row level security;
alter table public.BAT_MOVIMIENTOS enable row level security;

create policy BAPOL_CUENTAS_PROPIETARIO on public.BAT_CUENTAS
  for select
  to authenticated
  using (id_usuario = (select auth.uid()));

create policy BAPOL_CATEGORIAS_PROPIETARIO on public.BAT_CATEGORIAS
  for select
  to authenticated
  using (id_cuenta in (select id from public.BAT_CUENTAS where id_usuario = (select auth.uid())));

create policy BAPOL_MOVIMIENTOS_PROPIETARIO on public.BAT_MOVIMIENTOS
  for select
  to authenticated
  using (id_cuenta in (select id from public.BAT_CUENTAS where id_usuario = (select auth.uid())));

-- Permisos

revoke all on public.BAT_CUENTAS, public.BAT_CATEGORIAS, public.BAT_MOVIMIENTOS from anon, authenticated;

grant select on public.BAT_CUENTAS, public.BAT_CATEGORIAS, public.BAT_MOVIMIENTOS to authenticated;

-- Alta automática de la cuenta y de sus categorías por defecto

create function public.BATF_CREAR_CUENTA_USUARIO()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id_cuenta uuid;
begin
  insert into public.BAT_CUENTAS (id_usuario, nombre, moneda, saldo)
  values (new.id, 'Mi Cuenta', 'USD', 0)
  returning id into v_id_cuenta;

  insert into public.BAT_CATEGORIAS (id_cuenta, nombre, tipo, es_defecto)
  values
    (v_id_cuenta, 'Pago Realizado', 'GASTO', true),
    (v_id_cuenta, 'Pago Ingresado', 'INGRESO', true);

  return new;
end;
$$;

revoke execute on function public.BATF_CREAR_CUENTA_USUARIO() from public, anon, authenticated;

create trigger BATR_CREAR_CUENTA_USUARIO
  after insert on auth.users
  for each row
  execute function public.BATF_CREAR_CUENTA_USUARIO();

-- Rollback: es la primera migración y no hay datos reales (solo usuarios anónimos de prueba).
-- Para revertirla, ejecutar:
--   drop trigger BATR_CREAR_CUENTA_USUARIO on auth.users;
--   drop function public.BATF_CREAR_CUENTA_USUARIO();
--   drop table public.BAT_MOVIMIENTOS, public.BAT_CATEGORIAS, public.BAT_CUENTAS;
-- y borrar los usuarios anónimos con supabase/scripts/limpiar_usuarios_prueba.sql.
