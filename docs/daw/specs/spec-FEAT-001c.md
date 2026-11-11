# Spec FEAT-001c: Elegir categoría y fecha del ingreso

| Field | Value |
|-------|-------|
| Ticket | FEAT-001c |
| PRD | docs/daw/prd/prd-FEAT-001c.md |
| Tier | FEATURE |
| Date | 2026-11-11 |
| Spec loops | 0 |
| Loops since last human decision | 0 |

## Summary
FEAT-001b ya dejó un `select` con las categorías de ingreso, la fecha fija de hoy y la lista ordenada por fecha y alta. Este ticket cambia tres cosas:
- Mueve el orden de las categorías al cliente con un criterio único: la categoría por defecto primero y después orden alfabético sin mayúsculas ni tildes (ADR-004).
- Reemplaza el campo fijo de la fecha por un calendario de `react-day-picker`, con hoy preseleccionado, los días futuros deshabilitados y selectores de mes y año desde 1900.
- Prueba de punta a punta la elección de categoría y el orden de la lista.

No hay cambios de base de datos: `BASP_AGREGAR_MOVIMIENTO` ya acepta cualquier fecha no nula y valida la categoría.

## Coverage: PRD → blocks
| Requirement | Covered by |
|---|---|
| FR-01 | Block 1, Block 4 |
| FR-02 | Block 1 |
| FR-03 | Block 2 |
| FR-04 | Block 2 |
| FR-05 | Block 2, Block 3 |
| FR-06 | Block 2 |
| FR-07 | Block 2, Block 3 |
| FR-08 | Block 4 |
| NFR-01 | Strategy: la fecha es un día calendario de punta a punta. `ObtenerFechaHoy` y `ConvertirTextoAFecha` trabajan en hora local, nunca con `toISOString()` ni `new Date("AAAA-MM-DD")`. Se prueba con `TZ=America/Argentina/Buenos_Aires` a las 22:00 locales (01:00 UTC del día siguiente) (Block 3, AC-13) y con una fecha antigua contra la API real (Block 3, AC-14). |

| AC | Covered by |
|---|---|
| AC-05 | Block 4 |
| AC-10 | Block 1 |
| AC-11 | Block 1 |
| AC-12 | Block 2, Block 3 |
| AC-13 | Block 3 |
| AC-14 | Block 2, Block 3 |
| AC-23 | Block 4 |

## Dependencies between blocks
- Block 1 y Block 2 son independientes entre sí.
- Block 3 depende de Block 2: usa `SelectorFecha` en el formulario.
- Block 4 depende de Block 1 y Block 3: su prueba de flujo elige una categoría en el `select` ordenado y una fecha en el calendario del formulario.
- Orden de ejecución: 1 → 2 → 3 → 4.

## Block 1 — Orden de las categorías de ingreso

**Files**
- `src/utilidades/ordenCategorias.js` (new) — `OrdenarCategorias(categorias)`.
- `src/utilidades/ordenCategorias.test.js` (new).
- `src/servicios/categorias.js` (modified) — `ObtenerCategoriasIngreso` deja de ordenar en SQL y aplica `OrdenarCategorias`.
- `src/servicios/categorias.test.js` (modified) — la cadena simulada pasa a `from → select → eq`, sin `order`. Se rehacen `test_categorias_ingreso_por_defecto_primero` y `test_error_supabase_propagado`.
- `src/componentes/FormularioMovimiento.test.jsx` (modified) — prueba de AC-10 sobre el `select`.

**Logic**
Implementa FR-01 y FR-02 (ADR-004).

`OrdenarCategorias(categorias)` devuelve una copia nueva y no modifica la recibida:
- Primero va la categoría con `es_defecto === true`.
- Después vienen las demás, ordenadas por `nombre` con un solo `new Intl.Collator('es', { sensitivity: 'base' })`, que no distingue mayúsculas ni tildes.
- Con nombres iguales para el colador se mantiene el orden recibido (`Array.prototype.sort` es estable).

`ObtenerCategoriasIngreso` sigue con `select('id, nombre, es_defecto')` y `eq('tipo', 'INGRESO')`, sin `order`, y devuelve `OrdenarCategorias(categorias)`.

