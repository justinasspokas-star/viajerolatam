/* Shared route-level 14 / 30 / 90 day comparison UI.
   Prices match the editorial go | schengen references in /resultados/, not live quotes. */
(function(){
  'use strict';
  var referenceEUR={14:27.71,30:53.02,90:95.43};
  var dayOptions=[14,30,90];
  function initialize(section){
    var origin=section.getAttribute('data-origin')||'';
    if(!/^(venezuela|colombia|peru|argentina|ecuador)$/.test(origin))return;
    var buttons=Array.prototype.slice.call(section.querySelectorAll('.vl-duration-button'));
    var price=section.querySelector('[data-vl-duration-price]');
    var link=section.querySelector('[data-vl-duration-link]');
    var warning=section.querySelector('.vl-duration-schengen-note');
    if(!price||!link||buttons.length!==3)return;
    var selected=Number(section.getAttribute('data-default-days'));
    if(dayOptions.indexOf(selected)<0)selected=30;
    function setDays(days){
      if(dayOptions.indexOf(days)<0)return;
      selected=days;
      buttons.forEach(function(b){b.setAttribute('aria-pressed',String(Number(b.getAttribute('data-days'))===days));});
      price.textContent=new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(referenceEUR[days]);
      link.textContent='Comparar seguros para '+days+' días';
      link.href='/resultados/?origen='+encodeURIComponent(origin)+'&destino=espana-schengen&pais_destino=es&dias='+days+'&personas=1';
      link.setAttribute('aria-label','Comparar seguros de viaje '+origin+' a España para '+days+' días y 1 viajero');
      if(warning)warning.hidden=days!==90;
      section.setAttribute('data-selected-days',String(days));
    }
    buttons.forEach(function(b){
      b.addEventListener('click',function(){setDays(Number(b.getAttribute('data-days')));});
    });
    link.addEventListener('click',function(){
      if(typeof window.gtag==='function'){
        window.gtag('event','click_duration_compare',{
          event_category:'comparison',
          event_label:origin+'-espana-'+selected+'d',
          origin_country:origin,
          destination_country:'es',
          duration_days:selected,
          page_location:window.location.href
        });
      }
    });
    setDays(selected);
  }
  function ready(){
    document.querySelectorAll('[data-vl-duration-compare]').forEach(initialize);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready);
  else ready();
})();
