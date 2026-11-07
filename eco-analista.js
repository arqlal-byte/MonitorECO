/* Analista contextual Monitor ECO · 2026-11-07.
   Solo razona sobre el estado PUBLICO recibido en el tablero.
   No es IA generativa ni consume API. No se registran preguntas.
   No consulta otros sistemas ni ejecuta escrituras. */
(function(){
'use strict';
var box=document.getElementById('eco-chat-panel'),open=document.getElementById('eco-chat-open'),
    close=document.getElementById('eco-chat-close'),form=document.getElementById('eco-chat-form'),
    input=document.getElementById('eco-chat-input'),messages=document.getElementById('eco-chat-messages'),
    stamp=document.getElementById('eco-chat-stamp'),
    welcome=document.getElementById('eco-assistant-welcome'),
    hero=document.getElementById('assistant-hero');
if(!box||!open||!close||!form||!input||!messages)return;
var snapshot=window.ECO_MONITOR_PUBLIC_SNAPSHOT||null;
var focusBefore=null;
var apps=[
 {key:'evaluacion360',name:'Evaluación 360 ECO',terms:['evaluacion 360','360','evaluacion 2027']},
 {key:'autoevaluacion',name:'Autoevaluación ECO',terms:['autoevaluacion','autoevaluaciones']},
 {key:'dashboard',name:'Dashboard Ejecutivo ECO',terms:['dashboard','ejecutivo']},
 {key:'administracion',name:'Centro de Administración ECO',terms:['administracion','administrador','centro eco']},
 {key:'persona',name:'Mi Persona ECO',terms:['mi persona','persona eco']},
 {key:'familia',name:'Familia ECO',terms:['familia','familiares']}
];
function norm(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
function includesAny(s,arr){return arr.some(function(x){return s.indexOf(x)!==-1;});}
function datetime(iso){
 var d=new Date(iso||'');
 return isFinite(d.getTime())?d.toLocaleString('es-MX',{timeZone:'America/Mexico_City',day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):'sin fecha verificable';
}
function isFresh(){
 if(!snapshot||!snapshot.connected||!snapshot.lastCheck)return false;
 var age=Date.now()-Date.parse(snapshot.lastCheck);
 return !snapshot.stale&&isFinite(age)&&age>=0&&age<=15*60*1000;
}
function allSources(){return snapshot&&Array.isArray(snapshot.sources)?snapshot.sources:[];}
function allApps(){return snapshot&&Array.isArray(snapshot.apps)?snapshot.apps:[];}
function oneApp(key){return allApps().find(function(x){return x&&x.key===key;})||null;}
function isDashboardFresh(a){
 if(!a||a.check!=='CONSULTA_EJECUTIVA')return false;
 var ms=Date.now()-Date.parse(a.checkedAt||'');
 return isFinite(ms)&&ms>=0&&ms<=20*60*1000;
}
function isAutoevalFresh(a){
 if(!a||a.check!=='CONSULTA_ESTRUCTURA'||a.code==='MEDICION_VENCIDA')return false;
 var ms=Date.now()-Date.parse(a.checkedAt||'');
 return isFinite(ms)&&ms>=0&&ms<=20*60*1000;
}
function isEvaluacion360Fresh(a){
 if(!a||a.check!=='CONSULTA_ESTRUCTURA'||a.code==='MEDICION_VENCIDA')return false;
 var age=Date.now()-Date.parse(a.checkedAt||'');
 return isFinite(age)&&age>=0&&age<=20*60*1000;
}
function allServices(){return snapshot&&Array.isArray(snapshot.services)?snapshot.services:[];}
function servicioDatos(){return allServices().find(function(x){return x&&x.key==='servicioDatos'&&x.check==='CONSULTA_ESTRUCTURA';})||null;}
function servicioFresh(a){
 if(!a||a.code==='MEDICION_VENCIDA'||!a.checkedAt)return false;
 var ms=Date.now()-Date.parse(a.checkedAt);
 return isFinite(ms)&&ms>=0&&ms<=20*60*1000;
}
function individualFresh(a){
 if(!a||a.check!=='CONSULTA_TECNICA_LIMITADA'||a.code==='MEDICION_VENCIDA'||!a.checkedAt)return false;
 var ms=Date.now()-Date.parse(a.checkedAt);
 return isFinite(ms)&&ms>=0&&ms<=20*60*1000&&['ok','warning','error'].indexOf(a.status)>=0;
}
function individualStatus(key){
 var a=oneApp(key);
 return individualFresh(a)?health(a)+' (lectura técnica parcial; sin sesión real ni guardado)':
   'sin comprobación técnica individual vigente';
}
function familiaFresh(a){
 if(!a||a.check!=='CONSULTA_PUBLICA_FAMILIA'||a.code==='MEDICION_VENCIDA'||!a.checkedAt)return false;
 var age=Date.now()-Date.parse(a.checkedAt);
 return isFinite(age)&&age>=0&&age<=20*60*1000&&['ok','warning','error'].indexOf(a.status)>=0;
}
function familiaStatus(){
 var a=oneApp('familia');
 if(!familiaFresh(a))return 'sin comprobación pública vigente';
 var what=a.status==='ok'?'página y API disponibles':
   a.status==='warning'?'consulta pública con advertencia':'consulta pública con error';
 return what+' (código '+String(a.code||'SIN_CODIGO').slice(0,45)+')';
}
function servicioStatus(){
 var a=servicioDatos();
 if(!a||!servicioFresh(a))return 'sin medición reciente (no implica que esté desconectado)';
 if(a.status==='ok')return 'estructura comprobada (Bridge, funciones esenciales y nueve hojas)';
 if(a.status==='error')return 'incidencia en la verificación estructural (revisar los registros técnicos)';
 return 'comprobación no concluyente (revisar las claves privadas y los registros)';
}
function answerService(){
 var a=servicioDatos();
 var r='Servicio de Datos ECO: '+servicioStatus()+'.';
 if(a&&servicioFresh(a)&&a.status==='ok')r+=' Última revisión: '+datetime(a.checkedAt)+'.';
 return r+' Lo comparten Centro de Administración y Mi Persona ECO. La comprobación no prueba accesos, sesiones, permisos, evidencias, operaciones administrativas ni guardados. Familia ECO usa otro servicio independiente.';
}
function health(a){return a.status==='ok'?'correcta':a.status==='warning'?'con advertencia':a.status==='error'?'con error':'sin comprobar';}
function reason(code){
 var known={
  'SIN_CONFIGURACION':'Falta una clave privada válida en las propiedades de Monitor ECO.',
  'NO_AUTORIZADO':'El Dashboard rechazó la comprobación firmada. Hay que verificar la configuración privada en ambos proyectos.',
  'SIN_RESPUESTA_VALIDA':'El Monitor no recibió una respuesta válida del Dashboard. Hay que revisar el despliegue y los registros del servicio.',
  'CONSULTA_FALLIDA':'La consulta ejecutiva del Dashboard falló. Hay que revisar los registros de ejecución para conocer la causa.',
  'CONSULTA_EXITOSA':'La consulta ejecutiva respondió correctamente.',
  'CONTROL_OCUPADO':'La comprobación no pudo ejecutarse porque el servicio estaba ocupado.'
 };
 return known[code]||'No hay un motivo técnico suficiente publicado para establecer la causa.';
}
function noMeasure(){
 return 'No tengo una medición vigente del Monitor ECO. '+(snapshot&&snapshot.lastCheck?
  'La última revisión registrada fue '+datetime(snapshot.lastCheck)+'.':'Aún no hay un estado válido publicado.')+
  ' No sería correcto afirmar que las aplicaciones están funcionando o fallando.';
}
function answerApp(def){
 if(def.key!=='dashboard'&&def.key!=='autoevaluacion'&&def.key!=='evaluacion360'&&def.key!=='administracion'&&def.key!=='persona'&&def.key!=='familia'&&!isFresh())return noMeasure();
 var a=oneApp(def.key);
 if(def.key==='autoevaluacion'){
   if(!isAutoevalFresh(a))
     return 'Autoevaluación ECO V2.0 no tiene una medición estructural reciente. Esto no implica que esté desconectada ni que se hayan perdido respuestas. La revisión automática se programa cada 15 minutos.';
   if(a.status==='unverified')
     return 'La comprobación estructural de Autoevaluación no fue concluyente. Código técnico: '+String(a.code||'SIN_CODIGO').slice(0,40)+'. No confirma falla del cuestionario.';
   var out='Autoevaluación ECO V2.0: comprobación de estructura y catálogo '+health(a)+'. Última revisión: '+datetime(a.checkedAt)+'.';
   if(a.latencyMs!=null)out+=' Lectura: '+(Number(a.latencyMs)/1000).toFixed(1)+' segundos.';
   return out+' Esta prueba no verifica inicio de sesión, captura ni guardado de respuestas.';
 }
 if(def.key==='evaluacion360'){
   if(!isEvaluacion360Fresh(a))
     return 'Evaluación 360 no tiene una comprobación estructural reciente. No significa desconexión ni pérdida de evaluaciones. Revisión automática prevista cada 15 minutos.';
   if(a.status==='unverified')
     return 'La comprobación estructural de Evaluación 360 no fue concluyente. Código: '+String(a.code||'SIN_CODIGO').slice(0,40)+'. No demuestra una falla del cuestionario.';
   var msg='Evaluación 360 ECO: estructura, encabezados y 60 preguntas del ciclo activo '+health(a)+'. Última revisión: '+datetime(a.checkedAt)+'.';
   if(a.latencyMs!=null&&Number.isFinite(Number(a.latencyMs)))msg+=' Tiempo: '+(Number(a.latencyMs)/1000).toFixed(1)+' segundos.';
   return msg+' La revisión no comprueba acceso de evaluadores, guardado de respuestas ni cálculos nocturnos.';
 }
 if(def.key==='administracion'||def.key==='persona'){
   if(individualFresh(a))return def.name+': '+individualStatus(def.key)+
     '. Última comprobación: '+datetime(a.checkedAt)+'. Código: '+String(a.code||'SIN_CODIGO')+
     '. El monitor comprueba un mapeo de actividad real y el rechazo de un token inválido. No prueba login real, consultas autenticadas, operaciones de RH, evidencias ni guardados.';
   return def.name+': todavía no tiene una prueba técnica individual vigente. '+answerService()+
     ' La conexión compartida por sí sola no prueba que esta aplicación permita iniciar sesión ni guardar información.';
 }
 if(def.key==='familia'){
   if(!familiaFresh(a))return 'Familia ECO: sin medición independiente vigente. No es prueba de desconexión. La comprobación debe consultar la página GitHub y su API de actividades.';
   var msg='Familia ECO: '+familiaStatus()+'. Última revisión: '+datetime(a.checkedAt)+'.';
   if(a.actividadesCount!=null)msg+=' Actividades vigentes recibidas: '+Number(a.actividadesCount)+'.';
   return msg+' Se prueba la respuesta de página y API, no imágenes, botones, enlaces ni navegación completa.';
 }
 if(def.key!=='dashboard')
   return def.name+' todavía no tiene una prueba funcional conectada al Monitor ECO. '+
     'Por eso no puedo confirmar si funciona o si tiene alguna falla. '+
     (a&&Array.isArray(a.sourceWarningKeys)&&a.sourceWarningKeys.length?
      'Hay alertas en fuentes relacionadas: '+a.sourceWarningKeys.join(', ')+'. Esto no demuestra que la app esté fallando.':
      'El estado de sus fuentes de Sheets, si se revisan, no sustituye una prueba de la aplicación.');
 if(!isDashboardFresh(a))
   return 'El Dashboard Ejecutivo ECO no tiene una medición reciente de su consulta ejecutiva. '+
     'Esto NO significa que esté desconectado: la comprobación anterior puede haber vencido. '+
     'Recomendación: revisar el disparador periódico verificarDashboardECO_Ahora en Monitor ECO.';
 if(a.status==='unverified')
   return 'La comprobación del Dashboard sigue pendiente o sin autorización. '+
     reason(a.code)+
     ' No hay datos para asegurar que el Dashboard esté caído.';
 var result='La consulta ejecutiva del Dashboard está '+health(a)+'. '+
   'Última comprobación: '+datetime(a.checkedAt)+'.';
 if(a.latencyMs!=null&&Number.isFinite(Number(a.latencyMs)))
   result+=' Tiempo medido: '+(Number(a.latencyMs)/1000).toFixed(1)+' segundos.';
 result+=' Esto no acredita el acceso de usuarios, informes, firmas, IA ni guardados.';
 if(a.status!=='ok')result+=' Siguiente paso: '+reason(a.code);
 return result;
}
function overview(){
 if(!isFresh())return noMeasure();
 var c=snapshot.counts||{},a=oneApp('dashboard');
 var dashboard=isDashboardFresh(a)?(a.status==='unverified'?'comprobación pendiente':health(a)):'sin comprobación vigente';
 var r='Revisión del '+datetime(snapshot.lastCheck)+'.\n'+
 'Fuentes de Sheets: '+Number(c.ok||0)+' correctas, '+Number(c.warning||0)+' con advertencia y '+Number(c.error||0)+' con error, de '+Number(c.total||0)+' revisadas.\n'+
 'Dashboard Ejecutivo ECO: '+dashboard+'.\n'+
 'Autoevaluación ECO V2.0: '+(isAutoevalFresh(oneApp('autoevaluacion'))?health(oneApp('autoevaluacion'))+' (solo estructura y catálogo)':'sin medición estructural reciente')+'.\n'+
 'Evaluación 360 ECO: '+(isEvaluacion360Fresh(oneApp('evaluacion360'))?health(oneApp('evaluacion360'))+' (solo estructura y preguntas)':'sin medición estructural reciente')+'.\n'+
 'Servicio de Datos ECO: '+servicioStatus()+'.\n'+
 'Centro de Administración ECO: '+individualStatus('administracion')+'.\n'+
 'Mi Persona ECO: '+individualStatus('persona')+'.\n'+
 'Familia ECO: '+familiaStatus()+'.';
 var alerts=allSources().filter(function(x){return x.status==='error'||x.status==='warning';});
 if(alerts.length)r+='\nFuentes con alertas: '+alerts.map(function(x){return x.name+' ('+health(x)+')';}).join('; ')+'.';
 return r;
}
function advise(s){
 if(s.category==='PESTANAS_FALTANTES')return 'Verificar nombres y existencia de pestañas contra el código, sin renombrar hojas hasta evaluar dependencias.';
 if(s.category==='TITULO_MODIFICADO')return 'Comparar el título del archivo con la configuración del Monitor.';
 if(s.category==='LECTURA_LENTA')return 'Revisar si el tiempo de lectura elevado se repite antes de intervenir.';
 if(s.category==='SIN_ACCESO_O_ERROR_DE_LECTURA')return 'Consultar los registros del Apps Script Monitor ECO y permisos vigentes. No cambiar permisos sin autorización.';
 return 'Consultar registros y repetir una medición antes de modificar la fuente.';
}
function anomaly(){
 if(!isFresh())return noMeasure();
 var alerts=allSources().filter(function(x){return x.status==='warning'||x.status==='error';});
 var dash=oneApp('dashboard'),auto=oneApp('autoevaluacion'),eval360=oneApp('evaluacion360');
 var service=servicioDatos(),out=[];
 if(isDashboardFresh(dash)&&dash.status!=='ok')
   out.push('Dashboard: '+health(dash)+'. '+reason(dash.code));
 if(isAutoevalFresh(auto)&&auto.status!=='ok')
   out.push('Autoevaluación: revisión estructural '+health(auto)+'. Código: '+String(auto.code||'SIN_CODIGO').slice(0,40)+'.');
 if(isEvaluacion360Fresh(eval360)&&eval360.status!=='ok')
   out.push('Evaluación 360: revisión estructural '+health(eval360)+'. Código: '+String(eval360.code||'SIN_CODIGO').slice(0,40)+'.');
 if(servicioFresh(service)&&service.status!=='ok')
   out.push('Servicio de Datos: '+servicioStatus()+'. Centro y Mi Persona dependen de este servicio, pero la prueba no determina el estado funcional de esas aplicaciones.');
 ['administracion','persona'].forEach(function(key){
   var app=oneApp(key);
   if(individualFresh(app)&&app.status!=='ok')
     out.push((key==='administracion'?'Centro':'Mi Persona')+': comprobación parcial '+health(app)+
       '. Código: '+String(app.code||'SIN_CODIGO').slice(0,40)+'.');
 });
 var familia=oneApp('familia');
 if(familiaFresh(familia)&&familia.status!=='ok')
   out.push('Familia ECO: '+familiaStatus()+'.');
 alerts.forEach(function(x){out.push(x.name+': '+health(x)+'. '+advise(x));});
 if(!out.length)return 'No se detectan alertas entre las comprobaciones vigentes. Dashboard: consulta ejecutiva; Autoevaluación y Evaluación 360: estructura; Servicio de Datos: '+servicioStatus()+'. Centro: '+individualStatus('administracion')+'. Mi Persona: '+individualStatus('persona')+'. Familia: '+familiaStatus()+'. Ninguna comprobación garantiza el funcionamiento integral.';
 return 'Anomalías que el Monitor sí registra:\n'+out.join('\n')+
   '\nSon comprobaciones técnicas, no una causa raíz confirmada.';
}
function explainSources(){
 if(!isFresh())return noMeasure();
 var c=allSources(),alerts=c.filter(function(x){return x.status==='error'||x.status==='warning';});
 var base='El monitor revisa el acceso y la estructura de '+c.length+' fuentes de Google Sheets. No lee evaluaciones personales ni demuestra que las aplicaciones estén operativas.';
 if(alerts.length)base+='\nCon alertas: '+alerts.map(function(x){return x.name+' ('+health(x)+')';}).join('; ')+'.';
 else base+='\nNo se muestran alertas en esas fuentes.';
 return base;
}
function history(){
 if(!isFresh())return noMeasure();
 var h=snapshot&&Array.isArray(snapshot.history)?snapshot.history:[];
 if(!h.length)return 'Todavía no existe historial de revisiones publicado.';
 var recent=h.slice(-5);
 return 'Últimas '+recent.length+' comprobaciones de fuentes (no de funciones de las aplicaciones):\n'+
   recent.map(function(r){return datetime(r.at)+': '+Number(r.ok||0)+' correctas, '+Number(r.warning||0)+' advertencias, '+Number(r.error||0)+' errores.';}).join('\n');
}
function sourceByQuestion(q){
 var matches=allSources().filter(function(x){
  var name=norm(x.name);
  if(q.indexOf(name)!==-1)return true;
  var special=[
    ['catalogo','catalogo'],['plan de desarrollo','plan'],['resultados evaluaciones','resultados'],
    ['base evaluacion','basecolaboradores'],['seguridad','seguridad']
  ];
  return special.some(function(row){return q.indexOf(row[0])!==-1&&x.key===row[1];});
 });
 return matches.length===1?matches[0]:null;
}
function reply(question){
 var q=norm(question).trim();
 if(!q)return 'Escribe una pregunta sobre los indicadores visibles del Monitor ECO.';
 if(includesAny(q,['que puedes hacer','eres ia','inteligencia artificial','chatgpt']))
   return 'Soy un analista contextual de Monitor ECO. Interpreto los estados y mediciones públicos del tablero, con reglas verificables. No soy IA generativa, no consulto sistemas privados y no invento datos faltantes.';
 if(includesAny(q,['servicio de datos','servicio eco','bridge','puente de datos','servicio compartido']))return answerService();
 var def=apps.find(function(x){return includesAny(q,x.terms);});
 if(def)return answerApp(def);
 if(includesAny(q,['anomalia','alerta','falla','error','problema','que hago','recomiend','sugier','que revisar']))
   return anomaly();
 if(includesAny(q,['historial','anteriores','tendencia','ultimas revisiones']))return history();
 if(includesAny(q,['sheets','fuentes','hojas','estructura']))return explainSources();
 var s=sourceByQuestion(q);
 if(s){
  if(!isFresh())return noMeasure();
  return s.name+': '+health(s)+'. La última lectura de estructura tomó '+(Number(s.latencyMs||0)/1000).toFixed(1)+
   ' segundos. '+(s.status==='ok'?'No se detectó problema estructural; esto no verifica las funciones de las apps.':advise(s));
 }
 if(includesAny(q,['resumen','estado general','como esta','como va','que muestra','funcionando','todo bien','estado de las apps']))return overview();
 if(includesAny(q,['conectadas','sin conectar','no conectadas']))
   return 'El Monitor comprueba Dashboard (consulta ejecutiva), Autoevaluación y Evaluación 360 (estructura), Servicio de Datos (Bridge), Centro: '+individualStatus('administracion')+' y Mi Persona: '+individualStatus('persona')+'. Familia: '+familiaStatus()+'. No se prueban logins reales ni guardados.';
 return 'Ese dato no aparece entre las mediciones disponibles del Monitor ECO. Solo puedo explicar las fuentes de Sheets, Dashboard, Autoevaluación, Evaluación 360, Servicio de Datos compartido, sus dependencias y el historial. No puedo atribuir causas sin registros.';
}
/** Bienvenida basada exclusivamente en mediciones técnicas recientes, no en supuesta IA autónoma. */
function welcomeState(){
 if(!snapshot)return {level:'pending',
   message:'Estoy atento, cumpliendo mi trabajo. Estoy consultando las mediciones. ¿En qué puedo ayudarte?'};
 if(!isFresh())return {level:'pending',
   message:'Estoy atento, cumpliendo mi trabajo. No cuento todavía con mediciones vigentes. ¿En qué puedo ayudarte?'};
 var c=snapshot.counts||{};
 var checks=[
   {key:'dashboard',valid:isDashboardFresh},
   {key:'autoevaluacion',valid:isAutoevalFresh},
   {key:'evaluacion360',valid:isEvaluacion360Fresh},
   {key:'administracion',valid:individualFresh},
   {key:'persona',valid:individualFresh},
   {key:'familia',valid:familiaFresh}
 ];
 var measured=checks.map(function(check){
   var a=oneApp(check.key);
   return check.valid(a)?a:null;
 });
 var service=servicioDatos(),serviceIsFresh=servicioFresh(service);
 var countErrors=Number(c.error||0),countWarnings=Number(c.warning||0);
 if(countErrors>0||measured.some(function(a){return a&&a.status==='error';})||
     (serviceIsFresh&&service.status==='error'))
   return {level:'error',message:'Estoy atento, cumpliendo mi trabajo. Detecté una incidencia en las comprobaciones técnicas. ¿Quieres que la revisemos?'};
 if(countWarnings>0||measured.some(function(a){return a&&a.status==='warning';})||
     (serviceIsFresh&&service.status==='warning'))
   return {level:'warning',message:'Estoy atento, cumpliendo mi trabajo. Hay una advertencia que conviene revisar. ¿En qué puedo ayudarte?'};
 if(Number(c.total)>0&&measured.length===6&&measured.every(function(a){return a&&a.status==='ok';})&&
     serviceIsFresh&&service.status==='ok'&&countErrors===0&&countWarnings===0)
   return {level:'ok',message:'Estoy atento, cumpliendo mi trabajo. Por ahora parece que todo está bien. ¿En qué puedo ayudarte?'};
 return {level:'pending',message:'Estoy atento, cumpliendo mi trabajo. Algunas comprobaciones están pendientes o sin datos recientes. ¿En qué puedo ayudarte?'};
}
function updateWelcome(){
 var state=welcomeState();
 if(welcome&&welcome.textContent!==state.message)welcome.textContent=state.message;
 if(hero)hero.setAttribute('data-status',state.level);
 return state;
}
function add(text,kind){
 var msg=document.createElement('div');
 msg.className='eco-chat-message eco-chat-'+kind;
 msg.textContent=String(text||'');
 messages.appendChild(msg);
 messages.scrollTop=messages.scrollHeight;
}
function send(question){
 var q=String(question||'').trim().slice(0,500);
 if(!q)return;
 add(q,'question');
 add(reply(q),'answer');
 input.value='';
}
function openPanel(){
 focusBefore=document.activeElement;
 box.hidden=false;
 document.body.classList.add('eco-chat-visible');
 if(!messages.children.length){
   add(updateWelcome().message,'answer');
   add('Puedo explicar las mediciones técnicas del tablero, pero no comprobar funciones que el Monitor aún no supervisa.','answer');
 }
 input.focus();
}
function closePanel(){
 box.hidden=true;
 document.body.classList.remove('eco-chat-visible');
 if(focusBefore&&typeof focusBefore.focus==='function')focusBefore.focus();
}
open.addEventListener('click',openPanel);
close.addEventListener('click',closePanel);
box.addEventListener('click',function(e){if(e.target===box)closePanel();});
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!box.hidden)closePanel();});
form.addEventListener('submit',function(e){e.preventDefault();send(input.value);});
document.querySelectorAll('[data-eco-chat-ask]').forEach(function(b){
 b.addEventListener('click',function(){send(b.getAttribute('data-eco-chat-ask'));});
});
window.ecoMonitorReceiveSnapshot=function(data){
 snapshot=data&&typeof data==='object'?data:null;
 updateWelcome();
 if(stamp)stamp.textContent=isFresh()?'Datos del '+datetime(snapshot.lastCheck):
   'Sin medición vigente';
 var bot=document.querySelector('.eco-bot-stage');
 var caption=document.getElementById('eco-bot-caption');
 if(bot)bot.setAttribute('data-live',isFresh()?'true':'false');
 if(caption)caption.textContent=isFresh()?'DATOS VIGENTES':'EN ESPERA';
};
if(snapshot)window.ecoMonitorReceiveSnapshot(snapshot);
else updateWelcome();
})();