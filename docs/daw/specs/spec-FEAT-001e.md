# Spec FEAT-001e: Comportamiento del formulario y mensajes

| Field | Value |
|-------|-------|
| Ticket | FEAT-001e |
| PRD | docs/daw/prd/prd-FEAT-001e.md |
| Tier | FEATURE |
| Date | 2026-11-12 |
| Spec loops | 3 |
| Loops since last human decision | 1 |

## Summary
El único cambio de producción es el guardado en curso de "Añadir Ingreso" (FR-02):
- Mientras `AgregarIngreso` está pendiente, una guardia sincrónica por referencia descarta un segundo envío.
- Un `fieldset` deshabilitado bloquea monto, categoría, fecha, "Guardar" y "Cancelar", y también se deshabilita la flecha "Volver".
- El botón muestra "Guardando…" (ADR-006).

El resto del PRD ya se cumple por cómo está armada la app y se fija con pruebas:
- El formulario es una ruta que se vuelve a montar en cada apertura (FR-01).
- El mensaje de éxito es una región `role="status"` que no bloquea (FR-03).
- `MensajeError` solo se cierra con "Aceptar" (FR-04).
- Los errores son textos fijos (NFR-02).

La consistencia del saldo (NFR-01) se prueba con 20 altas contra Supabase. No cambian el esquema, `BASP_AGREGAR_MOVIMIENTO`, las políticas RLS ni las dependencias.

## Coverage: PRD → blocks
| Requirement | Covered by |
|---|---|
| FR-01 | Block 2 |
| FR-02 | Block 1, Block 2 |
| FR-03 | Block 2 |
| FR-04 | Block 2 |
| NFR-01 | Block 3. Strategy: después de cada una de 20 altas fijas, el `saldo::text` de `BAT_CUENTAS` se compara en centavos (BigInt) con la suma de ingresos menos gastos leída de `BAT_MOVIMIENTOS` y con la suma esperada; 0 diferencias. |
| NFR-02 | Block 2. Strategy: con fallas simuladas en la carga de la sección Cuenta y en el alta, se comprueba que el texto mostrado sea el mensaje fijo en español, que el error técnico simulado no aparezca y que haya un botón "Aceptar". |

| AC | Covered by |
|---|---|
| AC-08 | Block 2 |
| AC-21 | Block 1, Block 2 |
| AC-25 | Block 2 |
| AC-26 | Block 2 |
| AC-32 | Block 3 |
| AC-33 | Block 2 |

## Dependencies between blocks
- Block 2 depende de Block 1: la prueba de flujo de AC-21 necesita el guardado en curso.
- Block 3 no depende de ningún otro: solo usa la API.
- Orden de ejecución: 1 → 2 → 3.

## Block 1 — Guardado en curso en el formulario

**Files**
- `src/componentes/FormularioMovimiento.jsx` (modified): guardia `envioEnCurso`, estado `guardando`, `fieldset` deshabilitado, texto "Guardando…" y flecha "Volver" deshabilitada.
- `src/estilos.css` (modified): el `fieldset` (`.campos-formulario`) queda con `border: 0`, `padding: 0`, `margin: 0` y `min-inline-size: 0`; este último evita que su ancho mínimo por defecto desborde en pantallas chicas. También agrega un aspecto para los controles deshabilitados, porque hoy no hay ninguna regla `:disabled`.
- `src/componentes/FormularioMovimiento.test.jsx` (modified): las tres pruebas de este bloque y una copia local de `CrearPromesaControlada`, igual a la de `SeccionCuenta.test.jsx`.

**Logic**
Implementa FR-02 y AC-21, y mitiga R-01 y R-02 de `threat-FEAT-001e.md`:
1. `const envioEnCurso = useRef(false)` y `const [guardando, EstablecerGuardando] = useState(false)`.
2. Orden de `ManejarEnvio`:
   - `preventDefault()`.
   - Si `envioEnCurso.current` es verdadero, sale sin hacer nada.
   - Valida con `ValidarMonto` y `ValidarMontoMaximo` sin cambios. Un monto inválido muestra su mensaje y no marca el guardado.
   - Pone `envioEnCurso.current = true` y llama a `EstablecerGuardando(true)`.
   - Hace `await AgregarIngreso(...)`.
