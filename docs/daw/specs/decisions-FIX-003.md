# Decisiones de FIX-003

Formato: decisión — quién la aprobó — fecha — fase.

- Alcance (a): ignorar `.vs/` y también `coverage/`, no solo `.vs/` — usuario (aceptó la opción recomendada) — 2026-11-12 — CLASSIFY
- La autonomía del ticket es `minimal` — usuario — 2026-11-12 — CLASSIFY
- La referencia local `refs/remotes/origin/HEAD` apuntaba a `origin/feat/FEAT-001b-registrar-ingreso` aunque la rama por defecto de GitHub es `main`; el tope de 10 líneas de QUICK-FIX medía contra esa rama (4344 líneas). Se corrigió con `git remote set-head origin --auto` (solo local, no toca el remoto ni el repositorio) — orquestador (modo minimal) — 2026-11-12 — DEFINE
- La entrada `DEFINE → CODE` del historial dice "commiteado", pero el commit del fix-brief (`3198913`) se hizo inmediatamente después, porque el primer intento fue rechazado por el tope mal medido. El historial no se reescribe — orquestador (modo minimal) — 2026-11-12 — CODE
- Las pruebas del cierre corren solo el proyecto `unidad` más la prueba de regresión con `git check-ignore`; la integración contra Supabase no se repite porque el cambio no toca la app y la suite completa pasó hoy en FEAT-001d — orquestador (modo minimal) — 2026-11-12 — CODE
