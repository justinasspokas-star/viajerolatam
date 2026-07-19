
function vlTrack(name, params){try{if(window.gtag)gtag('event',name,params||{})}catch(e){}}
function goCompare(){
 const qs=new URLSearchParams({origen:document.getElementById('origen')?.value||'colombia',destino:document.getElementById('destino')?.value||'espana-schengen',ida:document.getElementById('ida')?.value||'',vuelta:document.getElementById('vuelta')?.value||'',personas:document.getElementById('personas')?.value||'1'});
 location.href='/resultados/?'+qs.toString();
}
document.addEventListener('click',e=>{const a=e.target.closest('a'); if(!a)return; const h=a.href||''; if(h.includes('iatiseguros.com'))vlTrack('click_affiliate_iati',{event_category:'affiliate',event_label:h}); if(h.includes('intermundial.es'))vlTrack('click_affiliate_intermundial',{event_category:'affiliate',event_label:h});});
(function(){const t=new Date(),r=new Date();r.setDate(t.getDate()+15);const f=d=>d.toISOString().split('T')[0];['ida','vuelta'].forEach((id,i)=>{let el=document.getElementById(id);if(el&&!el.value){el.value=f(i?r:t);el.min=f(t)}})})();