3. Si `AgregarIngreso` es rechazado:
   - Pone `envioEnCurso.current = false` y `EstablecerGuardando(false)`.
   - Muestra `MENSAJE_ERROR_ALTA`.
   - Monto, categoría y fecha se conservan.
4. Si `AgregarIngreso` resuelve, navega a `/` con el mensaje de éxito, como hoy. La guardia queda en verdadero hasta que el componente se desmonta.
5. Todo el contenido del `<form>` (los tres campos y `.acciones-formulario`) va dentro de `<fieldset className="campos-formulario" disabled={guardando}>`.
   - El atributo deshabilita los `input`, `select` y `button` que hay dentro, incluidos el botón de `SelectorFecha` y los controles de su calendario, que se montan dentro del mismo `form`.
   - `SelectorFecha` no cambia de firma.
6. El botón de envío muestra `guardando ? 'Guardando…' : 'Guardar'`. La flecha "Volver", que está en el encabezado fuera del `form`, recibe `disabled={guardando}`.

**Input validation**
- Monto: texto con la máscara de FEAT-001d. `ValidarMonto` exige más que 0 y como mucho dos decimales, y `ValidarMontoMaximo` exige como mucho 999.999.999.999,99. No cambian.
- Categoría y fecha: las mismas de FEAT-001c, sin cambios.
- Un segundo envío mientras `envioEnCurso.current` es verdadero se descarta antes de validar.

**Error handling**
- Doble clic o Enter repetido mientras el alta está pendiente: el envío duplicado se descarta en la guardia y `AgregarIngreso` se llama una sola vez.
- `AgregarIngreso` rechazado: se muestra "No se pudo registrar el ingreso. Vuelva a intentarlo.", el formulario vuelve a habilitarse con "Guardar" y se conservan los datos.

Fuera del alcance de este bloque, por decisión del usuario (riesgos R-05 y R-06 de `threat-FEAT-001e.md`): el "atrás" del navegador no se bloquea durante el alta, y "Guardando…" no tiene tiempo máximo.

**Required tests**
- [ ] test_guardar_doble_clic_duplicado_rechazado — con `AgregarIngreso` pendiente, un clic en "Guardar" seguido de un segundo envío con `fireEvent.submit(form)` llama a `AgregarIngreso` una sola vez. El segundo envío llega a `onSubmit` aunque el botón ya esté deshabilitado, así que la prueba ejercita la guardia `envioEnCurso`, que es lo que ADR-006 agrega frente a la opción 1: sin la referencia tiene que fallar. Valida AC-21 (sad path: envío duplicado).
- [ ] test_guardando_deshabilita_formulario — con `AgregarIngreso` pendiente, el botón dice "Guardando…" y está deshabilitado, y también lo están el monto, la categoría, el botón "Fecha", "Cancelar" y "Volver". Si el calendario estaba abierto al guardar, sus botones y selectores también quedan deshabilitados. Al resolver, navega a `/`. Valida AC-21.
- [ ] test_falla_alta_rehabilita_formulario_rechazado — si `AgregarIngreso` es rechazado, muestra el mensaje fijo, "Guardar" vuelve habilitado con su texto, los campos conservan monto, categoría y fecha, y un nuevo "Guardar" vuelve a llamar a `AgregarIngreso`. Valida AC-21 (sad path: alta rechazada).

**Completion criterion**
Pasan las tres pruebas y siguen en verde las demás de `FormularioMovimiento.test.jsx` y `flujoIngreso.test.jsx`.

## Block 2 — Flujo del formulario y de los mensajes

