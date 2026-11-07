/**
 * JARVIS ECO · Cliente de OpenAI para Monitor ECO · 2026-11-07.
 * No sustituye eco-analista.js ni sus funciones de estado.
 * Solo activa la conversación generativa cuando Apps Script confirma
 * que está disponible. No agrega límites de consultas.
 * Mantiene la clave API exclusivamente en Google Apps Script.
 * Recuerda el nombre aportado durante esta conversación (no lo almacena).
 */
(function(){
  'use strict';
  var endpoint=String(window.ECO_MONITOR_ENDPOINT||'').trim();
  var form=document.getElementById('eco-chat-form');
  var input=document.getElementById('eco-chat-input');
  var messages=document.getElementById('eco-chat-messages');
  var status=document.getElementById('eco-chat-stamp');
  if(!endpoint||!form||!input||!messages)return;
  if(!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec(?:\?.*)?$/.test(endpoint))return;

  var enabled=false;
  var pending=null;
  var busy=false;
  var history=[];
  var visitorName='';
  var counter=0;
  var base=endpoint.split('?')[0];

  function clearPending(){
    if(!pending)return;
    var p=pending;
    pending=null;
    clearTimeout(p.timer);
    if(p.script&&p.script.parentNode)p.script.parentNode.removeChild(p.script);
  }
  // Callback fija esperada por Apps Script; rid correlaciona respuestas.
  window.ecoJarvisAIReceive=function(payload){
    if(!pending||!payload||payload.requestId!==pending.id)return;
    var resolve=pending.resolve;
    clearPending();
    resolve(payload);
  };
  function ask(params,timeoutMs){
    if(pending)return Promise.reject(new Error('CONSULTA_EN_CURSO'));
    return new Promise(function(resolve,reject){
      var id='j'+Date.now().toString(36)+(++counter).toString(36);
      var script=document.createElement('script');
      var qs=new URLSearchParams({api:'jarvis',rid:id});
      Object.keys(params).forEach(function(k){qs.set(k,String(params[k]));});
      script.src=base+'?'+qs.toString();
      script.async=true;
      var timer=setTimeout(function(){
        if(!pending||pending.id!==id)return;
        clearPending();
        reject(new Error('SIN_RESPUESTA_SERVIDOR'));
      },timeoutMs);
      pending={id:id,script:script,timer:timer,resolve:resolve,reject:reject};
      script.onerror=function(){
        if(!pending||pending.id!==id)return;
        clearPending();
        reject(new Error('ERROR_CONEXION'));
      };
      document.head.appendChild(script);
    });
  }
  function append(text,kind){
    messages.hidden=false;
    var node=document.createElement('div');
    node.className='eco-chat-message eco-chat-'+kind;
    node.textContent=String(text||'');
    messages.appendChild(node);
    while(messages.children.length>36)messages.removeChild(messages.firstChild);
    messages.scrollTop=messages.scrollHeight;
    return node;
  }
  function historyParam(){
    // Últimos mensajes breves para mantener contexto sin hacer URLs enormes.
    var compact=history.slice(-4).map(function(x){
      return {role:x.role,content:String(x.content||'').slice(0,280)};
    });
    return JSON.stringify(compact);
  }
  function rememberVisitorName(question){
    if(visitorName)return;
    var m=String(question||'').match(/(?:^|\s)(?:me llamo|mi nombre es)\s+([A-Za-zÀ-ÿ]+(?:\s+[A-Za-zÀ-ÿ]+){0,2})/i);
    if(m){visitorName=m[1].trim().slice(0,60);return;}
    // Cuando la respuesta anterior pidió el nombre, aceptar un nombre breve.
    var last=history.length?history[history.length-1]:null;
    if(last && last.role==='assistant' && /(?:c[oó]mo te llamas|cu[aá]l es tu nombre)/i.test(last.content)){
      var q=String(question||'').trim();
      if(/^[A-Za-zÀ-ÿ]+(?: [A-Za-zÀ-ÿ]+){0,2}$/.test(q) && !/^(?:hola|gracias|no|si|sí|bien|perfecto)$/i.test(q)){
        visitorName=q.slice(0,60);
      }
    }
  }
  function setBusy(value){
    busy=value;
    input.readOnly=!!value;
    input.setAttribute('aria-busy',value?'true':'false');
    if(status)status.textContent=value?'JARVIS está consultando OpenAI…':'JARVIS conectado a OpenAI';
  }
  function onSubmit(event){
    if(!enabled)return; // Conserva intacto el asistente anterior hasta el despliegue real.
    event.preventDefault();
    event.stopImmediatePropagation();
    if(busy)return;
    var q=String(input.value||'').trim().slice(0,500);
    if(!q)return;
    rememberVisitorName(q);
    input.value='';
    append(q,'question');
    var pendingAnswer=append('Consultando OpenAI…','answer');
    var previous=historyParam();
    setBusy(true);
    ask({question:q,history:previous,visitorName:visitorName},90000).then(function(res){
      var reply=res&&res.ok&&typeof res.text==='string'&&res.text.trim()
        ?res.text.trim():String(res&&res.error||'No fue posible obtener una respuesta de OpenAI.');
      pendingAnswer.textContent=reply;
      if(res&&res.ok){
        history.push({role:'user',content:q},{role:'assistant',content:reply});
        // Se conserva la conversación en memoria de esta pestaña, sin guardar datos en Sheets.
        if(history.length>14)history=history.slice(-14);
      }
    }).catch(function(){
      pendingAnswer.textContent='No fue posible contactar a OpenAI. Revisa la conexión y vuelve a intentarlo.';
    }).finally(function(){
      setBusy(false);
      input.focus();
      messages.scrollTop=messages.scrollHeight;
    });
  }
  // No interfiere con el código contextual existente mientras el servidor no esté listo.
  ask({mode:'ping'},14000).then(function(pong){
    if(!pong||pong.service!=='jarvis-eco-ai-v1'||pong.ready!==true)return;
    enabled=true;
    if(status)status.textContent='JARVIS conectado a OpenAI';
    // Captura antes del listener anterior, conservando el resto de sus funciones.
    form.addEventListener('submit',onSubmit,true);
  }).catch(function(){
    // Apps Script aún no desplegado: queda el asistente anterior sin cambios.
  });
})();
