# Fix FIX-004: Aclarar en AGENTS.md que date-fns no es dependencia directa

- **Bug**: `AGENTS.md` lista `date-fns` como librería del proyecto ("react-day-picker + date-fns"), pero no está en `package.json`: llega como dependencia de `react-day-picker` y el código no la importa, así que quien lea el Stack puede intentar importarla o agregarla sin necesidad.
- **Change**: `AGENTS.md`:9 — reemplazar "react-day-picker + date-fns (calendario)" por "react-day-picker (calendario; trae date-fns como dependencia propia, el código no la importa)".
- **Regression test**: `grep -n 'date-fns' AGENTS.md` muestra antes "react-day-picker + date-fns (calendario)" y después la aclaración; `npm ls date-fns` sigue mostrando `date-fns` solo debajo de `react-day-picker`; `npm test` y `npm run lint` siguen en verde.
- **Risk**: ninguno; es una línea de documentación y no cambia código, dependencias ni configuración.