**Files**
- `src/flujoIngreso.test.jsx` (modified): pruebas de flujo nuevas.
  - Las de AC-08 y AC-21 van en un `describe` con `CATEGORIAS_PROPIAS` (incluye "Sueldo") y `GuardarIngresoEnBase`.
  - Se copia `CrearPromesaControlada` para dejar pendiente el alta de AC-21.

**Logic**
Bloque solo de pruebas, sin cambios de producción. Fija FR-01, FR-02, FR-03, FR-04 y NFR-02 en el flujo completo de `App` con la base simulada, el reloj falso en 2026-11-06 y los helpers `RenderizarApp`, `AbrirFormulario`, `RegistrarIngreso` y `ElegirDiaDe2026`.
- AC-08: el formulario se completa con 500, "Sueldo" y el 01/10/2026. Se sale con la flecha, con "Cancelar" y guardando. Al volver a abrir "Añadir Ingreso" en los tres casos, se ven el monto vacío, "Pago Ingresado" y la fecha de hoy.
- AC-21: con saldo 10000.00, un doble clic en "Guardar" con 1500 y el alta pendiente muestra "Guardando…". Al resolver queda un solo movimiento y "USD 11.500,00".
- AC-25: con el mensaje "Ingreso registrado con éxito." todavía en pantalla, se abre "Añadir Ingreso", se guarda 500 y queda el segundo ingreso registrado.
- AC-26: con monto "0", el mensaje "El monto debe ser mayor a 0." sigue visible a los 10 s y se cierra con "Aceptar".
- AC-33:
  - Con `ObtenerCuenta` rechazado por un error técnico simulado, la sección Cuenta muestra "No se pudo cargar su cuenta. Vuelva a intentarlo." con "Aceptar" y sin el texto del error.
  - El caso del alta ya lo cubre `test_falla_alta_sin_cambios_rechazado`, que sigue sin cambios.

**Input validation**
- Las pruebas escriben en el campo "Monto", eligen la categoría y la fecha, y no agregan validaciones nuevas. Valen las de Block 1, que son las de FEAT-001c y FEAT-001d: monto mayor que 0, hasta 999.999.999.999,99 y con dos decimales como máximo; categoría de ingreso de la cuenta; fecha hasta hoy.

**Error handling**
Este bloque no agrega manejo de errores; prueba en el flujo completo el que ya tienen el formulario y la sección Cuenta:
- Monto inválido ("0"): "El monto debe ser mayor a 0." queda visible hasta presionar "Aceptar", sin cerrarse por tiempo.
- Error al cargar la sección Cuenta: "No se pudo cargar su cuenta. Vuelva a intentarlo." con "Aceptar", sin el error técnico.
- Alta rechazada por el servidor: "No se pudo registrar el ingreso. Vuelva a intentarlo." con "Aceptar", sin el error técnico y sin cambios en la cuenta.

**Required tests**
- [ ] test_formulario_limpio_al_volver_flujo — después de la flecha, "Cancelar" y guardar, volver a abrir muestra el monto vacío, "Pago Ingresado" y la fecha de hoy. Valida AC-08.
- [ ] test_doble_clic_guardar_flujo — con saldo 10000.00 y el alta pendiente, un clic en "Guardar" con 1500 seguido de `fireEvent.submit(form)` registra un solo ingreso y muestra "USD 11.500,00". Valida AC-21.
- [ ] test_segundo_ingreso_con_mensaje_exito_flujo — con el mensaje de éxito visible se registra un segundo ingreso de 500 sin cerrarlo. Antes del clic en "Añadir Ingreso", la prueba comprueba que el mensaje sigue en pantalla, y no depende de los 3 s reales del cierre. Valida AC-25.
- [ ] test_mensaje_error_monto_cero_diez_segundos_flujo — "El monto debe ser mayor a 0." sigue visible a los 10 s y se cierra con "Aceptar". Los temporizadores son falsos completos (`vi.useFakeTimers()` después de renderizar, como en `test_mensaje_error_validacion_hasta_aceptar`), no solo `Date`, así que un cierre por `setTimeout` haría fallar la prueba. Valida AC-26.
- [ ] test_error_carga_cuenta_sin_detalle_tecnico_flujo — la falla de carga de la sección Cuenta muestra el mensaje fijo en español con "Aceptar" y sin el error técnico. Valida AC-33.
- [ ] test_falla_alta_sin_cambios_rechazado — prueba existente, sin cambios. El alta rechazada muestra el mensaje fijo sin el error técnico y la cuenta no cambia. Valida AC-33.
- [ ] test_mensaje_error_validacion_hasta_aceptar — prueba existente de `FormularioMovimiento.test.jsx`, sin cambios. Valida AC-26 a nivel del componente.

