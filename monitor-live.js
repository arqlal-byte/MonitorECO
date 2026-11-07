/* Monitor ECO: adaptador visual para indicadores reales de Sheets.
   No ejecuta escrituras. Presenta solamente la prueba firmada de consulta ejecutiva del Dashboard; no certifica login, PDF, IA, firmas ni guardados.
   Si config.js no contiene un endpoint, conserva la demostración visual aprobada. */
(function(){
'use strict';
var endpoint=String(window.ECO_MONITOR_ENDPOINT||'').trim();
if(!endpoint)return;
if(!/^https:\/\/script\.google\.com\/macros\/s\/[-_A-Za-z0-9]+\/exec(?:\?.*)?$/.test(endpoint)){
  console.error('Monitor ECO: URL de backend inválida; se conserva la demostración.');
  return;
}
var latest=null, pending=null, lastDrawerFocus=null;
var $=function(x){return document.getElementById(x);};
var esc=function(x){return String(x===undefined?'':x).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});};
var asNum=function(n){var value=Number(n);return isFinite(value)&&value>=0?value:0;};
var stateLabel=function(status){return status==='ok'?'Correcta':status==='warning'?'Advertencia':status==='error'?'Error':'Sin comprobar';};
// Cuando existe un endpoint, NUNCA dejar visibles las cifras ficticias del diseño.
function neutral(message){
 var mode=document.querySelector('.demo-pill');
 if(mode){mode.textContent='● ESPERANDO MEDICIÓN';mode.style.color='#ffd98e';mode.style.borderColor='#b78b3c';}
 var watermark=document.querySelector('.demo-watermark');
 if(watermark){watermark.textContent='CONEXIÓN PENDIENTE · APPS SIN PRUEBA';watermark.style.color='#ffd98e';}
 var notice=document.querySelector('.notice');
 if(notice)notice.textContent='◆ '+(message||'Consultando el servicio de monitoreo de Sheets...');
 $('general-state').textContent='SIN DATOS CONFIRMADOS';
 $('healthy').textContent='0';$('warnings').textContent='—';$('failures').textContent='—';
 var gauge=document.querySelector('.gauge span');if(gauge)gauge.textContent='PEND.';
 var kpis=document.querySelectorAll('.metrics>.kpi');
 if(kpis.length>=8){
   kpis[0].querySelector('.hint').textContent='Esperando comprobación de fuentes';
   kpis[2].querySelector('.hint').textContent='Apps verificadas';
   kpis[3].querySelector('.hint').textContent='Alertas apps sin comprobar';
   kpis[4].querySelector('.hint').textContent='Fallas apps sin comprobar';
   kpis[5].querySelector('.number').textContent='—';
   kpis[5].querySelector('.hint').textContent='Sheets sin datos';
   kpis[6].querySelector('.number').textContent='—';
   kpis[6].querySelector('.hint').textContent='Procesos sin verificar';
   kpis[7].querySelector('.number').textContent='—';
   kpis[7].querySelector('.hint').textContent='Disponibilidad no medida';
 }
 document.querySelectorAll('.appnode').forEach(function(n){
   var dot=n.querySelector('.dot'),status=n.querySelector('.node-status'),time=n.querySelector('.node-time');
   if(dot){dot.classList.remove('warn','error');dot.style.background='#7f9caf';dot.style.boxShadow='none';}
   if(status)status.lastChild.textContent=n.getAttribute('data-app')==='0'?' Sin medición reciente':' Sin prueba funcional';
   if(time)time.textContent=n.getAttribute('data-app')==='0'?'Esperando prueba automática':'Aplicación no instrumentada';
   n.style.borderColor='#256181';
 });
 var sf=document.querySelector('.right-rail .panel .source-wrap');
 if(sf)sf.innerHTML='<p style="padding:10px;color:#bcdaf1">No hay mediciones confirmadas del servicio de Sheets.</p>';
 var sourceAux=document.querySelector('.right-rail .panel .panel-title .aux');if(sourceAux)sourceAux.textContent='SIN RESPUESTA';
 var process=document.querySelector('.process-list');
 if(process)process.innerHTML='<p style="color:#bcdaf1">No se verifican todavía procesos ni disparadores de otras aplicaciones.</p>';
 var activity=document.querySelector('.activity');
 if(activity)activity.innerHTML='<p style="color:#bcdaf1">Sin registros de actividad conectados.</p>';
 var latency=$('latency-list');if(latency)latency.innerHTML='<p style="color:#bcdaf1">Sin tiempos de lectura confirmados.</p>';
 var eventPanel=document.querySelector('.event-content');if(eventPanel)eventPanel.innerHTML='<p style="color:#bcdaf1">Sin muestras válidas.</p>';
 ['line-path','line-shadow'].forEach(function(id){var el=$(id);if(el)el.setAttribute('d','');});
 var points=$('chart-points');if(points)points.innerHTML='';
 var days=$('chart-days');if(days)days.textContent='Esperando revisiones reales';
 var bars=$('incidence-bars');if(bars)bars.innerHTML='';
 var aiTitle=$('ai-title');if(aiTitle)aiTitle.textContent='Analista contextual disponible';
 var aiDesc=$('ai-description');if(aiDesc)aiDesc.textContent='Puedes preguntar por indicadores, pero aún no hay una medición vigente.';
 var daily=document.querySelector('.daily');if(daily)daily.innerHTML='<p style="color:#bcdaf1">Datos de actividad no conectados.</p>';
 var footer=document.querySelector('.footer');
 if(footer)footer.innerHTML='<span>Monitor ECO v1.1 · Conexión con Apps Script configurada; consulta pendiente.</span><strong>NINGUNA APLICACIÓN TIENE PRUEBA FUNCIONAL CONECTADA</strong>';
 var incident=$('incident');if(incident){incident.disabled=true;incident.textContent='Simulación deshabilitada';}
 document.querySelectorAll('[data-range]').forEach(function(b){b.disabled=true;});
}


/* La comprobación del Dashboard es independiente de la revisión de Sheets.
   Solo datos técnicos publicados por el backend privado; nunca credenciales ni resultados. */
