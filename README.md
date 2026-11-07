# Monitor ECO — Centro de Monitoreo

Aplicación **independiente** del Ecosistema ECO de Embotelladora de Colima. Prototipo funcional en validación, no versión definitiva.

## Estado de la integración · 6 de noviembre de 2026 (México)

- GitHub Pages: sitio publicado en https://arqlal-byte.github.io/MonitorECO/
- Apps Script: usuario confirmó creación, autorización, prueba manual **7 fuentes correctas, 0 advertencias, 0 errores**, instalación del activador de 5 minutos y creación de despliegue web.
- Integración de front-end: **configurada** en `config.js` con la URL pública `/exec` compartida por el usuario; código del navegador actualizado y comprobado con respuesta simulada.
- **Pendiente de verificación:** primera respuesta real al navegador y visibilidad de siete fuentes en GitHub Pages. No se verificó directamente la respuesta remota de `/exec` desde el entorno de trabajo.
- **Apps ECO (6):** SIN PRUEBA FUNCIONAL, independientemente de los resultados de Sheets. No se han conectado los accesos, transacciones, evidencias ni procesos de las seis aplicaciones.

## Archivos

- `index.html`: presentación animada aprobada.
- `config.js`: URL pública del servicio **de solo lectura**. Nunca poner IDs de Sheets, secretos ni contraseñas.
- `monitor-live.js`: consulta agregados técnicos cada cinco minutos, control de caducidad y representación de estados sin sustituir pruebas funcionales.
- `assets/eco-cocacola-oficial.png`: logotipo oficial previamente proporcionado, copiado íntegramente desde fuente documental ECO. No depende del repositorio EvaluacionECO360.
- `*.txt`: copias completas de los tres archivos de código de la interfaz.

**El backend privado Code.gs no está almacenado en este repositorio público.** Debe mantenerse en el proyecto Apps Script independiente del propietario. Su contenido no puede inferirse del repositorio.

## Medidas de seguridad y límites

Este repositorio y GitHub Pages son públicos. El endpoint también es de acceso público y utiliza JSONP, por lo que solo debe exponer metadatos técnicos aptos para difusión; ninguna celda, respuesta individual, nómina, identificador privado, token ni error interno. No publica operaciones administrativas. El monitoreo de Sheets verifica únicamente acceso, títulos y presencia de pestañas, no datos, guardados ni funcionamiento de aplicaciones.

El visor **nunca debe mostrar semáforos verdes de apps** por el solo hecho de que un Sheet esté disponible. Si el servidor no responde, se muestran estados sin comprobar y no estadísticas ficticias. Los datos se marcan desactualizados después de 15 minutos sin nueva medición.

## Respaldo y cambios

- Rama `respaldo-previo-conexion-appsscript-2026-11-06` en MonitorECO: estado anterior a la conexión.
- Rama `respaldo-monitor-eco-diseno-aprobado-2026-11-06` en EvaluacionECO360: diseño de origen.
- Actualización: URL /exec en `config.js`, lectura real habilitada, estado de espera y errores de comunicación diferenciados, documentación actualizada.
- No se han modificado Apps Script operativos, bases de datos ni archivos del cuestionario de Evaluación 360.
- La carpeta `monitor-eco` que quedó en el repositorio EvaluacionECO360 sigue como copia temporal; cualquier eliminación exige autorización específica.

## Validación pendiente

1. Abrir https://arqlal-byte.github.io/MonitorECO/ con recarga completa.
2. Verificar indicador `DATOS REALES DE SHEETS` y siete fuentes sin alertas; comprobar fecha de última lectura.
3. Comprobar que las seis apps siguen `Sin prueba funcional`.
4. Verificar al menos dos ejecuciones automáticas en Apps Script y que la gráfica usa fechas reales.
5. Confirmación del usuario antes de considerar validada la conexión.