`FormularioMovimiento` no cambia en este bloque: el `select` sigue mostrando las opciones en el orden que entrega el servicio, preselecciona la de `es_defecto` y no tiene opción vacía.

**Data model**
- Reuses `BAT_CATEGORIAS` from FEAT-001a — no schema change; constraints as declared there: `id` uuid PK, `id_cuenta` NOT NULL con FK a `BAT_CUENTAS`, `nombre` NOT NULL, `tipo` NOT NULL con check `INGRESO`/`GASTO`, `es_defecto` NOT NULL default false, RLS `BAPOL_CATEGORIAS_PROPIETARIO` y solo `select` para `authenticated`.

**Input validation**
- Lista recibida de Supabase: solo filas de la cuenta del usuario (RLS) y de `tipo = 'INGRESO'` (filtro del servicio). Cada fila trae `id`, `nombre` (texto) y `es_defecto` (booleano).
- Los nombres se comparan y se muestran como texto, tal como los escribió el usuario.

**Error handling**
- Supabase devuelve un error al leer las categorías — `ObtenerCategoriasIngreso` lo propaga sin ordenar nada. El formulario muestra "No se pudo cargar el formulario. Vuelva a intentarlo." (FEAT-001b).

**Required tests**
- [ ] `test_ordenar_categorias_por_defecto_primero` — "Pago Ingresado" queda primera aunque llegue última — validates AC-11
- [ ] `test_ordenar_categorias_sin_mayusculas_ni_tildes` — con "Ventas", "alquiler", "Ómnibus" y "Pago Ingresado" el orden es "Pago Ingresado", "alquiler", "Ómnibus", "Ventas" — validates AC-11
- [ ] `test_ordenar_categorias_no_modifica_original` — la lista recibida conserva su orden y se devuelve un arreglo nuevo
- [ ] `test_categorias_ingreso_por_defecto_primero` — el servicio filtra `eq('tipo', 'INGRESO')`, no llama a `order` y devuelve la lista desordenada de la API ya ordenada — validates AC-10, AC-11
- [ ] `test_error_supabase_propagado` — un error de Supabase en la lectura se propaga como error (sad path)
- [ ] `test_selector_solo_categorias_ingreso` — con "Pago Ingresado" y "Sueldo" el `select` muestra exactamente esas dos opciones, sin "Pago Realizado", "Mercado", opción vacía ni "sin categoría" — validates AC-10

**Completion criterion**
Las seis pruebas pasan, `npm run lint` no da hallazgos y `test_formulario_preselecciona_pago_ingresado` de FEAT-001b sigue en verde.

## Block 2 — Calendario para elegir la fecha

**Files**
- `package.json` / `package-lock.json` (modified) — agrega `react-day-picker` en su última versión estable (10.0.2); trae `date-fns` como dependencia propia.
- `src/main.jsx` (modified) — importa `react-day-picker/style.css` junto a `./estilos.css`.
- `src/utilidades/fechas.js` (modified) — nuevas `ConvertirTextoAFecha(fechaTexto)` y `ConvertirFechaATexto(fecha)`; `ObtenerFechaHoy` pasa a usar la segunda.
- `src/utilidades/fechas.test.js` (modified).
- `src/componentes/SelectorFecha.jsx` (new) — botón con la fecha y calendario.
- `src/componentes/SelectorFecha.test.jsx` (new).
- `src/estilos.css` (modified) — estilos de `selector-fecha`.

**Logic**
Implementa FR-03, FR-04, FR-06 y FR-07 en un componente aislado, y la conversión local de NFR-01.

`ConvertirTextoAFecha("AAAA-MM-DD")`:
- Valida el texto con la misma expresión que `FormatearFecha`.
- Devuelve `new Date(anio, mes - 1, dia)`, la medianoche local de ese día. Nunca usa `new Date("AAAA-MM-DD")`.
- Si el texto no tiene ese formato o no es un día real del calendario (por ejemplo `2026-02-30`), lanza un error.

`ConvertirFechaATexto(fecha)` (nueva) es la inversa: arma "AAAA-MM-DD" con `getFullYear()`, `getMonth() + 1` y `getDate()` en hora local. `ObtenerFechaHoy(fecha = new Date())` pasa a devolver `ConvertirFechaATexto(fecha)`, sin cambiar su firma ni su resultado.