function dashboardDiagnostic(data){
 if(!data||!Array.isArray(data.apps))return null;
 var d=data.apps.find(function(a){return a&&a.key==='dashboard';});
 return d&&d.check==='CONSULTA_EJECUTIVA'?d:null;
}
function dashboardFresh(a){
 if(!a||!a.checkedAt)return false;
 var age=Date.now()-Date.parse(a.checkedAt);
 return isFinite(age)&&age>=0&&age<=20*60*1000;
}
function dashboardReason(a){
 if(!a)return 'No hay una medición reciente publicada del Dashboard. Esto no confirma una desconexión ni un error. Hay que comprobar que esté activo el disparador periódico verificarDashboardECO_Ahora en Apps Script del Monitor.';
 if(!dashboardFresh(a))return 'La última comprobación publicada ya no está vigente (fecha: '+new Date(a.checkedAt).toLocaleString('es-MX',{timeZone:'America/Mexico_City'})+'). No es evidencia de que el Dashboard esté desconectado; falta actualizar la medición automática.';
 var text={
  'SIN_CONFIGURACION':'La clave privada todavía no está disponible en las propiedades del proyecto Monitor ECO.',
  'NO_AUTORIZADO':'El Dashboard rechazó la autenticación de la comprobación. Revisa que ambos proyectos tengan exactamente la misma clave privada, sin publicarla.',
  'SIN_RESPUESTA_VALIDA':'El Monitor no obtuvo una respuesta válida del endpoint del Dashboard. Verifica el despliegue /exec y sus registros de ejecución.',
  'CONSULTA_FALLIDA':'El Dashboard recibió la comprobación, pero su consulta ejecutiva reportó un error. Revisa los registros del Apps Script del Dashboard.',
  'CONSULTA_EXITOSA':'La consulta ejecutiva se comprobó correctamente.',
  'CONTROL_OCUPADO':'El servicio estaba ocupado; conviene repetir la comprobación.',
  'SIN_RESPUESTA':'No se recibió resultado comprobable.'
 };
 return text[String(a.code||'')]||'Existe una comprobación pendiente o no concluyente. Código técnico: '+String(a.code||'SIN_CODIGO').replace(/[^A-Z0-9_]/g,'').slice(0,40)+'.';
}
function verifiedDashboard(data){
 var d=dashboardDiagnostic(data);
 return d&&['ok','warning','error'].indexOf(d.status)>=0&&dashboardFresh(d)?d:null;
}
function renderDashboard(data,stale){
 var app=verifiedDashboard(data);
 if(!app){
   var diagnostic=dashboardDiagnostic(data);
   var missing=!diagnostic||!dashboardFresh(diagnostic);
   var node=document.querySelector('.appnode[data-app="0"]');
   if(node){
     var state=node.querySelector('.node-status'),time=node.querySelector('.node-time');
     var dot=node.querySelector('.dot'),tag=node.querySelector('.node-tag');
     if(state&&state.lastChild)state.lastChild.textContent=missing?' Sin medición reciente':' Comprobación pendiente';
     if(time)time.textContent=diagnostic&&diagnostic.checkedAt?
       'Última prueba: '+new Date(diagnostic.checkedAt).toLocaleString('es-MX',{timeZone:'America/Mexico_City',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):
       'Esperando prueba automática';
     if(tag)tag.textContent=missing?'SIN MEDICIÓN':'PENDIENTE';
     if(dot){dot.classList.remove('warn','error');dot.style.background='#7f9caf';dot.style.boxShadow='none';}
     node.style.borderColor='#256181';
   }
   var footer=document.querySelector('.footer strong');
   if(footer)footer.textContent='DASHBOARD: '+(missing?'SIN MEDICIÓN RECIENTE':'COMPROBACIÓN PENDIENTE')+' · 5 APPS SIN PRUEBA';
   var notice=document.querySelector('.notice');
   if(notice&&missing)notice.textContent+=' · Dashboard: sin medición reciente; no significa desconexión.';
   return;
 }
 var statusText=app.status==='ok'?'Consulta ejecutiva correcta':
   app.status==='warning'?'Consulta con advertencia':'Error en consulta ejecutiva';
 var accent=app.status==='ok'?'#43ed80':app.status==='warning'?'#ffcc48':'#ff607a';
 var node=document.querySelector('.appnode[data-app="0"]');
 if(node){
   var dot=node.querySelector('.dot'),state=node.querySelector('.node-status');
   var time=node.querySelector('.node-time'),tag=node.querySelector('.node-tag');
   if(dot){dot.classList.remove('warn','error');dot.style.background=accent;dot.style.boxShadow='none';}
   if(state&&state.lastChild)state.lastChild.textContent=' '+statusText;
   if(time)time.textContent=app.latencyMs==null?'Prueba técnica registrada':
     'Respuesta: '+(asNum(app.latencyMs)/1000).toFixed(1)+' s';
   if(tag)tag.textContent='CONSULTA';
   node.style.borderColor=accent;
 }
 $('healthy').textContent=app.status==='ok'?'1':'0';
 $('warnings').textContent=app.status==='warning'?'1':'0';
 $('failures').textContent=app.status==='error'?'1':'0';
 var kpis=document.querySelectorAll('.metrics>.kpi');
 if(kpis.length>=5){
   var hints=['Apps con consulta comprobada','Apps con consulta en advertencia','Apps con error de consulta'];
   [2,3,4].forEach(function(n,i){var h=kpis[n].querySelector('.hint');if(h)h.textContent=hints[i];});
 }
 if(!stale){
   var pill=document.querySelector('.demo-pill');
   if(pill)pill.textContent='● DATOS REALES · DASHBOARD Y SHEETS';
   var mark=document.querySelector('.demo-watermark');
   if(mark)mark.textContent='SHEETS Y CONSULTA DASHBOARD: REALES · 5 APPS SIN PRUEBA';
 }
 var notice=document.querySelector('.notice');
 if(notice)notice.textContent+=' · Dashboard: '+statusText.toLowerCase();
 var general=$('general-state');
 if(!stale&&general&&general.textContent==='FUENTES SIN ALERTAS'&&app.status!=='ok')
   general.textContent=app.status==='warning'?'DASHBOARD CON ADVERTENCIA':'DASHBOARD CON ERROR';
 var activity=document.querySelector('.activity');
 if(activity)activity.innerHTML+='<div class="activity-row"><span class="dot" style="background:'+accent+';box-shadow:none"></span><span>Dashboard: '+esc(statusText)+
   ' · '+esc(new Date(app.checkedAt).toLocaleString('es-MX',{timeZone:'America/Mexico_City'}))+'</span></div>';
 var aiDesc=$('ai-description');
 if(aiDesc)aiDesc.textContent=app.status==='ok'?
   'Se comprobó la consulta ejecutiva del Dashboard. No incluye autenticación, informes, firmas, IA ni operaciones de guardado.':
   'La consulta ejecutiva del Dashboard registró una incidencia. Esta verificación no determina su causa ni prueba otras funciones.';
 var footer=document.querySelector('.footer');
 if(footer){
   var strong=footer.querySelector('strong');
   if(strong)strong.textContent='DASHBOARD: SOLO CONSULTA EJECUTIVA '+(app.status==='ok'?'CORRECTA':app.status==='warning'?'CON ADVERTENCIA':'CON ERROR')+' · 5 APPS SIN PRUEBA';
 }
}


/* Comprobación independiente de Autoevaluación ECO V2.0.
   Solo valida estructura/catálogo, NUNCA que las respuestas se guarden o que
   una evaluación se complete. El límite de frescura corresponde al backend. */
function autoevalDiagnostic(data){
 if(!data||!Array.isArray(data.apps))return null;
 return data.apps.find(function(a){return a&&a.key==='autoevaluacion'&&a.check==='CONSULTA_ESTRUCTURA';})||null;
}
function autoevalFresh(a){
 if(!a||!a.checkedAt)return false;
 var age=Date.now()-Date.parse(a.checkedAt);
 return isFinite(age)&&age>=0&&age<=20*60*1000&&a.code!=='MEDICION_VENCIDA';
}
function verifiedAutoeval(data){
 var a=autoevalDiagnostic(data);
 return a&&autoevalFresh(a)&&['ok','warning','error'].indexOf(a.status)>=0?a:null;
}
function autoevalReason(a){
 if(!a)return 'Todavía no se ha publicado una comprobación estructural de Autoevaluación. No implica que la aplicación esté desconectada.';
 if(!autoevalFresh(a))return 'La última medición estructural de Autoevaluación está vencida. No demuestra una falla de la aplicación.';
 var reasons={
  SIN_CONFIGURACION:'Falta configurar la clave privada en el proyecto Monitor.',
  SIN_RESPUESTA_VALIDA:'No se obtuvo una respuesta comprobable del diagnóstico de Autoevaluación.',
  LECTURA_NO_DISPONIBLE:'El servicio no pudo completar la consulta estructural.',
  ESTRUCTURA_NO_DISPONIBLE:'No se comprobó completamente la estructura esperada.',
  CONSULTA_ESTRUCTURA_EXITOSA:'La estructura y el catálogo respondieron correctamente.'
 };
 return reasons[String(a.code||'')]||'La comprobación aún no permite determinar el estado de la estructura.';
}
function renderAutoevaluacion(data,stale){
 var app=verifiedAutoeval(data),diagnostic=autoevalDiagnostic(data);
 var d=verifiedDashboard(data);
 var node=document.querySelector('.appnode[data-app="1"]');
 var state=app?(app.status==='ok'?'Estructura comprobada':app.status==='warning'?'Estructura con advertencia':'Error de estructura'):
   diagnostic&&autoevalFresh(diagnostic)?'Comprobación pendiente':'Sin medición reciente';
 var tint=app?(app.status==='ok'?'#43ed80':app.status==='warning'?'#ffcc48':'#ff607a'):'#7f9caf';
 if(node){
  var dot=node.querySelector('.dot'),label=node.querySelector('.node-status'),
      time=node.querySelector('.node-time'),tag=node.querySelector('.node-tag');
  if(dot){dot.classList.remove('warn','error');dot.style.background=tint;dot.style.boxShadow='none';}
  if(label&&label.lastChild)label.lastChild.textContent=' '+state;
  if(time)time.textContent=app&&app.latencyMs!=null?'Lectura: '+(asNum(app.latencyMs)/1000).toFixed(1)+' s':
      diagnostic&&diagnostic.checkedAt?'Última prueba: '+new Date(diagnostic.checkedAt).toLocaleString('es-MX',{timeZone:'America/Mexico_City',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):
      'Esperando prueba técnica';
  if(tag)tag.textContent=app?'ESTRUCTURA':diagnostic?'SIN MEDICIÓN':'PENDIENTE';
  node.style.borderColor=app?tint:'#256181';
 }
 var checked=[d,app].filter(Boolean);
 var ok=checked.filter(function(a){return a.status==='ok';}).length;
 var warnings=checked.filter(function(a){return a.status==='warning';}).length;
 var failures=checked.filter(function(a){return a.status==='error';}).length;
 $('healthy').textContent=String(ok);
 $('warnings').textContent=String(warnings);
 $('failures').textContent=String(failures);
 var others=6-checked.length;
 var footer=document.querySelector('.footer strong');
 if(footer)footer.textContent='DASHBOARD: '+(d?(d.status==='ok'?'CONSULTA CORRECTA':'CON INCIDENCIA'):'SIN MEDICIÓN RECIENTE')+
     ' · AUTOEVALUACIÓN: '+(app?(app.status==='ok'?'ESTRUCTURA CORRECTA':'CON INCIDENCIA'):'SIN MEDICIÓN RECIENTE')+
     ' · '+others+' APPS SIN COMPROBACIÓN VIGENTE';
 var notice=document.querySelector('.notice');
 if(notice)notice.textContent+=' · Autoevaluación: '+(app?state.toLowerCase():'sin medición reciente (no implica desconexión)');
 if(checked.length&&!stale){
  var pill=document.querySelector('.demo-pill');
  if(pill)pill.textContent='● DATOS REALES · SHEETS Y '+checked.length+' APP'+(checked.length>1?'S':'');
  var mark=document.querySelector('.demo-watermark');
  if(mark)mark.textContent='SHEETS Y '+checked.length+' PRUEBA'+(checked.length>1?'S':'')+' TÉCNICA'+(checked.length>1?'S':'')+' · '+others+' APPS SIN PRUEBA';
 }
 var activity=document.querySelector('.activity');
 if(activity&&app)activity.innerHTML+='<div class="activity-row"><span class="dot" style="background:'+tint+';box-shadow:none"></span><span>Autoevaluación: '+esc(state)+
   ' · '+esc(new Date(app.checkedAt).toLocaleString('es-MX',{timeZone:'America/Mexico_City'}))+'</span></div>';
 var aiDesc=$('ai-description');
 if(aiDesc&&app){
   var pre=aiDesc.textContent;
   aiDesc.textContent=pre+' Autoevaluación: '+(app.status==='ok'?
       'se comprobaron estructura y catálogo, no inicio de sesión ni guardado de respuestas.':
       'la consulta estructural registró una incidencia pendiente de revisión.');
 }
}


/* Evaluación 360: verificación firmada de estructura del ciclo activo.
   No acredita captura, guardado, identidad de evaluadores, cálculo nocturno
   ni funcionamiento integral de la aplicación. */
function evaluacion360Diagnostic(data){
 if(!data||!Array.isArray(data.apps))return null;
 return data.apps.find(function(a){return a&&a.key==='evaluacion360'&&a.check==='CONSULTA_ESTRUCTURA';})||null;
}
function evaluacion360Fresh(a){
 if(!a||!a.checkedAt||a.code==='MEDICION_VENCIDA')return false;
 var age=Date.now()-Date.parse(a.checkedAt);
 return isFinite(age)&&age>=0&&age<=20*60*1000;
}
function verifiedEvaluacion360(data){
 var a=evaluacion360Diagnostic(data);
 return a&&evaluacion360Fresh(a)&&['ok','warning','error'].indexOf(a.status)>=0?a:null;
}
function evaluacion360Reason(a){
 if(!a)return 'El Monitor todavía no publica una comprobación estructural de Evaluación 360. Esto no prueba desconexión ni pérdida de datos.';
 if(!evaluacion360Fresh(a))return 'La última revisión estructural de Evaluación 360 está vencida o sin fecha válida. No demuestra una falla del cuestionario.';
 var codes={
  SIN_CONFIGURACION:'Falta configurar la clave privada en el proyecto Monitor ECO.',
  NO_AUTORIZADO:'La comprobación fue rechazada por el servicio de Evaluación 360; revisar la clave privada en ambos proyectos.',
  SIN_RESPUESTA_VALIDA:'El Monitor no recibió una respuesta válida del servicio de Evaluación 360.',
  CONSULTA_FALLIDA:'La revisión estructural de Evaluación 360 reportó un error. Consultar los registros técnicos de esa aplicación.',
  CONSULTA_ESTRUCTURA_EXITOSA:'Las hojas, encabezados y las 60 preguntas del ciclo activo se comprobaron correctamente.'
 };
 return codes[String(a.code||'')]||'La revisión todavía no produjo un estado concluyente; código: '+
   String(a.code||'SIN_CODIGO').replace(/[^A-Z0-9_]/g,'').slice(0,40)+'.';
}
function renderEvaluacion360(data,stale){
 var app=verifiedEvaluacion360(data),diagnostic=evaluacion360Diagnostic(data);
 var node=document.querySelector('.appnode[data-app="2"]');
 var labelText=app?(app.status==='ok'?'Estructura comprobada':app.status==='warning'?'Estructura con advertencia':'Error de estructura'):
   diagnostic&&evaluacion360Fresh(diagnostic)?'Comprobación pendiente':'Sin medición reciente';
 var tint=app?(app.status==='ok'?'#43ed80':app.status==='warning'?'#ffcc48':'#ff607a'):'#7f9caf';
 if(node){
   var dot=node.querySelector('.dot'),state=node.querySelector('.node-status'),
       time=node.querySelector('.node-time'),tag=node.querySelector('.node-tag');
   if(dot){dot.classList.remove('warn','error');dot.style.background=tint;dot.style.boxShadow='none';}
   if(state&&state.lastChild)state.lastChild.textContent=' '+labelText;
   if(time)time.textContent=app&&app.latencyMs!=null?'Lectura: '+(asNum(app.latencyMs)/1000).toFixed(1)+' s':
     diagnostic&&diagnostic.checkedAt?'Última prueba: '+new Date(diagnostic.checkedAt).toLocaleString('es-MX',{timeZone:'America/Mexico_City',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):
     'Esperando prueba técnica';
   if(tag)tag.textContent=app?'ESTRUCTURA':diagnostic?'SIN MEDICIÓN':'PENDIENTE';
   node.style.borderColor=app?tint:'#256181';
 }
 var checked=[verifiedDashboard(data),verifiedAutoeval(data),app].filter(Boolean);
 var ok=checked.filter(function(a){return a.status==='ok';}).length;
 var warnings=checked.filter(function(a){return a.status==='warning';}).length;
 var failures=checked.filter(function(a){return a.status==='error';}).length;
 $('healthy').textContent=String(ok);
 $('warnings').textContent=String(warnings);
 $('failures').textContent=String(failures);
 var kpis=document.querySelectorAll('.metrics>.kpi');
 if(kpis.length>=5){
  var hints=['Aplicaciones con prueba técnica correcta','Aplicaciones con advertencia técnica','Aplicaciones con error técnico'];
  [2,3,4].forEach(function(n,i){var h=kpis[n].querySelector('.hint');if(h)h.textContent=hints[i];});
 }
 var pendingApps=6-checked.length;
 var summary=document.querySelector('.footer strong');
 if(summary)summary.textContent='DASHBOARD: '+(verifiedDashboard(data)?'CONSULTA VIGENTE':'SIN CONSULTA VIGENTE')+
   ' · AUTOEVALUACIÓN: '+(verifiedAutoeval(data)?'PRUEBA VIGENTE':'SIN MEDICIÓN VIGENTE')+
   ' · EVALUACIÓN 360: '+(app?(app.status==='ok'?'ESTRUCTURA CORRECTA':'CON INCIDENCIA'):'SIN MEDICIÓN VIGENTE')+
   ' · '+pendingApps+' APPS SIN PRUEBA VIGENTE';
 var notice=document.querySelector('.notice');
 if(notice)notice.textContent+=' · Evaluación 360: '+(app?labelText.toLowerCase():'sin medición reciente (no implica desconexión)');
 if(checked.length&&!stale){
  var pill=document.querySelector('.demo-pill');
  if(pill)pill.textContent='● DATOS REALES · '+checked.length+' PRUEBAS TÉCNICAS';
  var mark=document.querySelector('.demo-watermark');
  if(mark)mark.textContent='SHEETS + '+checked.length+' PRUEBAS LIMITADAS · '+pendingApps+' APPS SIN PRUEBA VIGENTE';
 }
 var activity=document.querySelector('.activity');
 if(activity&&app)activity.innerHTML+='<div class="activity-row"><span class="dot" style="background:'+tint+';box-shadow:none"></span><span>Evaluación 360: '+
   esc(labelText)+' · '+esc(new Date(app.checkedAt).toLocaleString('es-MX',{timeZone:'America/Mexico_City'}))+'</span></div>';
 var aiDesc=$('ai-description');
 if(aiDesc&&app)aiDesc.textContent+=' Evaluación 360: '+(app.status==='ok'?
   'estructura, encabezados y 60 preguntas revisados; no se prueba el guardado de respuestas ni el cálculo nocturno.':
   'comprobación estructural con incidencia técnica, pendiente de revisar.');
}


/* Servicio de Datos compartido: comprobación independiente.
   La validez del puente, de las funciones y de las nueve fuentes NO equivale
   a una prueba de inicio de sesión, escritura o uso de Centro y Mi Persona. */
function servicioDiagnostic(data){
 if(!data||!Array.isArray(data.services))return null;
 return data.services.find(function(a){return a&&a.key==='servicioDatos'&&a.check==='CONSULTA_ESTRUCTURA';})||null;
}
function servicioFresh(a){
 if(!a||!a.checkedAt||a.code==='MEDICION_VENCIDA')return false;
 var age=Date.now()-Date.parse(a.checkedAt);
 return isFinite(age)&&age>=0&&age<=20*60*1000;
}
function verifiedServicio(data){
 var a=servicioDiagnostic(data);
 return a&&servicioFresh(a)&&['ok','warning','error'].indexOf(a.status)>=0?a:null;
}
/** Prueba individual limitada: no implica login, lectura con sesión ni guardado. */
function verifiedIndividual(data,key){
 if(!data||!Array.isArray(data.apps))return null;
 var a=data.apps.find(function(x){return x&&x.key===key;});
 if(!a||a.check!=='CONSULTA_TECNICA_LIMITADA'||a.code==='MEDICION_VENCIDA'||
    !a.checkedAt||['ok','warning','error'].indexOf(a.status)<0)return null;
 var age=Date.now()-Date.parse(a.checkedAt);
 return isFinite(age)&&age>=0&&age<=20*60*1000?a:null;
}
/** Familia ECO: página HTTP más API pública, sin autenticar ni escribir. */
function verifiedFamilia(data){
 if(!data||!Array.isArray(data.apps))return null;
 var a=data.apps.find(function(x){return x&&x.key==='familia';});
 if(!a||a.check!=='CONSULTA_PUBLICA_FAMILIA'||a.code==='MEDICION_VENCIDA'||
    !a.checkedAt||['ok','warning','error'].indexOf(a.status)<0)return null;
 var age=Date.now()-Date.parse(a.checkedAt);
 return isFinite(age)&&age>=0&&age<=20*60*1000?a:null;
}
function servicioReason(a){
 if(!a)return 'Todavía no se ha publicado una medición del Servicio de Datos en Monitor ECO. No significa que el servicio esté desconectado.';
 if(!servicioFresh(a))return 'La medición del Servicio de Datos ya no está vigente. Esto no demuestra que Centro o Mi Persona estén desconectadas.';
 var reasons={
  CONSULTA_ESTRUCTURA_EXITOSA:'Se comprobaron el puente de comunicación, las funciones esenciales y la estructura de nueve fuentes oficiales.',
  CONSULTA_FALLIDA:'La revisión estructural del servicio reportó una incidencia; consultar los registros de Servicio de Datos ECO.',
  SIN_CONFIGURACION:'Falta configurar la clave privada en Monitor ECO.',
  NO_AUTORIZADO:'La firma privada no fue aceptada. Revisar la configuración de ambos proyectos sin compartir la clave.',
  SIN_RESPUESTA_VALIDA:'No hubo una respuesta verificable desde el despliegue del Servicio de Datos.',
  SOLICITUD_INVALIDA:'La solicitud de revisión no fue aceptada por el servicio.'
 };
 return reasons[String(a.code||'')]||'La comprobación no fue concluyente. Código: '+
   String(a.code||'SIN_CODIGO').replace(/[^A-Z0-9_]/g,'').slice(0,40)+'.';
}
function renderServicioDatos(data){
 var diagnostic=servicioDiagnostic(data),app=verifiedServicio(data);
 var condition=app?(app.status==='ok'?'Estructura comprobada':app.status==='warning'?'Estructura con advertencia':'Incidencia de estructura'):
   diagnostic&&servicioFresh(diagnostic)?'Comprobación pendiente':'Sin medición reciente';
 var tint=app?(app.status==='ok'?'#43ed80':app.status==='warning'?'#ffcc48':'#ff607a'):'#7f9caf';
 var stamp=diagnostic&&diagnostic.checkedAt&&isFinite(Date.parse(diagnostic.checkedAt))?
   new Date(diagnostic.checkedAt).toLocaleString('es-MX',{timeZone:'America/Mexico_City',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):'Sin fecha verificable';
 var process=document.querySelector('.process-list');
 if(process){
   process.innerHTML='<div class="process" style="align-items:flex-start;gap:9px;">'+
     '<i style="color:'+tint+';font-style:normal">'+(app&&app.status==='ok'?'✓':app&&app.status==='error'?'!':'?')+'</i>'+
     '<span style="min-width:0;flex:1"><strong>Servicio de Datos ECO</strong>'+
     '<small style="display:block;color:#bcdaf1;font-size:11px;line-height:1.5">'+esc(condition)+
     ' · Bridge y 9 hojas · '+esc(stamp)+'</small></span></div>'+
     '<div style="font-size:11px;line-height:1.6;color:#b8d2e8;padding-top:7px">'+
     'Dependencias: Centro de Administración y Mi Persona ECO. '+ 
     'El estado del servicio no prueba sus sesiones, operaciones de RH, evidencias ni guardados. '+
     'No se supervisan todavía los disparadores ni procesos nocturnos de otras aplicaciones.</div>';
 }
 [3,4].forEach(function(i){
   var node=document.querySelector('.appnode[data-app="'+i+'"]');
   if(!node)return;
   var dot=node.querySelector('.dot'),status=node.querySelector('.node-status');
   var time=node.querySelector('.node-time'),tag=node.querySelector('.node-tag');
   var individual=verifiedIndividual(data,i===3?'administracion':'persona');
   var accent=individual?(individual.status==='ok'?'#43ed80':individual.status==='warning'?'#ffcc48':'#ff607a'):
     (app?tint:'#7f9caf');
   if(dot){dot.classList.remove('warn','error');dot.style.background=accent;dot.style.boxShadow='none';}
   if(status&&status.lastChild)status.lastChild.textContent=individual?
     (individual.status==='ok'?' Lectura técnica comprobada':individual.status==='warning'?' Lectura con advertencia':' Prueba técnica con error'):
     app?(app.status==='ok'?' Conexión al Servicio de Datos comprobada':' Servicio de Datos con incidencia'):
     ' Servicio de Datos sin medición reciente';
   if(time)time.textContent=individual?'Sesiones y guardados sin probar':'Funciones propias pendientes de verificar';
   if(tag)tag.textContent=individual?'LECTURA PARCIAL':app?(app.status==='ok'?'SERVICIO OK':'SERVICIO ALERTA'):'SIN MEDICIÓN';
   node.style.borderColor=individual?accent:app&&app.status==='ok'?'#267f78':'#256181';
 });
 var footer=document.querySelector('.footer strong');
 var tested=[verifiedDashboard(data),verifiedAutoeval(data),verifiedEvaluacion360(data),
   verifiedIndividual(data,'administracion'),verifiedIndividual(data,'persona')].filter(Boolean);
 var individuals=[verifiedIndividual(data,'administracion'),verifiedIndividual(data,'persona')].filter(Boolean);
 if(individuals.length){
   $('healthy').textContent=String(tested.filter(function(a){return a.status==='ok';}).length);
   $('warnings').textContent=String(tested.filter(function(a){return a.status==='warning';}).length);
   $('failures').textContent=String(tested.filter(function(a){return a.status==='error';}).length);
   var kpis=document.querySelectorAll('.metrics>.kpi');
   if(kpis.length>=5)[2,3,4].forEach(function(n){var h=kpis[n].querySelector('.hint');if(h)h.textContent='Aplicaciones con comprobación técnica limitada';});
   var mode=document.querySelector('.demo-pill');
   if(mode)mode.textContent='● DATOS REALES · '+tested.length+' PRUEBAS TÉCNICAS';
   var mark=document.querySelector('.demo-watermark');
   if(mark)mark.textContent='SHEETS + '+tested.length+' PRUEBAS TÉCNICAS · '+(6-tested.length)+' APPS SIN MEDICIÓN PROPIA';
 }
 if(footer){
   footer.textContent='MONITOREO: '+tested.length+' PRUEBAS TÉCNICAS VIGENTES · '+(6-tested.length)+
     ' APPS SIN PRUEBA PROPIA · SERVICIO COMPARTIDO: '+(app?(app.status==='ok'?'ESTRUCTURA CORRECTA':'CON INCIDENCIA'):'SIN PRUEBA VIGENTE');
 }
 var activity=document.querySelector('.activity');
 if(activity&&app)activity.innerHTML+='<div class="activity-row"><span class="dot" style="background:'+tint+';box-shadow:none"></span><span>Servicio de Datos: '+esc(condition)+
  ' · '+esc(stamp)+' · 2 aplicaciones dependientes</span></div>';
 ['administracion','persona'].forEach(function(key){
   var x=verifiedIndividual(data,key);
   if(activity&&x)activity.innerHTML+='<div class="activity-row"><span class="dot" style="background:'+
     (x.status==='ok'?'#43ed80':x.status==='warning'?'#ffcc48':'#ff607a')+
     ';box-shadow:none"></span><span>'+esc(key==='administracion'?'Centro de Administración':'Mi Persona')+
     ': '+esc(x.status==='ok'?'lectura y control de acceso correctos':'incidencia en prueba parcial')+
     ' · '+esc(new Date(x.checkedAt).toLocaleString('es-MX',{timeZone:'America/Mexico_City'}))+'</span></div>';
 });
 var notice=document.querySelector('.notice');
 if(notice)notice.textContent+=' · Servicio de Datos: '+condition.toLowerCase()+'; las pruebas de Centro y Mi Persona son parciales (sin login ni guardados).';
}

/** El estado de Familia se mide independientemente del Servicio de Datos. */
function renderFamilia(data){
 var app=verifiedFamilia(data);
 var node=document.querySelector('.appnode[data-app="5"]');
 var tint=app?(app.status==='ok'?'#43ed80':app.status==='warning'?'#ffcc48':'#ff607a'):'#7f9caf';
 var condition=app?(app.status==='ok'?'Página y actividades disponibles':
   app.status==='warning'?'Consulta pública con advertencia':'Error en la consulta pública'):
   'Sin medición independiente vigente';
 var stamp=app&&app.checkedAt?new Date(app.checkedAt).toLocaleString('es-MX',{
   timeZone:'America/Mexico_City',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'
 }):'Sin prueba vigente';
 if(node){
   var dot=node.querySelector('.dot'),state=node.querySelector('.node-status');
   var when=node.querySelector('.node-time'),tag=node.querySelector('.node-tag');
   if(dot){dot.classList.remove('warn','error');dot.style.background=tint;dot.style.boxShadow='none';}
   if(state&&state.lastChild)state.lastChild.textContent=' '+condition;
   if(when)when.textContent=app?(app.actividadesCount!=null?
     'Actividades: '+asNum(app.actividadesCount)+' · '+stamp:'Última revisión: '+stamp):
     'Página y API sin comprobar';
   if(tag)tag.textContent=app?(app.status==='ok'?'PÁGINA + API OK':
     app.status==='warning'?'ADVERTENCIA':'ERROR DE PRUEBA'):'SIN MEDICIÓN';
   node.style.borderColor=app?tint:'#256181';
 }
 var process=document.querySelector('.process-list');
 if(process)process.innerHTML+='<div class="process" style="align-items:flex-start;gap:9px;">'+
   '<i style="color:'+tint+';font-style:normal">'+(app&&app.status==='ok'?'✓':app&&app.status==='error'?'!':'?')+'</i>'+
   '<span style="min-width:0;flex:1"><strong>Familia ECO</strong>'+
   '<small style="display:block;color:#bcdaf1;font-size:11px;line-height:1.5">'+
   esc(condition)+' · '+esc(stamp)+'</small></span></div>';
 var activity=document.querySelector('.activity');
 if(activity&&app)activity.innerHTML+='<div class="activity-row"><span class="dot" style="background:'+tint+
   ';box-shadow:none"></span><span>Familia ECO: '+esc(condition)+
   ' · '+esc(stamp)+'</span></div>';
 if(app){
   var measured=[verifiedDashboard(data),verifiedAutoeval(data),verifiedEvaluacion360(data),
     verifiedIndividual(data,'administracion'),verifiedIndividual(data,'persona'),app].filter(Boolean);
   $('healthy').textContent=String(measured.filter(function(x){return x.status==='ok';}).length);
   $('warnings').textContent=String(measured.filter(function(x){return x.status==='warning';}).length);
   $('failures').textContent=String(measured.filter(function(x){return x.status==='error';}).length);
   var labels=document.querySelectorAll('.metrics>.kpi');
   if(labels.length>=5)[2,3,4].forEach(function(i){
     var el=labels[i].querySelector('.hint');
     if(el)el.textContent='Aplicaciones con comprobación técnica limitada';
   });
   var marker=document.querySelector('.demo-watermark');
   if(marker)marker.textContent='SHEETS + '+measured.length+
     ' PRUEBAS TÉCNICAS · '+(6-measured.length)+' APPS SIN MEDICIÓN PROPIA';
   var mode=document.querySelector('.demo-pill');
   if(mode)mode.textContent='● DATOS REALES · '+measured.length+' PRUEBAS TÉCNICAS';
   var footer=document.querySelector('.footer strong');
   if(footer)footer.textContent='MONITOREO: '+measured.length+' PRUEBAS TÉCNICAS VIGENTES · '+
     (6-measured.length)+' APPS SIN PRUEBA PROPIA · FAMILIA: '+condition.toUpperCase();
 }
 var notice=document.querySelector('.notice');
 if(notice)notice.textContent+=' · Familia ECO: '+condition.toLowerCase()+'.';
}

function apply(data){
 if(!data||data.schema!==1||!Array.isArray(data.sources)||!data.counts){neutral('Respuesta del monitor inválida');return;}
 if(!data.connected||!data.lastCheck){latest=null;neutral('Servicio accesible, pero todavía sin una medición registrada');return;}
 latest=data;
 var counts=data.counts||{},lastMs=Date.parse(data.lastCheck);
 var stale=!!data.stale||!isFinite(lastMs)||Date.now()-lastMs>15*60*1000;
 latest.stale=stale;
 var mode=document.querySelector('.demo-pill');
 if(mode){
   mode.textContent=stale?'● DATOS DESACTUALIZADOS':'● DATOS REALES DE SHEETS';
   mode.style.color=stale?'#ffd98e':'#8df1c0';
   mode.style.borderColor=stale?'#b78b3c':'#27be8866';
 }
 var watermark=document.querySelector('.demo-watermark');
 if(watermark){watermark.textContent='SHEETS: REALES · APPS: SIN PRUEBA';watermark.style.color='#d4f8ff';watermark.style.borderColor='#1f80bc';}
 var notice=document.querySelector('.notice');
 if(notice){
   notice.textContent='◆ '+(stale?'Última revisión desactualizada':'Solo lectura de estructura de Sheets')+
     (data.lastCheck?' · '+new Date(data.lastCheck).toLocaleString('es-MX',{timeZone:'America/Mexico_City',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):' · Sin lecturas');
 }
 $('general-state').textContent=stale?'DATOS DESACTUALIZADOS':asNum(counts.error)>0?'FUENTES CON ERRORES':asNum(counts.warning)>0?'FUENTES CON ALERTAS':'FUENTES SIN ALERTAS';
 $('healthy').textContent='0';
 $('warnings').textContent='—';
 $('failures').textContent='—';
 var gauge=document.querySelector('.gauge span');if(gauge)gauge.textContent='SHEETS';
 var kpis=document.querySelectorAll('.metrics>.kpi');
 if(kpis.length>=8){
   kpis[0].querySelector('.hint').textContent='Solo metadatos de Sheets; apps sin prueba';
   kpis[2].querySelector('.hint').textContent='Apps verificadas';
   kpis[3].querySelector('.hint').textContent='Alertas apps sin comprobar';
   kpis[4].querySelector('.hint').textContent='Fallas apps sin comprobar';
   kpis[5].querySelector('.number').textContent=asNum(counts.total);
   kpis[5].querySelector('.hint').textContent='Sheets revisados';
   kpis[6].querySelector('.number').textContent='—';
   kpis[6].querySelector('.hint').textContent='Procesos pendientes';
   kpis[7].querySelector('.number').textContent='—';
   kpis[7].querySelector('.hint').textContent='Disponibilidad sin medir';
 }
 document.querySelectorAll('.appnode').forEach(function(n){
   var dot=n.querySelector('.dot'),status=n.querySelector('.node-status'),time=n.querySelector('.node-time');
   if(dot){dot.classList.remove('warn','error');dot.style.background='#7f9caf';dot.style.boxShadow='none';}
   if(status)status.lastChild.textContent=n.getAttribute('data-app')==='0'?' Sin medición reciente':' Sin prueba funcional';
   if(time)time.textContent=n.getAttribute('data-app')==='0'?'Esperando prueba automática':'Aplicación no instrumentada';
   n.style.borderColor='#256181';
 });
 var sf=document.querySelector('.right-rail .panel .source-wrap');
 if(sf){
   var ok=asNum(counts.ok),warn=asNum(counts.warning),err=asNum(counts.error),total=asNum(counts.total);
   sf.innerHTML='<div class="source-donut" style="border-color:'+(stale?'#7a90aa':err?'#ff607a':warn?'#ffcc48':'#43ed80')+'"><div><strong>'+total+'</strong><span>Sheets leídos</span></div></div>'+
     '<div class="source-counts"><span>● Correctos <b>'+ok+'</b></span><span style="color:#ffdb80">▲ Advertencia <b>'+warn+'</b></span><span style="color:#ff8493">✕ Error <b>'+err+'</b></span>'+
     '<button class="ctrl" id="sources-live" type="button">Ver las '+total+' fuentes</button></div>';
   $('sources-live').addEventListener('click',showSources);
   var title=document.querySelector('.right-rail .panel .panel-title .aux');if(title)title.textContent=stale?'SIN ACTUALIZAR':'SHEETS REALES';
 }
 var process=document.querySelector('.process-list');
 if(process)process.innerHTML='<div style="font-size:12px;line-height:1.7;color:#b8d2e8;padding-top:12px">No se han conectado todavía los disparadores de las aplicaciones ni sus procesos nocturnos. <strong>No se infiere su funcionamiento.</strong></div>';
 var activity=document.querySelector('.activity');
 if(activity)activity.innerHTML='<div class="activity-row"><span class="dot" style="background:#6ad9ff;box-shadow:none"></span><span>Última lectura de metadatos: '+esc(data.lastCheck?new Date(data.lastCheck).toLocaleString('es-MX',{timeZone:'America/Mexico_City'}):'Sin comprobar')+'</span></div><div class="activity-row"><span>La actividad de usuarios y los guardados aún no se supervisan.</span></div>';
 var panelTitles=document.querySelectorAll('.left-rail .panel-title .aux');
 panelTitles.forEach(function(x){x.textContent='REVISIONES REALES';});
 var eventPanel=document.querySelector('.event-content');
 if(eventPanel){
   eventPanel.innerHTML='<div class="donut" style="background:conic-gradient(#38e27b 0 '+(asNum(counts.total)?(100*asNum(counts.ok)/asNum(counts.total)).toFixed(1):0)+'%,#103653 0);"><div class="donut-inner">'+asNum(counts.ok)+'<small>Fuentes OK</small></div></div>'+
   '<div class="event-legend"><div class="legend-row"><i class="legend-dot" style="background:#39e27b"></i>Correctas <b>'+asNum(counts.ok)+'</b></div><div class="legend-row"><i class="legend-dot" style="background:#fbc54e"></i>Advertencias <b>'+asNum(counts.warning)+'</b></div><div class="legend-row"><i class="legend-dot" style="background:#f05b70"></i>Errores <b>'+asNum(counts.error)+'</b></div></div>';
 }
 var latTitle=document.querySelector('.bottom-grid .panel .panel-title');
 if(latTitle)latTitle.firstChild&&latTitle.childNodes.forEach(function(n){if(n.nodeType===3)n.textContent=' Tiempo de lectura de fuentes ';});
 var latency=$('latency-list');
 if(latency){
   latency.innerHTML=data.sources.map(function(s){
     var ms=asNum(s.latencyMs);
     return '<div class="lat-row"><span title="'+esc(s.name)+'">'+esc(s.name.length>24?s.name.substring(0,23)+'…':s.name)+'</span><div class="lat-track"><span style="--w:'+Math.min(100,ms/5000*100).toFixed(1)+'%"></span></div><b>'+(ms/1000).toFixed(1)+' s</b></div>';
   }).join('');
 }
 $('ai-title').textContent='Analista contextual disponible';
 $('ai-description').textContent=asNum(counts.error)>0?'El monitor detectó un problema de acceso o estructura en una fuente. Este resultado es una comprobación automática, no un diagnóstico de IA.':'Se comprobó únicamente el acceso y la estructura de los Sheets. El diagnóstico automático de causas y la IA se incorporarán en una etapa posterior.';
 document.querySelector('.ai-signal').textContent='✦ COMPROBACIONES AUTOMÁTICAS · SIN IA';
 var daily=document.querySelector('.daily');
 if(daily)daily.innerHTML='<p style="font-size:12px;color:#bcdaf1;line-height:1.6">Las evaluaciones, evidencias e informes no se contabilizan aquí hasta comprobar una fuente de actividad segura y vigente.</p>';
 renderHistory(Array.isArray(data.history)?data.history:[],counts);
 var incident=$('incident');if(incident){incident.disabled=true;incident.textContent='Simulación deshabilitada';incident.title='Modo de datos reales';}
 var refresh=$('refresh-live');
 if(!refresh){
   refresh=document.createElement('button');refresh.id='refresh-live';refresh.className='ctrl';refresh.type='button';refresh.textContent='Actualizar lectura';document.querySelector('.controls').appendChild(refresh);
   refresh.addEventListener('click',poll);
 }
 var footer=document.querySelector('.footer');
 if(footer)footer.innerHTML='<span>Monitor ECO v1.1 · Metadatos de Sheets verificados por un proyecto independiente. Última lectura: '+esc(data.lastCheck||'sin datos')+'</span><strong>LAS SEIS APLICACIONES NO TIENEN PRUEBA FUNCIONAL CONECTADA</strong>';
 var diagnostic=dashboardDiagnostic(data);
 if(diagnostic&&diagnostic.status==='unverified'&&dashboardFresh(diagnostic)){
   var dashNode=document.querySelector('.appnode[data-app="0"]');
   if(dashNode){
     var label=dashNode.querySelector('.node-status'),t=dashNode.querySelector('.node-time');
     if(label&&label.lastChild)label.lastChild.textContent=' Comprobación pendiente';
     if(t)t.textContent=String(diagnostic.code||'SIN_CODIGO').slice(0,40).replace(/[^A-Z0-9_]/g,'');
   }
   var info=document.querySelector('.notice');
   if(info)info.textContent+=' · Dashboard: '+dashboardReason(diagnostic);
 }
 renderDashboard(data,stale);
 renderAutoevaluacion(data,stale);
 renderEvaluacion360(data,stale);
 renderServicioDatos(data);
 renderFamilia(data);
}
function renderHistory(history,counts){
 var records=history.slice(-7);
 if(records.length<2){
   var chart=document.querySelector('#stability-chart');
   if(chart){$('line-path').setAttribute('d','');$('line-shadow').setAttribute('d','');$('chart-points').innerHTML='';}
   var labels=$('chart-days');if(labels)labels.textContent='Historial insuficiente: se necesita más de una revisión.';
 }else{
   var points=records.map(function(rec,i){return {x:10+(i/(records.length-1))*278,y:90-75*(asNum(rec.ok)/(asNum(counts.total)||1))};});
   var path=points.map(function(p,i){return(i?'L':'M')+p.x.toFixed(1)+' '+p.y.toFixed(1);}).join(' ');
   $('line-path').setAttribute('d',path);$('line-shadow').setAttribute('d',path);
   $('chart-points').innerHTML=points.map(function(p){return '<circle class="chart-dot" cx="'+p.x+'" cy="'+p.y+'" r="4"/>';}).join('');
   $('chart-days').innerHTML=records.map(function(r){return '<span>'+esc(new Date(r.at).toLocaleTimeString('es-MX',{timeZone:'America/Mexico_City',hour:'2-digit',minute:'2-digit',hour12:false}))+'</span>';}).join('');
 }
 var bars=$('incidence-bars');
 if(bars)bars.innerHTML=records.map(function(r,i){
   var n=asNum(r.error)+asNum(r.warning);
   return '<div class="bar-wrap"><em>'+n+'</em><div class="bar" style="--height:'+Math.max(2,n*20)+'%;animation-delay:'+(i*.05)+'s"></div></div>';
 }).join('');
 var titles=document.querySelectorAll('.left-rail .panel-title');
 if(titles.length>=2){
   titles[0].childNodes.forEach(function(n){if(n.nodeType===3)n.textContent=' Fuentes correctas por revisión ';});
   titles[1].childNodes.forEach(function(n){if(n.nodeType===3)n.textContent=' Alertas por revisión ';});
 }
 document.querySelectorAll('[data-range]').forEach(function(b){b.disabled=true;b.title='Filtros de 24 h / 7 d / 30 d disponibles con historial más extenso';});
}
function openDrawer(title,body,state){
 $('drawer-title').textContent=title;$('drawer-desc').textContent=body;$('drawer-state').textContent=state;
 var note=$('drawer-measure-note'),source=$('drawer-sources');
 var stateText=String(state||'');
 var noMeasure=/SIN MEDICI[ÓO]N|SIN PRUEBA FUNCIONAL|COMPROBACI[ÓO]N PENDIENTE|DATOS DESACTUALIZADOS/i.test(stateText);
 if(note){
   note.hidden=!noMeasure;
   if(noMeasure)note.textContent='Sin una medición vigente de esta comprobación no se puede confirmar su funcionamiento ni una desconexión.';
 }
 if(source)source.textContent=stateText.indexOf('SERVICIO DE DATOS')===0?
   'Fuente: Servicio de Datos ECO · comprobación estructural firmada.':
   stateText.indexOf('CONSULTA TÉCNICA PARCIAL')===0?
   'Fuente: Servicio de Datos ECO · lectura de catálogo y control de acceso, sin sesión real.':
   'Fuente: Mediciones técnicas publicadas por Monitor ECO.';
 $('drawer').hidden=false;$('close-drawer').focus();
}
function showSources(ev){
 if(ev){ev.preventDefault();ev.stopImmediatePropagation();}
 if(!latest)return;
 var body=latest.sources.map(function(s){
   var extra=s.category==='PESTANAS_FALTANTES'?' · Pestañas faltantes: '+s.missingTabs.length:s.category==='SIN_ACCESO_O_ERROR_DE_LECTURA'?' · Falló la lectura':'';
   return '• '+s.name+': '+stateLabel(s.status)+' ('+(asNum(s.latencyMs)/1000).toFixed(1)+' s)'+extra;
 }).join('\n');
 $('drawer-desc').style.whiteSpace='pre-line';openDrawer('Estado real de fuentes',body,latest.stale?'Datos desactualizados':'Comprobación de estructura y acceso, sin leer celdas');
}
document.querySelectorAll('.appnode').forEach(function(node){
 node.addEventListener('click',function(ev){
   if(!latest)return;
   ev.preventDefault();ev.stopImmediatePropagation();
   var i=Number(node.getAttribute('data-app')),app={
     0:'dashboard',1:'autoevaluacion',2:'evaluacion360',3:'administracion',4:'persona',5:'familia'
   }[i];
   var data=latest.apps.find(function(a){return a.key===app;});
   var checked=app==='dashboard'?verifiedDashboard(latest):
     app==='autoevaluacion'?verifiedAutoeval(latest):
     app==='evaluacion360'?verifiedEvaluacion360(latest):
     (app==='administracion'||app==='persona')?verifiedIndividual(latest,app):
     app==='familia'?verifiedFamilia(latest):null;
   if(checked){
     var detail=app==='familia'?
       (checked.status==='ok'?'Se comprobaron por separado la página pública y la API que publica sus actividades.':
        checked.status==='warning'?'La página responde, pero las actividades presentan una advertencia.':
        'La página o la API de actividades presentó un error de consulta.'):
       (app==='administracion'||app==='persona')?
       (checked.status==='ok'?'Se comprobó lectura real del catálogo de actividades, mapeo de campos y rechazo de credenciales sin sesión.':
       checked.status==='warning'?'La prueba técnica parcial presentó advertencia.':
       'La prueba técnica parcial encontró una incidencia. Consultar registros del Servicio de Datos.'):
       app==='dashboard'?
       (checked.status==='ok'?'La consulta ejecutiva respondió correctamente.':
       checked.status==='warning'?'La consulta ejecutiva tiene una advertencia.':'La consulta ejecutiva presentó un error.'):
       app==='evaluacion360'?
       (checked.status==='ok'?'Se comprobó la estructura de las hojas, encabezados y las 60 preguntas del ciclo activo.':
       checked.status==='warning'?'La revisión de estructura de Evaluación 360 registró una advertencia.':
       'La revisión estructural de Evaluación 360 reportó un error.'):
       (checked.status==='ok'?'La estructura y el catálogo de Autoevaluación respondieron correctamente.':
       checked.status==='warning'?'La estructura presenta una advertencia.':'La comprobación estructural reportó un error.');
     detail+='\nÚltima comprobación: '+new Date(checked.checkedAt).toLocaleString('es-MX',{timeZone:'America/Mexico_City'})+'.';
     if(checked.latencyMs!=null)detail+='\nTiempo: '+(asNum(checked.latencyMs)/1000).toFixed(1)+' s.';
     if(app==='familia'){
       detail+='\nCódigo: '+String(checked.code||'SIN_CODIGO').replace(/[^A-Z0-9_]/g,'').slice(0,50)+'.';
       if(checked.actividadesCount!=null)detail+='\nActividades disponibles: '+asNum(checked.actividadesCount)+'.';
       detail+='\nPágina HTTP: '+(checked.paginaHttp==null?'sin respuesta':asNum(checked.paginaHttp))+
         ' · API HTTP: '+(checked.apiHttp==null?'sin respuesta':asNum(checked.apiHttp))+'.';
     }
     detail+=app==='familia'?'\nAlcance: disponibilidad de GitHub Pages y API pública de actividades; no valida imágenes, enlaces individuales, botones ni navegación completa.':
       (app==='administracion'||app==='persona')?'\nAlcance: prueba técnica limitada; NO valida login real, sesiones, consultas con sesión, cambios de RH, confirmación, evidencias ni guardados.':
       app==='dashboard'?'\nAlcance: solo consulta ejecutiva; no incluye login, informes, IA ni guardados.':
       app==='evaluacion360'?'\nAlcance: solo estructura del ciclo activo, diccionario y encabezados. No verifica evaluaciones, guardados ni promedios nocturnos.':
       '\nAlcance: solo estructura de Sheets y catálogo; no incluye acceso de participantes, respuestas ni guardados.';
     $('drawer-desc').style.whiteSpace='pre-line';
     openDrawer(app==='familia'?'Familia ECO':(app==='administracion'||app==='persona')?data.name:app==='dashboard'?'Dashboard Ejecutivo ECO':
       app==='evaluacion360'?'Evaluación 360 ECO':'Autoevaluación ECO V2.0',detail,
       checked.status==='ok'?(app==='familia'?'PÁGINA Y API CORRECTAS':
         (app==='administracion'||app==='persona')?'CONSULTA TÉCNICA PARCIAL CORRECTA':
         app==='dashboard'?'CONSULTA CORRECTA':'ESTRUCTURA CORRECTA'):
       checked.status==='warning'?'ADVERTENCIA':'ERROR DE COMPROBACIÓN');
   }else{
     var diagnostic=app==='dashboard'?dashboardDiagnostic(latest):
       app==='autoevaluacion'?autoevalDiagnostic(latest):
       app==='evaluacion360'?evaluacion360Diagnostic(latest):null;
     var esConsumidor=app==='administracion'||app==='persona';
     var shared=esConsumidor?servicioDiagnostic(latest):null;
     var sharedOk=esConsumidor?verifiedServicio(latest):null;
     var explanation=app==='dashboard'?
       dashboardReason(diagnostic)+'\nLos estados de Sheets no prueban por sí solos que el Dashboard funcione.':
       app==='autoevaluacion'?
       autoevalReason(diagnostic)+'\nEsta prueba no verifica ni modifica las respuestas de los líderes.':
       app==='evaluacion360'?
       evaluacion360Reason(diagnostic)+'\nLa consulta no lee ni modifica evaluaciones individuales.':
       esConsumidor?
       (sharedOk&&sharedOk.status==='ok'?
         'Conexión al Servicio de Datos ECO comprobada.\nFunciones propias pendientes de verificar.\n':
         'Esta aplicación utiliza Servicio de Datos ECO como dependencia compartida.\n')+
       servicioReason(shared)+
       (shared&&shared.checkedAt&&isFinite(Date.parse(shared.checkedAt))?
         '\nÚltima comprobación del servicio: '+new Date(shared.checkedAt).toLocaleString('es-MX',{timeZone:'America/Mexico_City'}):'')+
       (sharedOk&&sharedOk.latencyMs!=null?'\nTiempo de revisión: '+(asNum(sharedOk.latencyMs)/1000).toFixed(1)+' s.':'')+
       '\nAlcance: se comprueban Bridge, funciones esenciales y nueve hojas; NO se comprueban sesiones, acceso real, operaciones de RH, evidencias ni guardados. No se considera la aplicación funcionalmente verificada.':
       app==='familia'?
       'Familia ECO utiliza su propio servicio público. No hay una medición independiente vigente; esto no demuestra que su página esté caída. Ejecutar verificarFamiliaECO_Ahora en Monitor ECO.':
       'Todavía no hay una comprobación funcional vigente conectada para esta aplicación.';
     $('drawer-desc').style.whiteSpace='pre-line';
     openDrawer(data?data.name:'Aplicación ECO',explanation,
       app==='dashboard'?(diagnostic&&dashboardFresh(diagnostic)?'COMPROBACIÓN PENDIENTE':'SIN MEDICIÓN RECIENTE'):
       app==='autoevaluacion'||app==='evaluacion360'?
       (diagnostic&&((app==='autoevaluacion'?autoevalFresh:evaluacion360Fresh)(diagnostic))?'COMPROBACIÓN PENDIENTE':'SIN MEDICIÓN RECIENTE'):
       (app==='administracion'||app==='persona')?
       (sharedOk?
         (sharedOk.status==='ok'?'SERVICIO DE DATOS COMPROBADO · FUNCIONES SIN VERIFICAR':
          'SERVICIO DE DATOS CON INCIDENCIA · FUNCIONES SIN VERIFICAR'):
         'SERVICIO DE DATOS SIN MEDICIÓN · FUNCIONES SIN VERIFICAR'):
       'SIN PRUEBA FUNCIONAL');
   }
 },true);
});
var sourceButton=$('sources');
if(sourceButton)sourceButton.addEventListener('click',showSources,true);
window.ecoMonitorCallback=function(data){if(pending){clearTimeout(pending.timeout);pending.script.remove();pending=null;}window.ECO_MONITOR_PUBLIC_SNAPSHOT=data;apply(data);if(typeof window.ecoMonitorReceiveSnapshot==='function')window.ecoMonitorReceiveSnapshot(data);};
function poll(){
 if(pending){clearTimeout(pending.timeout);pending.script.remove();pending=null;}
 var script=document.createElement('script');
 var sep=endpoint.indexOf('?')>=0?'&':'?';
 script.src=endpoint+sep+'callback=ecoMonitorCallback&t='+Date.now();
 script.async=true;
 script.onerror=function(){handleFailure('No se pudo conectar con el servicio de monitoreo.');};
 var timeout=setTimeout(function(){handleFailure('Tiempo de consulta agotado.');},18000);
 pending={script:script,timeout:timeout};
 document.head.appendChild(script);
}
function handleFailure(message){
 if(pending){clearTimeout(pending.timeout);pending.script.remove();pending=null;}
 if(latest){latest.stale=true;apply(latest);}
 else neutral('⚠ '+message+' Las cifras ilustrativas no se muestran.');
}
neutral('Consultando el servicio de monitoreo de Sheets...');
poll();
setInterval(poll,5*60*1000);
})();
