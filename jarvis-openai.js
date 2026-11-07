/**
 * JARVIS ECO · Cliente de OpenAI para Monitor ECO · 2026-11-07.
 * No sustituye eco-analista.js ni sus funciones de estado.
 * Solo activa la conversación generativa cuando Apps Script confirma
 * que está disponible. No agrega límites de consultas.
 * Mantiene la clave API exclusivamente en Google Apps Script.
 * Solicita el nombre en cada conversación; el respaldo optativo de recuerdos
 * se conserva en Sheets (Apps Script) y un identificador local del navegador.
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
  var visitorKey='';
  var feedbackPending=null;
  var lastFeedbackId='';
  var feedbackReady=false;
  var feedbackOfferUsed=false;
  var visitorTurns=0;
  var greeting='¡Hola! Soy JARVIS 😄 ¿Cómo te llamas? Me dará gusto platicar contigo.';
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
    var compact=history.slice(-8).map(function(x){
      return {role:x.role,content:String(x.content||'').slice(0,240)};
    });
    return JSON.stringify(compact);
  }
  function localKeyForName(name){
    // Token aleatorio por perfil y navegador: no es una prueba de identidad.
    try{
      var label=String(name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,70);
      if(!label || !window.crypto || !window.crypto.getRandomValues || !window.localStorage)return '';
      var storageKey='jarvis.eco.memoria.v1.'+label;
      var old=localStorage.getItem(storageKey);
      if(/^jv_[a-f0-9]{36}$/.test(old||''))return old;
      var bytes=new Uint8Array(18);window.crypto.getRandomValues(bytes);
      var hex=Array.prototype.map.call(bytes,function(b){return ('0'+b.toString(16)).slice(-2);}).join('');
      var id='jv_'+hex;localStorage.setItem(storageKey,id);return id;
    }catch(ignored){return '';}
  }
  function rememberVisitorName(question){
    if(visitorName)return;
    var q=String(question||'').trim();
    var match=q.match(/^(?:(?:hola[,.!]?\s*)?(?:soy|me llamo|mi nombre es)\s+)([A-Za-zÀ-ÿ]+(?:[ -][A-Za-zÀ-ÿ]+){0,2})(?=$|[.,!?]|\s+(?:y|pero|trabajo|del|de|en|mucho|gracias)\b)/i);
    if(match&& !/^(?:de|del|en|la|el|los|las|un|una|ventas|mantenimiento)$/i.test(match[1]))visitorName=match[1].trim().slice(0,60);
    if(!visitorName){
      var last=history.length?history[history.length-1]:null;
      if(last && last.role==='assistant' && /(?:c[oó]mo te llamas|cu[aá]l es tu nombre|con qui[eé]n tengo el gusto)/i.test(last.content)){
        if(/^[A-Za-zÀ-ÿ]+(?:[ -][A-Za-zÀ-ÿ]+){0,2}$/.test(q)&&!/^(?:hola|gracias|no|si|sí|bien|perfecto|ok)$/i.test(q))visitorName=q.slice(0,60);
      }
    }
    if(visitorName)visitorKey=localKeyForName(visitorName);
  }
  function setBusy(value){
    busy=value;
    input.readOnly=!!value;
    input.setAttribute('aria-busy',value?'true':'false');
    if(status)status.textContent=value?'JARVIS está pensando…':'JARVIS ECO · Capital Humano';
  }
  function onSubmit(event){
    // No permitir que el asistente antiguo simule una respuesta de IA cuando el backend falla.
    if(!enabled){
      event.preventDefault();
      event.stopImmediatePropagation();
      var attempted=String(input.value||'').trim().slice(0,500);
      if(attempted){
        input.value='';
        append(attempted,'question');
        append('Todavía no consigo conectar mi conversación. Prueba recargar la página; prefiero avisarte que darte una respuesta inventada.','answer');
      }
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    if(busy)return;
    var q=String(input.value||'').trim().slice(0,500);
    if(!q)return;
    rememberVisitorName(q);
    input.value='';
    append(q,'question');
    var pendingAnswer=append('Pensando…','answer');
    var previous=historyParam();
    visitorTurns++;
    var params={question:q,history:previous,visitorName:visitorName,visitorKey:visitorKey};
    if(feedbackReady){
      if(lastFeedbackId)params.lastFeedbackId=lastFeedbackId;
      if(feedbackPending)params.feedbackPending=JSON.stringify(feedbackPending);
      if(visitorTurns>=4&&!feedbackOfferUsed&&!feedbackPending&&/\b(?:eco|sistema|aplicaci[oó]n|evaluaci[oó]n|monitor|capital humano|recursos humanos|cultura|dashboard)\b/i.test(q)){
        params.inviteFeedback='1';
        feedbackOfferUsed=true;
      }
    }
    setBusy(true);
    ask(params,90000).then(function(res){
      var reply=res&&res.ok&&typeof res.text==='string'&&res.text.trim()
        ?res.text.trim():String(res&&res.error||'No fue posible obtener una respuesta de OpenAI.');
      pendingAnswer.textContent=reply;
      if(res&&res.ok&&feedbackReady){
        if(typeof res.feedbackReceiptId==='string'&&/^fb_[a-f0-9-]{36}$/i.test(res.feedbackReceiptId))lastFeedbackId=res.feedbackReceiptId;
        if(res.clearFeedback===true)feedbackPending=null;
        if(res.feedbackProposal&&typeof res.feedbackProposal==='object'){
          feedbackPending=res.feedbackProposal;
          feedbackOfferUsed=true;
        }
      }
      if(res&&res.ok){
        if(res.resetConversation===true)history=[];
        // Los recibos y borradores del correo NO son conversación con la IA.
        // El estado del trámite se transporta por feedbackPending, independientemente.
        if(res.conversationAction!=='correo'){
          history.push({role:'user',content:q},{role:'assistant',content:reply});
          if(history.length>16)history=history.slice(-16);
        }
      }
    }).catch(function(){
      pendingAnswer.textContent='No fue posible contactar a OpenAI. Revisa la conexión y vuelve a intentarlo.';
    }).finally(function(){
      setBusy(false);
      input.focus();
      messages.scrollTop=messages.scrollHeight;
    });
  }
  // La bienvenida no depende de las mediciones del monitor ni de un ping de servidor.
  append(greeting,'answer');
  history.push({role:'assistant',content:greeting});
  // Siempre interceptar el formulario: nunca presentar las respuestas rígidas del bot antiguo
  // como si procedieran de JARVIS. Los estados y gráficas del monitor quedan independientes.
  form.addEventListener('submit',onSubmit,true);
  function showConnectionError(){
    if(status)status.textContent='JARVIS ECO · conversación desconectada';
    append('No logré conectar mi conversación por ahora. El monitor sigue disponible; puedes recargar esta página para reintentar.','answer');
  }
  ask({mode:'ping'},14000).then(function(pong){
    // Compatibilidad con despliegues anteriores y con el Code.gs nuevo.
    if(!pong||!/^jarvis-eco-ai-v[12]$/.test(String(pong.service||''))||pong.ready!==true){
      showConnectionError();
      return;
    }
    enabled=true;
    feedbackReady=pong.feedbackReady===true;
    if(status)status.textContent='JARVIS ECO · Capital Humano';
  }).catch(showConnectionError);
})();
