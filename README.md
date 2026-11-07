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

## Logotipo oficial

El archivo `assets/eco-cocacola-oficial.png` es una copia literal del logotipo oficial que ya constaba en el código documental ECO entregado por el responsable, sin reconstrucción ni edición gráfica. El Monitor utiliza exclusivamente su propia copia, sin depender del repositorio de Evaluación 360.

## Publicación

Activar GitHub Pages en **Settings → Pages**, seleccionando **Deploy from a branch**, **main**, directorio **/(root)**. Verificar la URL en Settings; no presuponer que está activa hasta que el despliegue sea exitoso.

## Respaldo

Diseño anterior y fuente de traslado: rama `respaldo-monitor-eco-diseno-aprobado-2026-11-06` del repositorio anterior. No eliminar el origen hasta verificar la nueva publicación y autorización del responsable.

## Integración

No hay backend desplegado ni fuentes activadas. Integrar conforme al protocolo ECO, sin intervenir Apps Script operativos o Sheets sin autorización de cambios específica.
