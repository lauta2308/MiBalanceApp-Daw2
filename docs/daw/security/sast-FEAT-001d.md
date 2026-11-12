# SAST FEAT-001d

| Field | Value |
|-------|-------|
| Ticket | FEAT-001d |
| Tools | revisión de código por modelo con búsqueda de patrones (grep), npm audit |
| Date | 2026-11-12 |

Alcance: los archivos que la rama `feat/FEAT-001d-monto-limites` cambia fuera de `docs/` respecto de `c3efe02`: `src/utilidades/mascaraMonto.js` (nuevo), `src/utilidades/validacionMonto.js`, `src/componentes/FormularioMovimiento.jsx` y sus pruebas, `src/flujoIngreso.test.jsx`, `src/utilidades/formatoMoneda.test.js`, `supabase/migrations/20261112000001_limites_movimiento.sql` (nueva), `pruebas/movimientos.test.js`, `pruebas/ayudantesPruebas.js` y `.daw/config.yml`. No hay dependencias nuevas. Revisado de nuevo en el cierre de CODE sobre `ff7d9a0` (los 4 bloques commiteados): la lista de archivos y `npm audit` no cambiaron.

| Rule | Verdict | Notes |
|---|---|---|
| F-SAST-01 | ✅ | sin claves, JWT ni `service_role` en el diff; `.env.local` está en `.gitignore` (`git check-ignore` lo confirma) |
| F-SAST-02 | ✅ | la migración no arma SQL dinámico: `BASP_AGREGAR_MOVIMIENTO` usa parámetros tipados (`p_monto numeric`, `p_fecha date`), `security definer` con `search_path = ''` y nombres calificados con `public.`; el cliente llama por `rpc()` sin cambios |
| F-SAST-03 | ✅ | sin `exec`, `spawn` ni `child_process` |
| F-SAST-04 | ✅ | sin `eval`, `new Function` ni deserialización insegura |
| F-SAST-05 | ✅ | sin rutas de archivo construidas con datos del usuario |
| F-SAST-06 | ✅ | sin `dangerouslySetInnerHTML` ni `innerHTML`; el monto con máscara y `MENSAJE_MONTO_MAXIMO` se renderizan como texto de React; el pegado se lee con `clipboardData.getData('text')` (texto plano) |
| F-SAST-07 | ✅ | sin peticiones salientes nuevas |
| F-SAST-08 | ✅ | el proyecto no implementa criptografía propia |
| F-SAST-09 | ✅ | sin modo de depuración en producción; el único `console.error` (`FormularioMovimiento.jsx:31`) es preexistente y está condicionado a `import.meta.env.DEV` |
| F-SAST-10 | ✅ | no se registra nada nuevo |
| F-SAST-11 | ✅ | no hay carga de archivos |
| F-SAST-12 | ✅ | la sesión viaja en el encabezado Authorization, no en cookies |
| F-SAST-13 | ✅ | `npm audit --omit=dev`: 0 vulnerabilidades; `npm audit`: 0 altas y 0 críticas |
| F-SAST-14 | ✅ | el servidor valida monto (> 0, ≤ 999999999999.99, dos decimales), fecha (≤ mañana UTC), tipo y categoría de la cuenta de `auth.uid()` antes de escribir (`20261112000001_limites_movimiento.sql:31-36`); esto cierra el riesgo R-03 de FEAT-001c (fecha futura por la API). El cliente filtra con la máscara y valida el tope por texto. Expresiones regulares ancladas y agrupación de miles lineal (threat R-04, probado con 1.000.002 caracteres) |
| F-SAST-15 | ✅ | los rechazos devuelven mensajes fijos ("Datos del movimiento inválidos.", "Operación no permitida.") y la interfaz muestra textos fijos sin detalles técnicos |
| F-SAST-16 | ⚠️ | Medium, preexistente: `minimatch` (GHSA-g3hv-75wg-m249) vía `eslint` y `@eslint/config-array` (dependencias de desarrollo), `package-lock.json:2620`; suprimido como riesgo aceptado, ver abajo. Sin dependencias nuevas en este ticket |
| F-SAST-17 | ✅ | sin funciones inseguras ni rutas de código dinámico |

## Suppressions

### Suppression: F-SAST-16

| Field | Value |
|---|---|
| File | package-lock.json:2620 (`node_modules/minimatch`, requerido por `node_modules/eslint` y `node_modules/@eslint/config-array`, devDependencies) |
| Category | F-SAST-16 — CVE Medium en una dependencia (GHSA-g3hv-75wg-m249, denegación de servicio por amplificación de globparts) |
| Disposition | ACCEPTED_RISK |
| Reviewer | Lautaro (aceptado en FEAT-001a, FEAT-002 y FEAT-001b; renovado sin cambios por el orquestador en modo minimal en FEAT-001c y FEAT-001d) |
| Date | 2026-11-12 |
| Justification | Es el mismo hallazgo que el usuario aceptó en FEAT-001a (2026-11-09), FEAT-002 (2026-11-10) y FEAT-001b (2026-11-11), sin cambios: solo afecta a ESLint en desarrollo y CI, no a la app publicada (`npm audit --omit=dev` da 0). Los patrones que procesa vienen de `eslint.config.js`, que es código del repositorio. La única corrección disponible baja ESLint a la versión 9, y eso va contra la regla del proyecto de usar la última versión estable. |
| Compensating control | El job de CI tiene `timeout-minutes: 15` y un token de solo lectura, sin secretos. Un cambio a `eslint.config.js` se ve en la revisión del pull request, y `npm audit` se repite en cada ticket. |
| Review by | 2027-05-09, o antes si ESLint publica una versión que use `minimatch` 11.0.1 o superior |

Total: 16 clean, 0 vulnerabilities (0 critical, 0 high), 1 Medium suprimido
Result: PASSED
