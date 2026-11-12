# Changelog

## Unreleased

### Added
- [FEAT-001a] Proyecto base, esquema con RLS y sección Cuenta: sesión provisoria sin credenciales, cuenta "Mi Cuenta" en USD con sus categorías por defecto, y saldo inicial con mensaje de lista vacía.
- [FEAT-002] Integración continua en cada pull request: GitHub Actions instala con `npm ci` y corre el lint y las pruebas unitarias, sin secretos y con permisos de solo lectura. Las pruebas unitarias bloquean la red externa, así que ninguna llega a servicios de afuera.
- [FEAT-001b] Registrar un ingreso desde el formulario "Añadir Ingreso": monto validado, fecha de hoy y categoría "Pago Ingresado" preseleccionada. El alta y la actualización del saldo son atómicas en `BASP_AGREGAR_MOVIMIENTO`, que solo acepta categorías de la propia cuenta. La sección Cuenta muestra los movimientos agrupados por fecha y un mensaje de éxito que se cierra a los 3 segundos.
- [FEAT-001c] Elegir la categoría y la fecha del ingreso: el `select` muestra solo categorías de ingreso, con "Pago Ingresado" primero y el resto ordenado sin distinguir mayúsculas ni tildes, y un calendario accesible con teclado (`react-day-picker`) arranca en hoy, no deja elegir días futuros y permite ir hasta 1900. La fecha viaja como día calendario local, sin pasar a UTC.
- [FEAT-001d] Monto del ingreso con máscara y límites: el campo agrupa miles con punto mientras se escribe, rechaza signos, letras y un tercer decimal, conserva el cursor y lee "1500.50" pegado como decimal. Un monto mayor a 999.999.999.999,99 se rechaza en el formulario con un mensaje fijo y en `BASP_AGREGAR_MOVIMIENTO` con 22023 antes del insert, que también rechaza fechas posteriores a mañana en UTC sin modificar la fecha guardada. Montos y saldo nunca pasan por `Number`: 0,10 + 0,20 da exactamente 0,30.

### Changed
- [FIX-001] El mensaje de lista vacía de la sección Cuenta dice "Aquí verás sus movimientos.".
- [FIX-002] El mensaje de lista vacía de la sección Cuenta vuelve a decir "Aquí verá sus movimientos.".
- [FIX-003] Git ignora `.vs/` (Visual Studio) y `coverage/` (`vitest --coverage`).
