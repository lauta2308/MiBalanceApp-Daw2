# SAST FEAT-001b

| Field | Value |
|-------|-------|
| Ticket | FEAT-001b |
| Tools | revisión de código por modelo con búsqueda de patrones (grep), npm audit |
| Date | 2026-11-11 |

Alcance: los 33 archivos que la rama `feat/FEAT-001b-registrar-ingreso` cambia respecto de `main` (`d191919`): `src/`, `pruebas/`, `supabase/migrations/20261111000001_agregar_movimiento.sql`, `supabase/scripts/pruebas_movimientos.sql`, `package.json` y `package-lock.json`.

| Rule | Verdict | Notes |
|---|---|---|
| F-SAST-01 | ✅ | sin claves, JWT ni `service_role` en el código; `.env` y `.env.local` están en `.gitignore` |
| F-SAST-02 | ✅ | sin SQL dinámico: `BASP_AGREGAR_MOVIMIENTO` usa parámetros tipados (`p_monto numeric`, `p_fecha date`, `p_id_categoria uuid`) en sentencias estáticas, con `security definer` y `set search_path = ''`; el frontend usa `rpc()` y el constructor de consultas de supabase-js |
| F-SAST-03 | ✅ | sin `exec`, `spawn` ni `child_process` |
| F-SAST-04 | ✅ | sin `eval`, `new Function` ni deserialización insegura |
| F-SAST-05 | ✅ | sin rutas de archivo construidas con datos del usuario |
| F-SAST-06 | ✅ | sin `dangerouslySetInnerHTML` ni `innerHTML`; montos, fechas, categorías y el mensaje de éxito se renderizan como texto de React |
| F-SAST-07 | ✅ | sin peticiones salientes controladas por el usuario; la URL de Supabase es de configuración |
| F-SAST-08 | ✅ | el proyecto no implementa criptografía propia |
| F-SAST-09 | ✅ | sin modo de depuración en producción; los `console.error` nuevos (`FormularioMovimiento.jsx:19`, `SeccionCuenta.jsx:41`) quedan condicionados a `import.meta.env.DEV` |
| F-SAST-10 | ✅ | no se registran datos sensibles en producción; el registro de errores solo existe en desarrollo |
| F-SAST-11 | ✅ | no hay carga de archivos |
| F-SAST-12 | ✅ | la sesión viaja en el encabezado Authorization, no en cookies; el alta va por RPC autenticada, sin formularios con estado en cookies |
| F-SAST-13 | ✅ | `npm audit --omit=dev`: 0 vulnerabilidades; `npm audit`: 0 altas y 0 críticas |
| F-SAST-14 | ✅ | el monto se valida en el cliente (`validacionMonto.js`) y de nuevo en el servidor (`> 0`, dos decimales, tipo `INGRESO`, fecha y categoría no nulas); la categoría debe ser de la cuenta de `auth.uid()` y del mismo tipo; `execute` revocado a `public` y `anon` |
| F-SAST-15 | ✅ | la función devuelve mensajes fijos ('Operación no permitida.', 'Datos del movimiento inválidos.') que no revelan si una categoría existe; la interfaz muestra un texto fijo sin detalles técnicos |
| F-SAST-16 | ⚠️ | Medium, preexistente: `minimatch` 10.2.6 (GHSA-g3hv-75wg-m249) vía `eslint` y `@eslint/config-array` (dependencias de desarrollo), `package-lock.json:2603`; suprimido como riesgo aceptado, ver abajo. `react-router` 8.5.1, nuevo en este ticket, sin CVE conocidos |
| F-SAST-17 | ✅ | sin funciones inseguras ni rutas de código dinámico |

## Suppressions

### Suppression: F-SAST-16

| Field | Value |
|---|---|
| File | package-lock.json:2603 (`node_modules/minimatch`, requerido por `node_modules/eslint` y `node_modules/@eslint/config-array`, devDependencies) |
| Category | F-SAST-16 — CVE Medium en una dependencia (GHSA-g3hv-75wg-m249, denegación de servicio por amplificación de globparts) |
| Disposition | ACCEPTED_RISK |
| Reviewer | Lautaro |
| Date | 2026-11-11 |
| Justification | Es el mismo hallazgo que el usuario aceptó en FEAT-001a (2026-11-09) y FEAT-002 (2026-11-10), sin cambios: solo afecta a ESLint en desarrollo y CI, no a la app publicada (`npm audit --omit=dev` da 0). Los patrones que procesa vienen de `eslint.config.js`, que es código del repositorio. La única corrección disponible baja ESLint a la versión 9, y eso va contra la regla del proyecto de usar la última versión estable. |
| Compensating control | El job de CI tiene `timeout-minutes: 15` y un token de solo lectura, sin secretos. Un cambio a `eslint.config.js` se ve en la revisión del pull request, y `npm audit` se repite en cada ticket. |
| Review by | 2027-05-09, o antes si ESLint publica una versión que use `minimatch` 11.0.1 o superior |

Total: 16 clean, 1 vulnerability (0 critical, 0 high, 1 medium suppressed)
Result: PASSED
