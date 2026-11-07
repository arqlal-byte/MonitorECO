# Monitor ECO — Centro de Monitoreo

Aplicación independiente del Ecosistema ECO (Embotelladora de Colima).

**Estado:** prototipo visual animado aprobado. No hay monitoreo real conectado; los números visibles son ilustrativos. No confundir un diseño demostrativo con el estado comprobado de las aplicaciones.

## Componentes

- `index.html`: portada animada y semáforos, paneles, gráficas, 6 aplicaciones.
- `monitor-live.js`: adaptador para datos técnicos agregados, de solo lectura; sin acciones administrativas.
- `config.js`: punto de conexión del backend. Actualmente vacío para conservar modo de demostración.
- `index.html.txt`, `monitor-live.js.txt`, `config.js.txt`: archivos completos para descargar.
- Un futuro Apps Script **independiente** realizará las comprobaciones de las fuentes con permisos adecuados.

## Alcance y seguridad

GitHub Pages es público: ninguna credencial, dato personal, información privada ni IDs internos de Sheets deben guardarse aquí. Todas las operaciones administrativas futuras requieren un entorno privado distinto. Las 6 aplicaciones no tienen pruebas funcionales conectadas.

## Logo oficial — pendiente de independizar

Temporalmente se muestra el logotipo oficial **sin alterarlo** desde
`https://arqlal-byte.github.io/EvaluacionECO360/assets/eco-cocacola-oficial.png`.
El recurso aún está alojado en el repositorio `EvaluacionECO360`. Para la independencia completa, copiar el archivo binario oficial a `assets/eco-cocacola-oficial.png` en este repositorio y modificar la referencia en `index.html` a la ruta local. No sustituirlo con texto, dibujos ni reconstrucciones.

## Publicación

Activar GitHub Pages en **Settings → Pages**, seleccionando **Deploy from a branch**, **main**, directorio **/(root)**. Verificar la URL en Settings; no presuponer que está activa hasta que el despliegue sea exitoso.

## Respaldo

Diseño anterior y fuente de traslado: rama `respaldo-monitor-eco-diseno-aprobado-2026-11-06` del repositorio anterior. No eliminar el origen hasta verificar la nueva publicación y autorización del responsable.

## Integración

No hay backend desplegado ni fuentes activadas. Integrar conforme al protocolo ECO, sin intervenir Apps Script operativos o Sheets sin autorización de cambios específica.
