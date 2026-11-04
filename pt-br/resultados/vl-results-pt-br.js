/* Interface de resultados pt-BR com os mesmos componentes visuais do comparador espanhol. */
(function(){
'use strict';
var insurers=[
{id:3,key:'intermundial',name:'InterMundial',logo:'/assets/intermundial-logo-oficial.png',initial:'IM',bg:'#F0F8FF',url:'https://www.intermundial.pt/afiliados/seguros-de-viaje-recomendado?utm_source=Affiliates&utm_medium=Affiliates&utm_campaign=General&utm_term=kbnnqvpvcy490&utm_content=kbnnqvpvcy490&coupon=VIAJEROLATAM&vl_site=viajerolatam&vl_partner=intermundial&vl_page=resultados&vl_link=2'},
{id:2,key:'iati',name:'IATI Seguros',logo:'',initial:'IATI',bg:'#FFF5EA',url:'https://www.iatiseguros.pt/?r=84208681926165'},
{id:6,key:'chapka',name:'Chapka Seguros',logo:'/assets/chapka-logo-oficial.png',initial:'CH',bg:'#FFFFFF',url:'https://www.chapkadirect.pt/index.php?action=produit&id=930&app=ViajeroLATAM'}
];
var params=new URLSearchParams(location.search),filters=['f2','f5','f4'],keys={f2:'intermundial',f5:'iati',f4:'chapka'},active=insurers.slice();
function el(id){return document.getElementById(id)}
function now(n){var d=new Date();d.setDate(d.getDate()+(n||0));return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function valid(x){if(!/^\d{4}-\d{2}-\d{2}$/.test(x||''))return false;var d=new Date(x+'T00:00:00Z');return !isNaN(d.getTime())&&d.toISOString().slice(0,10)===x}
function h(s){return String(s||'').replace(/[&<>"']/g,function(x){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]})}
function trip(){var a=el('ep-ida'),b=el('ep-vuelta'),c=el('ep-viajeros'),start=a&&a.value,end=b&&b.value;
 if(!valid(start)||!valid(end)||end<start)return null;
 return {start:start,end:end,people:Number(c&&c.value||1)||1,days:Math.round((Date.parse(end+'T00:00:00Z')-Date.parse(start+'T00:00:00Z'))/86400000)+1}}
function formatted(s){try{return new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short'}).format(new Date(s+'T12:00:00'))}catch(e){return s}}
function pills(){var v=document.querySelectorAll('.pill-val'),t=trip();if(v[0])v[0].textContent='Brasil 🇧🇷';if(v[1])v[1].textContent='Espanha 🇪🇸';
 if(v[2])v[2].textContent=t?formatted(t.start)+' → '+formatted(t.end)+' · '+t.days+' dias':'Informe as datas';
 if(v[3])v[3].textContent=t?t.people+' '+(t.people===1?'pessoa':'pessoas'):'1 pessoa';
 if(el('sidebar-route'))el('sidebar-route').textContent='Brasil 🇧🇷 → Espanha 🇪🇸'}
function logo(x,where){var size=where==='table'?'insurer-logo-table':'insurer-logo-card';
 var img=x.logo?'<img src="'+h(x.logo)+'" alt="'+h(x.name)+'" loading="lazy" decoding="async">':'';
 return '<span class="insurer-logo-shell '+size+' provider-'+x.key+'" style="background:'+x.bg+'">'+img+
 '<span class="insurer-logo-fallback" style="display:'+(x.logo?'none':'flex')+';color:#246c8c">'+x.initial+'</span></span>'}
function card(x){var t=trip(),duration=t?t.days+' dias · '+t.people+' '+(t.people===1?'pessoa':'pessoas'):'datas a definir',name=h(x.name);
 var icon='<svg class="cov-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>';
 var details=[['Assistência médica','Limites e exclusões de cada plano'],['Repatriação','Conforme as condições oficiais'],['Franquia','Verifique se existe e qual o valor'],['Cancelamento','Confira se está disponível'],['Bagagem','Confira limites e restrições'],['País de residência','Informe o Brasil como residência na cotação']];
 return '<div class="card" id="card-'+x.id+'"><div class="card-body">'+
 '<div class="card-logo-block">'+logo(x,'card')+'<div class="card-logo-meta"><div class="card-name">'+name+'</div>'+
 '<div class="card-plan-under-logo">Plano e condições a confirmar</div><div class="card-verified">Consulte os detalhes do plano na seguradora</div></div></div>'+
 '<div class="card-coverage"><div class="coverage-pills"><span class="cpill cpill-green">Consultar seguro viagem</span>'+
 '<span class="cpill cpill-navy">Espanha / Schengen</span></div>'+
 '<div class="provider-differentiator"><span class="diff-label">✨ Atenção</span><span class="diff-text">Compare coberturas, limites e condições</span></div>'+
 '<div class="coverage-row">'+icon+'Assistência médica: <span class="cov-val">&nbsp;Verificar limites</span></div>'+
 '<div class="coverage-row">'+icon+'Repatriação: <span class="cov-val">&nbsp;Verificar condições</span></div>'+
 '<div class="coverage-row">'+icon+'Bagagem: <span class="cov-val">&nbsp;Verificar cobertura</span></div>'+
 '<div class="card-fit"><strong>O que comparar:</strong> assistência, repatriação, franquia e cobertura geográfica.</div></div>'+
 '<div class="card-price-block">'+
 '<div class="public-price-label">Cotação oficial · '+duration+'</div>'+
 '<div class="public-price">Consultar preço <small>valor no site da seguradora</small></div>'+
 '<div class="trip-origin-price">Sem tarifa brasileira confirmada</div>'+
 '<div class="public-price-sub">Indique residência no Brasil, datas e idades reais. Não usamos estimativas de preços de outros países.</div>'+
 '<a class="btn-contract pt-affiliate" data-partner="'+x.key+'" href="'+h(x.url)+'" target="_blank" rel="nofollow sponsored noopener noreferrer">Ver preço na '+name+' →</a>'+
 '<button class="btn-details" type="button" onclick="toggleDetails('+x.id+')" id="btn-det-'+x.id+'">Ver cobertura completa</button></div></div>'+
 '<div class="card-details" id="det-'+x.id+'"><div class="details-grid">'+
 details.map(function(d){return '<div class="detail-item"><div class="detail-label">'+d[0]+'</div><div class="detail-val">A confirmar</div><div class="detail-sub">'+d[1]+'</div></div>'}).join('')+
 '</div><div class="detail-source">Fonte: informações fornecidas na cotação oficial. Confira coberturas, datas e condições antes de pagar.</div></div></div>'}
function list(){var selected=filters.filter(function(id){return el(id)&&el(id).checked}).map(function(id){return keys[id]});
 var items=selected.length?insurers.filter(function(x){return selected.indexOf(x.key)>=0}):insurers.slice();
 var sort=el('sort-select')&&el('sort-select').value;
 if(sort==='alfabetica')items.sort(function(a,b){return a.name.localeCompare(b.name,'pt-BR')});
 return items}
function compare(){var head=el('quick-compare-head'),body=el('quick-compare-body');if(!head||!body)return;
 head.innerHTML='<tr><th class="feature-head">Comparativo</th>'+active.map(function(x){return '<th><div class="matrix-brand">'+logo(x,'table')+
 '<div class="matrix-brand-name">'+h(x.name)+'</div><div class="matrix-plan">Brasil → Espanha</div></div></th>'}).join('')+'</tr>';
 var rows=[['Condições de contratação','Verificar na seguradora'],['Assistência médica','Verificar limites'],
 ['Repatriação','Verificar apólice'],['Franquia','Conferir condições'],['Bagagem','Verificar cobertura'],
 ['Cancelamento','Consultar disponibilidade'],['Preço','Cotação na seguradora']];
 body.innerHTML=rows.map(function(x){return '<tr><td class="matrix-label">'+x[0]+'</td>'+
 active.map(function(){return '<td><span class="status-no">'+x[1]+'</span></td>'}).join('')+'</tr>'}).join('')}
function render(){active=list();var message=active.length+' '+(active.length===1?'seguradora':'seguradoras')+' para consultar · condições a confirmar';
 if(el('count-slim'))el('count-slim').textContent=message;
 if(el('count-display'))el('count-display').textContent=message;
 if(el('cards-container'))el('cards-container').innerHTML=active.map(card).join('');
 if(el('no-results'))el('no-results').style.display=active.length?'none':'block';compare();pills()}
window.applyFilters=render;window.applySort=render;window.setDest=render;window.onPriceChange=render;
window.clearFilters=function(){filters.forEach(function(i){if(el(i))el(i).checked=false});render()};
window.toggleDetails=function(id){var d=el('det-'+id),b=el('btn-det-'+id);if(!d||!b)return;
 var open=!d.classList.contains('open');d.classList.toggle('open',open);b.textContent=open?'Ocultar detalhes ↑':'Ver cobertura completa'};
window.toggleQuickCompare=function(){var s=el('quick-compare-section'),c=el('quick-compare-content'),b=el('quick-compare-toggle'),label=el('quick-compare-toggle-label');
 if(!s||!c||!b||!label)return;var open=!s.classList.contains('is-open');s.classList.toggle('is-open',open);
 b.setAttribute('aria-expanded',String(open));c.setAttribute('aria-hidden',String(!open));label.textContent=open?'Ocultar tabela':'Mostrar tabela'};
window.openMobMenu=function(){var d=el('mob-drawer'),o=el('mob-overlay'),b=document.querySelector('.mob-btn');if(!d||!o)return;
 d.style.display='flex';o.style.display='block';requestAnimationFrame(function(){d.classList.add('is-open');if(b)b.classList.add('is-open')});document.body.style.overflow='hidden'};
window.closeMobMenu=function(){var d=el('mob-drawer'),o=el('mob-overlay'),b=document.querySelector('.mob-btn');if(!d||!o)return;
 d.classList.remove('is-open');if(b)b.classList.remove('is-open');document.body.style.overflow='';
 setTimeout(function(){d.style.display='none';o.style.display='none'},300)};
window.openEditPanel=function(){var p=el('edit-panel');if(!p)return;p.style.display='block';
 if(window.innerWidth<=768)document.body.style.overflow='hidden';setTimeout(function(){var x=el('ep-ida');if(x)x.focus()},70)};
window.closeEditPanel=function(){if(el('edit-panel'))el('edit-panel').style.display='none';document.body.style.overflow=''};
window.toggleEditPanel=function(){var p=el('edit-panel');if(!p)return;p.style.display==='none'?openEditPanel():closeEditPanel()};
window.applyEditSearch=function(){var t=trip(),msg=el('pt-date-error');
 if(!t||t.start<now()){if(msg){msg.hidden=false;msg.textContent='Confira as datas: a volta deve ser igual ou posterior à saída.'}return}
 if(msg)msg.hidden=true;
 var q=new URLSearchParams(location.search);q.set('origen','brasil');q.set('destino','espanha');
 q.set('ida',t.start);q.set('vuelta',t.end);q.set('personas',String(t.people));
 history.replaceState(null,'',location.pathname+'?'+q.toString());render();closeEditPanel()};
window.openMobFilters=function(){var d=el('mob-filter-overlay'),c=el('mob-filter-content'),side=document.querySelector('.sidebar');if(!d||!c||!side)return;
 c.innerHTML=side.innerHTML;c.querySelectorAll('input[id]').forEach(function(i){var source=el(i.id),old=i.id;
 i.dataset.sourceId=old;i.id='mob-'+old;i.removeAttribute('onchange');if(source&&i.type==='checkbox')i.checked=source.checked;
 var label=c.querySelector('label[for="'+old+'"]');if(label)label.setAttribute('for',i.id)});
 d.classList.add('open');document.body.style.overflow='hidden'};
window.applyMobileFilters=function(){var c=el('mob-filter-content');if(c)c.querySelectorAll('input[data-source-id]').forEach(function(i){
 var src=el(i.dataset.sourceId);if(src&&src.type==='checkbox')src.checked=i.checked});render();closeMobFilters()};
window.closeMobFilters=function(){if(el('mob-filter-overlay'))el('mob-filter-overlay').classList.remove('open');document.body.style.overflow=''};
function consent(){try{var c=JSON.parse(localStorage.getItem('vl_cookie_consent_v1')||'null');return c&&c.version===1&&c.expiresAt>Date.now()?c:null}catch(e){return null}}
function track(name){var c=consent();if(!c||!c.analytics||typeof gtag!=='function')return;
 var t=trip();gtag('event','click_affiliate_'+name,{event_category:'affiliate',affiliate_partner:name,source_page:'pt_br_resultados',
 route_origin:'brasil',route_destination:'espanha',page_path:location.pathname,trip_days:t&&t.days,traveler_count:t&&t.people,transport_type:'beacon'})}
function init(){var a=el('ep-ida'),b=el('ep-vuelta'),c=el('ep-viajeros');
 if(a){a.min=now();a.value=valid(params.get('ida'))&&params.get('ida')>=now()?params.get('ida'):now(1)}
 if(b){b.min=a?a.value:now();b.value=valid(params.get('vuelta'))&&params.get('vuelta')>=b.min?params.get('vuelta'):now(15)}
 if(c){var n=parseInt(params.get('personas')||'1',10);c.value=n>=1&&n<=8?String(n):'1'}
 if(a)a.addEventListener('change',function(){if(b){b.min=a.value;if(b.value<a.value)b.value=a.value}pills()});
 if(b)b.addEventListener('change',pills);if(c)c.addEventListener('change',pills);
 document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a.pt-affiliate');if(a)track(a.dataset.partner);
 var p=el('edit-panel');if(p&&e.target===p)closeEditPanel()});
 document.addEventListener('keydown',function(e){if(e.key==='Escape'){closeEditPanel();closeMobFilters();closeMobMenu()}});
 var banner=el('pt-privacy');if(banner){if(!consent())banner.hidden=false;
 function save(allowed){var v={version:1,analytics:allowed,marketing:allowed,savedAt:Date.now(),expiresAt:Date.now()+730*24*60*60*1000};
 try{localStorage.setItem('vl_cookie_consent_v1',JSON.stringify(v))}catch(e){}
 gtag('consent','update',{analytics_storage:allowed?'granted':'denied',ad_storage:allowed?'granted':'denied',ad_user_data:allowed?'granted':'denied',ad_personalization:allowed?'granted':'denied'});banner.hidden=true}
 el('pt-privacy-accept').addEventListener('click',function(){save(true)});
 el('pt-privacy-reject').addEventListener('click',function(){save(false)})}
 render()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();