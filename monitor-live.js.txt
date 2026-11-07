/* Monitor ECO: adaptador visual para indicadores reales de Sheets.
   No ejecuta escrituras ni pruebas funcionales sobre otras aplicaciones.
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
function apply(data){
 if(!data||data.schema!==1||!Array.isArray(data.sources)||!data.counts)return;
 latest=data;
 var counts=data.counts||{},stale=!!data.stale;
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
 $('warnings').textContent='0';
 $('failures').textContent='0';
 var kpis=document.querySelectorAll('.metrics>.kpi');
 if(kpis.length>=8){
   kpis[2].querySelector('.hint').textContent='Apps verificadas';
   kpis[3].querySelector('.hint').textContent='Apps con advertencia';
   kpis[4].querySelector('.hint').textContent='Apps con falla';
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
   if(status)status.lastChild.textContent=' Sin prueba funcional';
   if(time)time.textContent='Aplicación no instrumentada';
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
 $('ai-title').textContent='IA todavía sin conectar';
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
   openDrawer(data?data.name:'Aplicación ECO','Todavía no hay una comprobación funcional conectada para esta aplicación. Sus relaciones con Sheets son referencias documentales que necesitan cotejarse con el código vigente.','SIN PRUEBA FUNCIONAL');
 },true);
});
var sourceButton=$('sources');
if(sourceButton)sourceButton.addEventListener('click',showSources,true);
window.ecoMonitorCallback=function(data){if(pending){clearTimeout(pending.timeout);pending.script.remove();pending=null;}apply(data);};
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
 var notice=document.querySelector('.notice');
 if(notice)notice.textContent='⚠ '+message+(latest?' Último registro disponible: '+latest.lastCheck:' Se conserva la vista de demostración.');
 if(latest){latest.stale=true;apply(latest);}
}
poll();
setInterval(poll,5*60*1000);
})();
