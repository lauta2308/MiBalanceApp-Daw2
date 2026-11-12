# Threat model FEAT-001e: Comportamiento del formulario y mensajes

| Field | Value |
|-------|-------|
| Ticket | FEAT-001e |
| Spec | docs/daw/specs/spec-FEAT-001e.md |
| Tier | FEATURE |
| Date | 2026-11-12 |

## Components
| Component | Source in the spec |
|---|---|
| `src/componentes/FormularioMovimiento.jsx` | Block 1 |
| `src/estilos.css` | Block 1 |
| `src/flujoIngreso.test.jsx` | Block 2 |
| `pruebas/movimientos.test.js` | Block 3 |

No hay cambios de esquema, de `BASP_AGREGAR_MOVIMIENTO`, de políticas RLS ni de dependencias.

## Trust boundaries
- Usuario → formulario "Añadir Ingreso": clics y teclas sobre "Guardar", "Cancelar", la flecha "Volver" y los campos cruzan a `ManejarEnvio`, que decide si se llama a `AgregarIngreso`.
- Navegador del usuario → API de Supabase (PostgREST): `rpc('basp_agregar_movimiento')` con el JWT del usuario. La guardia del formulario es del cliente y se puede saltear llamando a la API directamente; el servidor sigue validando monto, fecha, tipo y categoría (FEAT-001d) y bloqueando la cuenta con `for update`.
- Corredor de pruebas → proyecto de Supabase: la prueba de Block 3 inicia una sesión anónima propia (`es_prueba = true`) y escribe solo en su cuenta.

## STRIDE analysis
### `src/componentes/FormularioMovimiento.jsx`
- **Spoofing:** se muestra solo dentro de `GuardiaSesion`, con sesión; el guardado en curso no cambia la identidad que viaja en el JWT.
- **Tampering:** un doble clic o un Enter repetido mandaba dos envíos con los mismos datos (riesgo diferido en `threat-FEAT-001b.md`, componente `FormularioMovimiento.jsx`, Denial of Service). La guardia sincrónica `envioEnCurso` corta el segundo envío y el `fieldset` deshabilitado impide editar monto, categoría y fecha mientras el alta está pendiente, así lo que se registra es lo que el usuario confirmó (R-01). Dos pestañas abiertas son dos confirmaciones distintas del mismo usuario, no un envío duplicado.
- **Repudiation:** cada alta queda como una fila en `BAT_MOVIMIENTOS` de la cuenta del usuario y se ve en la lista; no hay acciones sin registro.
- **Information Disclosure:** los errores siguen siendo textos fijos ("No se pudo registrar el ingreso. Vuelva a intentarlo."); el detalle técnico va a `console.error` solo en desarrollo (R-03).
- **Denial of Service:** mientras el alta está pendiente no se pueden encadenar envíos; si la API no responde, el formulario queda en "Guardando…" hasta que la petición falle o resuelva, sin consumir más recursos (R-02).
- **Elevation of Privilege:** deshabilitar controles no otorga permisos; `BASP_AGREGAR_MOVIMIENTO` sigue tomando la cuenta de `auth.uid()` y rechazando categorías ajenas con 42501.

### `src/estilos.css`
- **Spoofing:** no maneja identidad.
- **Tampering:** solo agrega el reset del `fieldset` y el aspecto de los controles deshabilitados; no carga recursos externos.
- **Repudiation:** no aplica a estilos.
- **Information Disclosure:** no muestra datos nuevos.
- **Denial of Service:** sin selectores costosos ni animaciones.
- **Elevation of Privilege:** el aspecto deshabilitado acompaña al atributo `disabled`, que es el que bloquea; un cambio de estilo hecho por el usuario en su navegador no habilita un control deshabilitado.

### `src/flujoIngreso.test.jsx`
- **Spoofing:** usa la sesión simulada de las pruebas de unidad, sin credenciales reales.
- **Tampering:** opera sobre la base simulada en memoria del archivo; no llega a la red, que `bloqueoRedPruebas.js` corta en el proyecto `unidad`.
- **Repudiation:** no aplica.
- **Information Disclosure:** el error técnico simulado (`ERROR_TECNICO`) existe para comprobar que no se muestra (AC-33).
- **Denial of Service:** con relojes falsos, los 10 segundos de AC-26 no demoran la suite.
- **Elevation of Privilege:** no ejecuta código externo.