`SelectorFecha({ fecha, alCambiar, idCampo, idEtiqueta })`:
- Muestra un botón con `id={idCampo}` y el texto `FormatearFecha(fecha)`.
- La etiqueta "Fecha" del formulario apunta a ese `id` con `htmlFor` y tiene `id={idEtiqueta}`.
- El botón lleva `aria-labelledby={`${idEtiqueta} ${idCampo}`}`, así el lector de pantalla anuncia "Fecha 06/11/2026" y no solo "Fecha" (RNF-08).
- El botón abre y cierra un `DayPicker` y tiene `aria-expanded`. El calendario se muestra debajo del botón, en la misma página.
- Configuración del `DayPicker`:
  - `mode="single"` y `required`: elegir de nuevo el día seleccionado no lo deselecciona (FR-04).
  - `selected={ConvertirTextoAFecha(fecha)}` y `defaultMonth` en ese mismo mes.
  - `disabled={{ after: hoy }}`, con `hoy` sacado de `ObtenerFechaHoy()` y convertido con `ConvertirTextoAFecha` (FR-06).
  - `captionLayout="dropdown"`, `startMonth={new Date(1900, 0)}` y `endMonth` en el mes actual.
  - `locale` en español, el `es` de `react-day-picker/locale`. Trae las etiquetas accesibles en español y en infinitivo ("Elegir el mes", "Ir al mes siguiente"), así que no chocan con el trato de usted.
  - `formatters` que ponen en mayúscula inicial los nombres de mes del encabezado y del selector de mes ("Noviembre 2026"). La regla de mayúsculas de AGENTS.md trata ese encabezado como un título.
- Al elegir un día llama a `alCambiar(ConvertirFechaATexto(diaElegido))` y cierra el calendario.
- No usa `dangerouslySetInnerHTML`.

Decisión del usuario (2026-11-11): enero de 1900 es un límite de la navegación del calendario, no una fecha mínima de la regla. FR-07 se cumple porque la API acepta cualquier fecha pasada.

**Input validation**
- `fecha` (prop): texto `AAAA-MM-DD` de un día real del calendario, que se valida con `ConvertirTextoAFecha`.
- Día elegido: entre enero de 1900 y hoy (fecha local del dispositivo). Los días posteriores a hoy se ven deshabilitados y no se pueden seleccionar.
- No existe un valor vacío: el calendario es `required`.

**Error handling**
- `ConvertirTextoAFecha` recibe un texto inválido o un día inexistente — lanza un error y nunca devuelve otra fecha. `SelectorFecha` lo llama durante el render, así que una `fecha` inválida rompería el render. La app no tiene un límite de errores, y se acepta así porque el único origen de `fecha` es `ObtenerFechaHoy` o `ConvertirFechaATexto`, que siempre producen un texto válido. Mostrar una fecha equivocada en silencio sería peor.
- El usuario intenta elegir un día posterior a hoy — el día está deshabilitado: el clic no cambia la fecha ni llama a `alCambiar`.

**Required tests**
- [ ] `test_convertir_texto_a_fecha_local` — "2026-11-06" da un `Date` con año 2026, mes 10 y día 6 en hora local, también con `TZ=America/Argentina/Buenos_Aires`
- [ ] `test_convertir_texto_a_fecha_invalido_rechazado` — "06/11/2026", "2026-02-30" y un valor que no es texto lanzan un error (sad path)
- [ ] `test_convertir_fecha_a_texto_local` — `new Date(1990, 2, 15, 23, 30)` da "1990-03-15" también con `TZ=America/Argentina/Buenos_Aires`, y `ObtenerFechaHoy` sigue dando lo mismo que en FEAT-001b (`test_fecha_hoy_local` en verde)
- [ ] `test_selector_fecha_nombre_accesible` — el botón tiene como nombre accesible "Fecha" seguido de la fecha "DD/MM/AAAA", y el encabezado del calendario muestra el mes con mayúscula inicial
- [ ] `test_selector_fecha_hoy_preseleccionado` — al abrir el calendario, el día de hoy está seleccionado y no hay control para vaciar la fecha; elegir de nuevo el mismo día no lo deselecciona — validates AC-12
- [ ] `test_dia_futuro_rechazado` — el día de mañana está deshabilitado y al hacer clic no se llama a `alCambiar` (sad path) — validates AC-12
- [ ] `test_selector_fecha_elige_dia_y_cierra` — elegir otro día pasado llama a `alCambiar` con su texto "AAAA-MM-DD" y cierra el calendario — validates AC-12
- [ ] `test_selector_fecha_navega_hasta_1900` — el selector de años ofrece 1900 y 1990, y no ofrece años posteriores al actual — validates AC-14

