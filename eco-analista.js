/* Analista contextual Monitor ECO · 2026-11-07.
   Solo razona sobre el estado PUBLICO recibido en el tablero.
   No es IA generativa ni consume API. No se registran preguntas.
   No consulta otros sistemas ni ejecuta escrituras. */
(function(){
'use strict';
var box=document.getElementById('eco-chat-panel'),open=document.getElementById('eco-chat-open'),
    close=document.getElementById('eco-chat-close'),form=document.getElementById('eco-chat-form'),
    input=document.getElementById('eco-chat-input'),messages=document.getElementById('eco-chat-messages'),
    stamp=document.getElementById('eco-chat-stamp');
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
 if(def.key!=='dashboard'&&!isFresh())return noMeasure();
 var a=oneApp(def.key);
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
 'Las otras cinco aplicaciones aún no tienen prueba funcional.';
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
 var a=oneApp('dashboard');
 var fail=isDashboardFresh(a)&&a.status!=='ok';
 if(!alerts.length&&!fail)return 'En las comprobaciones disponibles no se detectan alertas en Sheets'+
 (isDashboardFresh(a)?' ni en la consulta ejecutiva del Dashboard':'')+
 '. Esto no garantiza el funcionamiento integral del ecosistema: cinco aplicaciones siguen sin prueba funcional.';
 var out=[];
 if(fail)out.push('Dashboard Ejecutivo ECO: '+(a.status==='unverified'?'sin prueba autorizada':health(a))+'. '+reason(a.code));
 alerts.forEach(function(x){out.push(x.name+': '+health(x)+'. '+advise(x));});
 return 'Anomalías que el Monitor sí registra:\n'+out.join('\n')+
  '\nSon comprobaciones técnicas, no una explicación confirmada de la causa raíz.';
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
   return 'El Monitor aún no realiza pruebas funcionales de Autoevaluación ECO, Evaluación 360 ECO, Centro de Administración ECO, Mi Persona ECO ni Familia ECO. El Dashboard tiene una comprobación separada de consulta ejecutiva cuya vigencia hay que verificar.';
 return 'Ese dato no aparece entre las mediciones disponibles del Monitor ECO. Solo puedo explicar fuentes de Sheets, comprobación de consulta del Dashboard, estados registrados, tiempos e historial. No puedo atribuir causas sin registros.';
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
 if(!messages.children.length)add('Puedo explicar los estados que ya aparecen en Monitor ECO. Si una aplicación todavía no tiene prueba conectada, te lo indicaré expresamente.','answer');
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
 if(stamp)stamp.textContent=isFresh()?'Datos del '+datetime(snapshot.lastCheck):
   'Sin medición vigente';
 var bot=document.querySelector('.eco-bot-stage');
 var caption=document.getElementById('eco-bot-caption');
 if(bot)bot.setAttribute('data-live',isFresh()?'true':'false');
 if(caption)caption.textContent=isFresh()?'DATOS VIGENTES':'EN ESPERA';
};
if(snapshot)window.ecoMonitorReceiveSnapshot(snapshot);
})();