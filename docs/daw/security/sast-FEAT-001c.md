# SAST FEAT-001c

| Field | Value |
|-------|-------|
| Ticket | FEAT-001c |
| Tools | revisión de código por modelo con búsqueda de patrones (grep), npm audit |
| Date | 2026-11-12 |

Alcance: los 16 archivos que la rama `feat/FEAT-001c-elegir-categoria-fecha` cambia fuera de `docs/` respecto de `0f3e9a9`: `src/` (`SelectorFecha.jsx` nuevo, `FormularioMovimiento.jsx`, `servicios/categorias.js`, `utilidades/fechas.js`, `utilidades/ordenCategorias.js` nuevo, `main.jsx`, `estilos.css` y sus pruebas), `pruebas/movimientos.test.js`, `package.json` y `package-lock.json`. El ticket no tiene migraciones ni cambios de esquema.

| Rule | Verdict | Notes |
|---|---|---|
| F-SAST-01 | ✅ | sin claves, JWT ni `service_role` en el diff; `.env`, `.env.local` y `.env.*.local` están en `.gitignore` |
| F-SAST-02 | ✅ | sin SQL nuevo; `ObtenerCategoriasIngreso` usa el constructor de consultas de supabase-js (`select`, `eq`) y ahora ordena en el cliente (ADR-004); el alta sigue por `rpc()` con parámetros tipados |
| F-SAST-03 | ✅ | sin `exec`, `spawn` ni `child_process` |
| F-SAST-04 | ✅ | sin `eval`, `new Function` ni deserialización insegura |
| F-SAST-05 | ✅ | sin rutas de archivo construidas con datos del usuario |
| F-SAST-06 | ✅ | sin `dangerouslySetInnerHTML` ni `innerHTML`; los nombres de categoría (texto del usuario) y la fecha se renderizan como texto de React; `aria-labelledby` solo usa ids de `useId()` |
| F-SAST-07 | ✅ | sin peticiones salientes nuevas; la URL de Supabase es de configuración |
| F-SAST-08 | ✅ | el proyecto no implementa criptografía propia |
| F-SAST-09 | ✅ | sin modo de depuración en producción; el único `console.error` (`FormularioMovimiento.jsx:20`) es preexistente y sigue condicionado a `import.meta.env.DEV` |
| F-SAST-10 | ✅ | no se registra nada nuevo; el registro de errores solo existe en desarrollo |
| F-SAST-11 | ✅ | no hay carga de archivos |
| F-SAST-12 | ✅ | la sesión viaja en el encabezado Authorization, no en cookies; sin formularios nuevos con estado en cookies |
| F-SAST-13 | ✅ | `npm audit --omit=dev`: 0 vulnerabilidades; `npm audit`: 0 altas y 0 críticas |
| F-SAST-14 | ✅ | la fecha solo sale del calendario como `"AAAA-MM-DD"` y `ConvertirTextoAFecha` valida el formato; el servidor sigue validando fecha y categoría no nulas, que la categoría sea de la cuenta de `auth.uid()` y del tipo `INGRESO`. La fecha futura alterada desde el navegador es el riesgo R-03 del modelo de amenazas, aceptado hasta FEAT-001d (decisions-FEAT-001c.md) |
| F-SAST-15 | ✅ | sin manejo de errores nuevo; la interfaz sigue mostrando textos fijos sin detalles técnicos |
| F-SAST-16 | ⚠️ | Medium, preexistente: `minimatch` 10.2.6 (GHSA-g3hv-75wg-m249) vía `eslint` y `@eslint/config-array` (dependencias de desarrollo), `package-lock.json:2620`; suprimido como riesgo aceptado, ver abajo. `react-day-picker` 10.0.2 y `date-fns` 4.4.0, nuevos en este ticket, sin CVE conocidos |
| F-SAST-17 | ✅ | sin funciones inseguras ni rutas de código dinámico |

## Suppressions

### Suppression: F-SAST-16

| Field | Value |
|---|---|
| File | package-lock.json:2620 (`node_modules/minimatch`, requerido por `node_modules/eslint` y `node_modules/@eslint/config-array`, devDependencies) |
| Category | F-SAST-16 — CVE Medium en una dependencia (GHSA-g3hv-75wg-m249, denegación de servicio por amplificación de globparts) |
| Disposition | ACCEPTED_RISK |
| Reviewer | Lautaro (aceptado en FEAT-001a, FEAT-002 y FEAT-001b; renovado sin cambios por el orquestador en modo minimal) |
| Date | 2026-11-12 |
| Justification | Es el mismo hallazgo que el usuario aceptó en FEAT-001a (2026-11-09), FEAT-002 (2026-11-10) y FEAT-001b (2026-11-11), sin cambios: solo afecta a ESLint en desarrollo y CI, no a la app publicada (`npm audit --omit=dev` da 0). Los patrones que procesa vienen de `eslint.config.js`, que es código del repositorio. La única corrección disponible baja ESLint a la versión 9, y eso va contra la regla del proyecto de usar la última versión estable. |
| Compensating control | El job de CI tiene `timeout-minutes: 15` y un token de solo lectura, sin secretos. Un cambio a `eslint.config.js` se ve en la revisión del pull request, y `npm audit` se repite en cada ticket. |
| Review by | 2027-05-09, o antes si ESLint publica una versión que use `minimatch` 11.0.1 o superior |

Total: 16 clean, 1 vulnerability (0 critical, 0 high, 1 medium suppressed)
Result: PASSED