### `pruebas/movimientos.test.js`
- **Spoofing:** crea un usuario anónimo propio por corrida con `CrearUsuarioPrueba`; no reutiliza sesiones ajenas.
- **Tampering:** escribe solo en la cuenta de ese usuario (Regla #0); RLS y `BASP_AGREGAR_MOVIMIENTO` impiden tocar otras.
- **Repudiation:** el usuario queda marcado `es_prueba = true` y se borra con `supabase/scripts/limpiar_usuarios_prueba.sql`.
- **Information Disclosure:** las claves salen de `.env.local`, que está en `.gitignore`; la prueba no imprime el JWT.
- **Denial of Service:** suma 1 inicio de sesión anónimo y 20 llamadas a la RPC por corrida, dentro del límite de ~30 inicios por hora por IP (R-04).
- **Elevation of Privilege:** usa la clave pública `anon`, nunca `service_role`.

## Data classification
| Data | Class | At rest | In transit |
|---|---|---|---|
| monto, fecha y categoría del ingreso | financial | `numeric(14,2)` y `date` en `BAT_MOVIMIENTOS`, con RLS por usuario y cifrado de disco de Supabase | TLS de Supabase (HTTPS) |
| saldo de la cuenta | financial | `numeric` en `BAT_CUENTAS`, con RLS por usuario y cifrado de disco de Supabase | TLS de Supabase (HTTPS) |
| JWT de la sesión anónima | credentials | almacenamiento local del navegador gestionado por supabase-js; en pruebas, solo en memoria | TLS de Supabase (HTTPS) |

## Risks and mitigations
| ID | Risk | STRIDE | Likelihood | Impact | Mitigation |
|---|---|---|---|---|---|
| R-01 | un doble clic o un Enter repetido en "Guardar" registra dos ingresos | T | H | M | guardia sincrónica `envioEnCurso` en `ManejarEnvio` y `fieldset disabled` con "Guardando…" (Block 1, ADR-006); `test_guardar_doble_clic_duplicado_rechazado` y `test_doble_clic_guardar_flujo` |
| R-02 | si el alta falla, el formulario queda bloqueado y el usuario pierde lo que escribió | D | M | M | ante el rechazo se libera la guardia, vuelve "Guardar" habilitado y se conservan monto, categoría y fecha (`test_falla_alta_rehabilita_formulario_rechazado`) |
| R-03 | un error del servidor muestra códigos internos o stack traces | I | L | M | textos fijos en español con "Aceptar"; `test_error_carga_cuenta_sin_detalle_tecnico_flujo`, `test_falla_alta_sin_cambios_rechazado` y las pruebas existentes de carga lo comprueban (AC-33) |
| R-04 | la prueba de 20 altas agota el límite de inicios de sesión anónimos | D | M | L | usa un solo usuario anónimo para las 20 altas; el límite (~30 por hora por IP) alcanza para una corrida completa (~15 inicios), no para dos en la misma hora |
| R-05 | con el alta pendiente, el "atrás" del navegador desmonta el formulario: si el alta falla, el usuario no ve el error | R | L | L | accepted, see below |
| R-06 | si Supabase no responde, el formulario queda en "Guardando…" sin límite de tiempo | D | L | M | accepted, see below |

## Accepted risks
### R-05
- **Accepted by:** Lautaro, dueño del producto (2026-11-12, PLAN de FEAT-001e)
- **Justification:** bloquear el "atrás" del navegador requiere pasar la app a un router de datos de react-router (`useBlocker`), un cambio de arquitectura grande para un caso raro; un alta que sale bien igual se registra y se ve en la lista.
- **Review conditions:** se revisa si la app pasa a un router de datos por otra razón, o si aparecen ingresos que el usuario cree no registrados.

### R-06
- **Accepted by:** Lautaro, dueño del producto (2026-11-12, PLAN de FEAT-001e)
- **Justification:** el PRD (FR-02) bloquea el formulario "hasta que termine" y no fija un tiempo máximo; agregarlo sería un requisito nuevo. Recargar la página sale del estado sin perder datos guardados.
- **Review conditions:** se revisa si en el uso real aparece un "Guardando…" que no termina, o cuando se definan los tiempos de RNF-01/RNF-02.

## Supply chain
No se agregan dependencias. Se siguen usando `react`, `react-router` y `@supabase/supabase-js` en las versiones de `package-lock.json`, revisadas por `npm audit` en el SAST.

## Availability
El servidor no cambia. Del lado del cliente, la guardia reduce la carga al evitar envíos duplicados. Un servidor que no responde deja el formulario en "Guardando…" hasta que supabase-js devuelva el error; no hay reintentos automáticos (ADR-006).