**Completion criterion**
Pasan las siete pruebas, cinco nuevas y dos existentes, sin cambios en `src/` fuera de los archivos `*.test.jsx`.

## Block 3 — Saldo consistente en una secuencia de 20 altas

**Files**
- `pruebas/movimientos.test.js` (modified): la prueba nueva y dos helpers locales.
  - `LeerMontosTexto`: lee `tipo` y `monto::text` de `bat_movimientos` de la cuenta.
  - `ConvertirMontoACentavos`: convierte a BigInt, igual que en `flujoIngreso.test.jsx`, que no lo exporta.
  - `pruebas/ayudantesPruebas.js` no cambia.

**Logic**
Implementa la prueba de NFR-01 y AC-32, y mitiga R-04:
1. Crea un usuario anónimo propio con `CrearUsuarioConPagoIngresado`, con saldo 0.
2. Recorre una lista fija de 20 pares (monto en texto, fecha):
   - Montos distintos con 0, 1 y 2 decimales, entre "0.01" y "999999999999.99".
   - Fechas distintas entre 2026-01-01 y 2026-10-31.
   - Cada par se registra con `AgregarMovimiento` (tipo `INGRESO`, "Pago Ingresado").
3. Después de cada alta lee `saldo::text` y los montos. Compara en centavos (BigInt) el saldo con la suma de ingresos menos gastos de `BAT_MOVIMIENTOS` y con la suma esperada acumulada.
4. Tiene un tiempo máximo propio de 120000 ms, porque son 20 RPC y unas 40 lecturas.

**Data model**
- Reutiliza `BAT_CUENTAS` y `BAT_MOVIMIENTOS` sin cambios de esquema. Las restricciones siguen siendo las declaradas en las migraciones:
  - `saldo numeric` NOT NULL.
  - `monto numeric(14,2)` NOT NULL con `BACK_MOVIMIENTOS_MONTO_POSITIVO`.
  - `tipo` con check `INGRESO`/`GASTO`.
  - `fecha date` NOT NULL.
  - FK a la cuenta y a la categoría.
  - RLS por propietario.
- Sin migraciones: no hay nada que revertir en la base. El rollback del ticket es revertir el commit.
- El bloque no implementa un FR: es la prueba de NFR-01, que el PRD mide con AC-32.

**Error handling**
- Sin condiciones de error propias: la prueba solo hace altas válidas. Los rechazos de la API ya los cubren las pruebas de FEAT-001b y FEAT-001d.

**Required tests**
- [ ] test_secuencia_veinte_altas_saldo_consistente_api — con saldo 0, después de cada una de 20 altas con montos y fechas distintos, el saldo es igual a la suma de ingresos menos gastos y a la suma esperada, con 0 diferencias. Valida AC-32.

**Completion criterion**
La prueba pasa contra Supabase con un solo inicio de sesión anónimo.

## Final verification
- `validate_spec.py --tier FEATURE` pasa sobre este documento y `validate_threat.py` sobre `threat-FEAT-001e.md`.
- La suite completa (unidad e integración) queda en verde y ESLint, limpio.
- Las 11 pruebas requeridas existen con el nombre exacto.
- Un doble clic en "Guardar" registra un solo ingreso en el flujo de la interfaz.
