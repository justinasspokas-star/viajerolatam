/* ViajeroLatam · selector de fechas premium en castellano · portada/resultados */
(function(){
  'use strict';
  if(window.VLCalendarPremium) return;

  var ids=['sb-ida','sb-vuelta','ep-ida','ep-vuelta'];
  var fields={};
  var active=null;
  var cursor=null;
  var overflowBeforeCalendar=null;
  var popup=null;
  var scrim=null;
  var week=['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
  var fullDateFormatter=new Intl.DateTimeFormat('es-ES',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  var shortDateFormatter=new Intl.DateTimeFormat('es-ES',{day:'numeric',month:'long',year:'numeric'});
  var mobileDateFormatter=new Intl.DateTimeFormat('es-ES',{day:'numeric',month:'short',year:'numeric'});
  var monthFormatter=new Intl.DateTimeFormat('es-ES',{month:'long',year:'numeric'});
  var icon='<svg class="vl-cal-trigger-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2.5"></rect><path d="M7 3v4M17 3v4M3 10h18"></path><path d="m9 15 2 2 4-4"></path></svg>';
  var arrow='<svg class="vl-cal-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="m7 10 5 5 5-5"></path></svg>';

  function noon(d){return new Date(d.getFullYear(),d.getMonth(),d.getDate(),12,0,0,0);}
  function iso(d){
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  }
  function parse(value){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(value||'')) return null;
    var parts=value.split('-').map(Number);
    var d=new Date(parts[0],parts[1]-1,parts[2],12);
    return iso(d)===value?d:null;
  }
  function later(a,b){return !a?b:!b?a:(a>b?a:b);}
  function minFor(input){
    var min=later(noon(new Date()),parse(input.min));
    if(/-vuelta$/.test(input.id)){
      var ida=fields[input.id.replace('-vuelta','-ida')];
      var start=ida&&parse(ida.input.value);
      if(start)min=later(min,new Date(start.getFullYear(),start.getMonth(),start.getDate()+1,12));
    }
    return min;
  }
  function maxFor(input){return parse(input.max);}
  function allowed(input,date){
    var min=minFor(input),max=maxFor(input);
    return (!min||date>=min)&&(!max||date<=max)&&!input.disabled;
  }
  function refresh(){
    ids.forEach(function(id){
      var field=fields[id];
      if(!field) return;
      var date=parse(field.input.value);
      var label=date?shortDateFormatter.format(date):'Selecciona una fecha';
      field.full.textContent=label;
      field.mobile.textContent=date?mobileDateFormatter.format(date).replace(/\./g,''):'Elegir fecha';
      field.label.classList.toggle('vl-cal-placeholder',!date);
      field.trigger.setAttribute('aria-label',(id.endsWith('ida')?'Fecha de ida: ':'Fecha de vuelta: ')+label+'. Abrir calendario');
      if(date){
        field.trigger.classList.remove('vl-cal-error');
        field.error.hidden=true;
      }
    });
  }
  function positionPopup(){
    if(!active||!popup) return;
    if(window.matchMedia('(max-width:768px)').matches){
      popup.style.left='0';popup.style.top='auto';return;
    }
    var r=active.trigger.getBoundingClientRect();
    var w=popup.getBoundingClientRect().width||356;
    var h=popup.getBoundingClientRect().height||440;
    var left=Math.max(12,Math.min(r.left,window.innerWidth-w-12));
    var below=r.bottom+9;
    var top=(below+h>window.innerHeight-12 && r.top>h+12)?r.top-h-9:below;
    popup.style.left=left+'px';
    popup.style.top=Math.max(10,Math.min(top,window.innerHeight-h-10))+'px';
  }
  function render(){
    if(!active||!popup) return;
    var input=active.input,y=cursor.getFullYear(),m=cursor.getMonth();
    var monthName=monthFormatter.format(cursor);
    popup.querySelector('.vl-cal-month').textContent=monthName.charAt(0).toUpperCase()+monthName.slice(1);
    var startOfMonth=new Date(y,m,1,12);
    var first=(startOfMonth.getDay()+6)%7;
    var min=minFor(input),max=maxFor(input);
    var prev=new Date(y,m-1,1,12),next=new Date(y,m+1,1,12);
    popup.querySelector('[data-vl-cal-action="prev"]').disabled=!!(min&&prev.getFullYear()*12+prev.getMonth()<min.getFullYear()*12+min.getMonth());
    popup.querySelector('[data-vl-cal-action="next"]').disabled=!!(max&&next.getFullYear()*12+next.getMonth()>max.getFullYear()*12+max.getMonth());
    popup.querySelector('[data-vl-cal-action="today"]').disabled=!allowed(input,noon(new Date()));
    var chosen=input.value;
    var today=iso(noon(new Date()));
    var counterpart=fields[input.id.endsWith('ida')?input.id.replace('-ida','-vuelta'):input.id.replace('-vuelta','-ida')];
    var pair=counterpart&&counterpart.input.value;
    var rangeStart=chosen&&pair?chosen<pair?chosen:pair:'';
    var rangeEnd=chosen&&pair?chosen>pair?chosen:pair:'';
    var grid=popup.querySelector('.vl-cal-days');
    var fragment=document.createDocumentFragment();
    for(var i=0;i<42;i++){
      var date=new Date(y,m,1-first+i,12),value=iso(date),button=document.createElement('button');
      button.type='button';
      button.className='vl-cal-day';
      button.textContent=String(date.getDate());
      button.dataset.vlCalDate=value;
      button.setAttribute('aria-label',fullDateFormatter.format(date));
      if(date.getMonth()!==m)button.classList.add('is-other');
      if(value===today)button.classList.add('is-today');
      if(value===chosen){button.classList.add('is-selected');button.setAttribute('aria-pressed','true');}
      else{button.setAttribute('aria-pressed','false');}
      if(rangeStart&&value>rangeStart&&value<rangeEnd)button.classList.add('is-in-range');
      if(!allowed(input,date))button.disabled=true;
      fragment.appendChild(button);
    }
    grid.replaceChildren(fragment);
    positionPopup();
  }
  function close(restoreFocus){
    if(!active) return;
    var previous=active;
    active=null;
    popup.classList.remove('is-open');
    scrim.classList.remove('is-open');
    popup.setAttribute('aria-hidden','true');
    previous.trigger.setAttribute('aria-expanded','false');
    if(overflowBeforeCalendar!==null){document.body.style.overflow=overflowBeforeCalendar;overflowBeforeCalendar=null;}
    if(restoreFocus!==false&&previous.trigger.isConnected){
      try{previous.trigger.focus({preventScroll:true});}catch(e){previous.trigger.focus();}
    }
  }
  function openFor(id){
    var field=fields[id];
    if(!field||field.input.disabled)return;
    if(active&&active.input.id===id){close(true);return;}
    if(active)close(false);
    active=field;
    if(window.matchMedia('(max-width:768px)').matches){
      overflowBeforeCalendar=document.body.style.overflow;
      document.body.style.overflow='hidden';
    }
    var value=parse(field.input.value);
    var min=minFor(field.input);
    var shown=value&&(!min||value>=min)?value:min||noon(new Date());
    cursor=new Date(shown.getFullYear(),shown.getMonth(),1,12);
    popup.querySelector('.vl-cal-headline').textContent=id.endsWith('ida')?'Elige tu fecha de ida':'Elige tu fecha de vuelta';
    popup.querySelector('.vl-cal-caption').textContent=id.endsWith('ida')?'SALIDA DEL VIAJE':'REGRESO DEL VIAJE';
    popup.setAttribute('aria-label',id.endsWith('ida')?'Seleccionar fecha de ida':'Seleccionar fecha de vuelta');
    popup.setAttribute('aria-hidden','false');
    popup.setAttribute('aria-modal',window.matchMedia('(max-width:768px)').matches?'true':'false');
    popup.classList.add('is-open');
    scrim.classList.add('is-open');
    field.trigger.setAttribute('aria-expanded','true');
    render();
    var preferred=popup.querySelector('.vl-cal-day.is-selected:not(:disabled)')||popup.querySelector('.vl-cal-day:not(:disabled)');
    if(preferred)preferred.focus({preventScroll:true});
  }
  function select(value){
    if(!active)return;
    var d=parse(value),input=active.input;
    if(!d||!allowed(input,d))return;
    input.value=value;
    input.dispatchEvent(new Event('input',{bubbles:true}));
    input.dispatchEvent(new Event('change',{bubbles:true}));
    refresh();
    var nextId=input.id.endsWith('ida')?input.id.replace('-ida','-vuelta'):null;
    var next=nextId&&fields[nextId];
    close(true);
    if(next&&!next.input.value){
      window.setTimeout(function(){if(!active&&next.trigger.isConnected)openFor(nextId);},85);
    }
  }
  function setup(){
    var found=ids.map(function(id){return document.getElementById(id);}).filter(Boolean);
    if(!found.length)return;
    scrim=document.createElement('div');
    scrim.className='vl-cal-scrim';
    scrim.setAttribute('aria-hidden','true');
    popup=document.createElement('div');
    popup.className='vl-cal-pop';
    popup.id='vl-calendar-premium';
    popup.setAttribute('role','dialog');
    popup.setAttribute('aria-hidden','true');
    popup.setAttribute('lang','es');
    popup.innerHTML=
      '<div class="vl-cal-top"><div><div class="vl-cal-caption">SALIDA DEL VIAJE</div><h2 class="vl-cal-headline">Elige tu fecha</h2></div>'+
      '<button class="vl-cal-close" type="button" data-vl-cal-action="close" aria-label="Cerrar calendario">×</button></div>'+
      '<div class="vl-cal-nav"><span class="vl-cal-month" aria-live="polite"></span><div class="vl-cal-nav-buttons">'+
      '<button class="vl-cal-arrow" type="button" data-vl-cal-action="prev" aria-label="Mes anterior">‹</button>'+
      '<button class="vl-cal-arrow" type="button" data-vl-cal-action="next" aria-label="Mes siguiente">›</button></div></div>'+
      '<div class="vl-cal-weekdays" aria-hidden="true">'+week.map(function(n){return '<span>'+n+'</span>';}).join('')+'</div>'+
      '<div class="vl-cal-days" role="group" aria-label="Días del mes"></div>'+
      '<div class="vl-cal-footer"><span class="vl-cal-hint">Selecciona el día que prefieras</span>'+
      '<button class="vl-cal-today" data-vl-cal-action="today" type="button">Hoy</button></div>';
    document.body.appendChild(scrim);
    document.body.appendChild(popup);
    found.forEach(function(input){
      if(fields[input.id])return;
      var trigger=document.createElement('button');
      trigger.type='button';
      trigger.className='vl-cal-trigger';
      trigger.setAttribute('aria-haspopup','dialog');
      trigger.setAttribute('aria-expanded','false');
      trigger.setAttribute('aria-controls','vl-calendar-premium');
      trigger.innerHTML=icon+'<span class="vl-cal-trigger-copy"><span class="vl-cal-label-full"></span><span class="vl-cal-label-mobile"></span></span>'+arrow;
      input.insertAdjacentElement('afterend',trigger);
      var error=document.createElement('p');
      error.className='vl-cal-error-msg';
      error.textContent='Selecciona una fecha para continuar.';
      error.hidden=true;
      trigger.insertAdjacentElement('afterend',error);
      input.parentElement.classList.add('vl-cal-field');
      input.classList.add('vl-calendar-native');
      input.tabIndex=-1;
      input.setAttribute('aria-hidden','true');
      fields[input.id]={input:input,trigger:trigger,label:trigger.querySelector('.vl-cal-trigger-copy'),full:trigger.querySelector('.vl-cal-label-full'),mobile:trigger.querySelector('.vl-cal-label-mobile'),error:error};
      trigger.addEventListener('click',function(){openFor(input.id);});
      input.addEventListener('input',refresh);
      input.addEventListener('change',refresh);
      input.addEventListener('invalid',function(e){
        e.preventDefault();
        trigger.classList.add('vl-cal-error');
        error.hidden=false;
        trigger.focus();
      });
      document.querySelectorAll('label[for="'+input.id+'"]').forEach(function(label){
        label.addEventListener('click',function(e){e.preventDefault();openFor(input.id);});
      });
    });
    refresh();
    scrim.addEventListener('click',function(){close(true);});
    popup.addEventListener('click',function(e){
      var day=e.target.closest('[data-vl-cal-date]');
      if(day){select(day.dataset.vlCalDate);return;}
      var action=e.target.closest('[data-vl-cal-action]');
      if(!action||!active)return;
      var command=action.dataset.vlCalAction;
      if(command==='close'){close(true);return;}
      if(command==='today'){select(iso(noon(new Date())));return;}
      if(command==='prev'||command==='next'){
        cursor=new Date(cursor.getFullYear(),cursor.getMonth()+(command==='prev'?-1:1),1,12);
        render();
        action.focus({preventScroll:true});
      }
    });
    document.addEventListener('pointerdown',function(e){
      if(active&&!popup.contains(e.target)&&!active.trigger.contains(e.target)&&!scrim.contains(e.target))close(false);
    });
    document.addEventListener('keydown',function(e){
      if(!active)return;
      if(e.key==='Escape'){e.preventDefault();close(true);return;}
      if(e.key==='Tab'){
        var controls=Array.from(popup.querySelectorAll('button:not(:disabled)'));
        if(!controls.length)return;
        var first=controls[0],last=controls[controls.length-1];
        if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
        else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
      }
    });
    window.addEventListener('resize',positionPopup,{passive:true});
    window.addEventListener('scroll',positionPopup,true);
  }
  window.VLCalendarPremium={openFor:openFor,close:close,isOpen:function(){return !!active;},refresh:refresh};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup);
  else setup();
})();