**Completion criterion**
Las ocho pruebas pasan y `npm run lint` no da hallazgos. `npm run build` termina sin errores. El calendario se maneja solo con teclado: Tab llega al botón, Enter lo abre y las flechas recorren los días.

## Block 3 — Calendario en el formulario "Añadir Ingreso"

**Files**
- `src/componentes/FormularioMovimiento.jsx` (modified) — usa `SelectorFecha`; la fecha pasa a ser estado editable.
- `src/componentes/FormularioMovimiento.test.jsx` (modified) — se reescribe `test_formulario_fecha_de_hoy`, que hoy espera un input `readonly`, y se agregan las pruebas de AC-13 y AC-14.
- `pruebas/movimientos.test.js` (modified) — alta con fecha antigua contra la API real.

**Logic**
Implementa FR-05 y NFR-01 en el formulario, y FR-07 de punta a punta.

En `FormularioMovimiento`:
- La fecha pasa a `const [fecha, EstablecerFecha] = useState(() => ObtenerFechaHoy())` (FR-05).
- El input de solo lectura se reemplaza por `<SelectorFecha fecha={fecha} alCambiar={EstablecerFecha} idCampo={idCampoFecha} idEtiqueta={idEtiquetaFecha} />`, con un `useId()` nuevo para la etiqueta "Fecha".
- `ManejarEnvio` envía la `fecha` del estado sin conversiones.

**Data model**
- Reuses `BAT_MOVIMIENTOS` from FEAT-001a — no schema change; constraints as declared there: `fecha` date NOT NULL (día calendario, sin hora), `monto` numeric(14,2) con `BACK_MOVIMIENTOS_MONTO_POSITIVO`, FK a cuenta y categoría. `BASP_AGREGAR_MOVIMIENTO` acepta cualquier fecha no nula.

**Input validation**
- Fecha: la produce `SelectorFecha` (Block 2) o `ObtenerFechaHoy`; siempre es texto `AAAA-MM-DD` de un día hasta hoy.
- Una fecha alterada desde el navegador llega igual al servidor. El rechazo de fechas futuras desde la API es de FEAT-001d (riesgo R-03 aceptado en `docs/daw/security/threat-FEAT-001c.md`).

**Error handling**
- `AgregarIngreso` es rechazado con la fecha elegida — se muestra el error fijo de FEAT-001b, "No se pudo registrar el ingreso. Vuelva a intentarlo.", y la fecha elegida se conserva en el formulario.

**Required tests**
- [ ] `test_formulario_fecha_de_hoy` — el control con etiqueta "Fecha" muestra la fecha local de hoy en "DD/MM/AAAA" y "Guardar" la envía como "AAAA-MM-DD" — validates AC-12
- [ ] `test_fecha_local_a_las_22_utc_menos_3` — con `TZ=America/Argentina/Buenos_Aires` y el reloj en 2026-11-07T01:00:00Z, el calendario preselecciona el 06/11/2026 y `AgregarIngreso` recibe `fecha: '2026-11-06'` — validates AC-13
- [ ] `test_fecha_antigua_se_envia` — se elige el 15/03/1990 con los selectores de año y mes y `AgregarIngreso` recibe `fecha: '1990-03-15'` — validates AC-14
- [ ] `test_falla_alta_conserva_fecha_rechazado` — si `AgregarIngreso` es rechazado después de elegir el 15/03/1990, se muestra el error fijo y, al presionar "Aceptar", el control "Fecha" sigue en "15/03/1990" (sad path)
- [ ] `test_alta_fecha_antigua_api` — contra Supabase, un ingreso de 100 con fecha "1990-03-15" se guarda con esa fecha y el saldo sube en 100 — validates AC-14

**Completion criterion**
Las cinco pruebas pasan y las de FEAT-001b siguen en verde. `npm run lint` no da hallazgos y `npm run build` termina sin errores.

## Block 4 — Flujo completo y orden de la lista

**Files**
- `src/flujoIngreso.test.jsx` (modified) — AC-05 y AC-23 con servicios simulados que guardan los movimientos en memoria.
- `pruebas/movimientos.test.js` (modified) — orden de la lista contra la API real.

**Logic**
Implementa la verificación de FR-01 y FR-08 de punta a punta. El código de producción no cambia en este bloque:
- `ObtenerMovimientos` ya ordena por `fecha desc` y después por `fecha_alta desc`, con el índice `BAIX_MOVIMIENTOS_CUENTA_FECHA`.
- `SeccionCuenta` no reordena.
- `ListaMovimientos` agrupa los movimientos consecutivos de la misma fecha, respetando el orden recibido.

La prueba de interfaz elige la categoría en el `select` y la fecha con `SelectorFecha` (Blocks 1 a 3). Las categorías propias ("Sueldo", "Ventas") solo se pueden cargar como datos de prueba (Out of Scope del PRD), así que la prueba contra la API usa "Pago Ingresado", la única categoría de ingreso que tiene un usuario de prueba.

**Data model**
- Reuses `BAT_MOVIMIENTOS` from FEAT-001a/FEAT-001b — no schema change; constraints as declared there: `fecha` date NOT NULL, `fecha_alta` timestamptz NOT NULL default `now()`, `monto` numeric(14,2) con `BACK_MOVIMIENTOS_MONTO_POSITIVO`, FK a cuenta y categoría, index `BAIX_MOVIMIENTOS_CUENTA_FECHA (id_cuenta, fecha desc, fecha_alta desc)`.

**Error handling**
- Sin condiciones de error propias: este bloque no agrega código de producción. Los errores de carga y de alta son los de FEAT-001b, que siguen cubiertos por `test_error_carga_movimientos` y `test_falla_alta_sin_cambios_rechazado`.

**Required tests**
- [ ] `test_alta_con_categoria_elegida_flujo` — con saldo USD 10.000,00, se registra 1000 en "Sueldo" con la fecha de hoy. La sección Cuenta muestra, bajo hoy, "Sueldo" y "+1.000,00", el saldo "USD 11.000,00" y "Ingreso registrado con éxito." — validates AC-05
- [ ] `test_lista_ordenada_por_fecha_y_alta` — se registran, en este orden, 1.500 en "Sueldo" del 17/09/2026, 50.000 en "Ventas" del 01/10/2026 y 800 en "Pago Ingresado" del 01/10/2026. La lista muestra primero el grupo "01/10/2026" con "Pago Ingresado" y después "Ventas", y luego el grupo "17/09/2026" con "Sueldo" — validates AC-23
- [ ] `test_movimientos_ordenados_api` — contra Supabase se dan tres altas con "Pago Ingresado": 2026-09-17, después 2026-10-01 y después otra de 2026-10-01. La lectura con el orden de `ObtenerMovimientos` (`fecha desc`, `fecha_alta desc`) devuelve primero la última de 2026-10-01, después la primera de 2026-10-01 y por último la de 2026-09-17 — validates AC-23

**Completion criterion**
Las tres pruebas pasan, junto con la suite completa (unidad e integración) y `npm run lint`.

## Final verification
- `validate_spec.py --tier FEATURE` pasa sobre este documento.
- Rollback: no hay migraciones ni cambios de esquema en este ticket; revertir es revertir los commits de los bloques y quitar `react-day-picker` de `package.json`/`package-lock.json`.
- `npm run lint`, `npm test` y `npm run test:integracion` terminan en verde.
- Los 7 AC del PRD tienen al menos una prueba nombrada arriba.
- Las pruebas de integración nuevas crean, como mucho, 2 usuarios anónimos por corrida, por el límite de Supabase.
