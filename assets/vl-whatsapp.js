(function(){
  'use strict';
  var PHONE='34698612614';
  var MESSAGE='Hola, tengo una consulta sobre un seguro de viaje en ViajeroLatam.';
  var STICKY_SELECTORS='.mobile-affiliate-bar,.mobile-sticky,.mobile-cta,.vl-mobile-sticky-cta,.vl-ve-mobile-sticky';

  function initWhatsApp(){
    if(!document.body || document.querySelector('.vl-whatsapp-float')) return;

    if(document.querySelector(STICKY_SELECTORS)){
      document.documentElement.classList.add('vl-whatsapp-has-sticky');
    }

    var link=document.createElement('a');
    link.className='vl-whatsapp-float';
    link.href='https://wa.me/'+PHONE+'?text='+encodeURIComponent(MESSAGE);
    link.target='_blank';
    link.rel='noopener noreferrer';
    link.setAttribute('aria-label','Escríbenos por WhatsApp');
    link.setAttribute('title','Escríbenos por WhatsApp');
    link.innerHTML='<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false"><path d="M16.03 3.2c-7.02 0-12.73 5.64-12.73 12.58 0 2.22.59 4.39 1.71 6.29L3.2 28.8l6.93-1.79a12.83 12.83 0 0 0 5.89 1.43h.01c7.02 0 12.73-5.64 12.73-12.58S23.05 3.2 16.03 3.2Zm0 22.99h-.01a10.61 10.61 0 0 1-5.39-1.46l-.39-.23-4.11 1.06 1.1-3.96-.26-.41a10.23 10.23 0 0 1-1.61-5.41c0-5.71 4.77-10.35 10.64-10.35 5.86 0 10.63 4.64 10.63 10.35 0 5.71-4.77 10.41-10.6 10.41Zm5.84-7.78c-.32-.16-1.89-.91-2.18-1.01-.29-.11-.5-.16-.71.16-.21.31-.82 1.01-1 1.22-.18.21-.37.24-.69.08-.32-.16-1.35-.48-2.57-1.54-.95-.82-1.59-1.84-1.78-2.15-.18-.31-.02-.48.14-.64.14-.14.32-.37.48-.55.16-.18.21-.31.32-.52.11-.21.05-.39-.03-.55-.08-.16-.71-1.67-.97-2.29-.26-.62-.52-.53-.71-.54l-.61-.01c-.21 0-.55.08-.84.39-.29.31-1.1 1.06-1.1 2.57 0 1.52 1.13 2.99 1.29 3.19.16.21 2.23 3.34 5.4 4.68.75.32 1.34.51 1.8.65.76.24 1.44.2 1.99.12.61-.09 1.89-.76 2.15-1.49.26-.73.26-1.36.18-1.49-.08-.13-.29-.21-.61-.37Z"/></svg>';

    link.addEventListener('click',function(){
      if(typeof window.gtag==='function'){
        window.gtag('event','click_whatsapp',{
          event_category:'lead',
          event_label:'whatsapp_float',
          page_location:window.location.href
        });
      }
    });

    document.body.appendChild(link);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',initWhatsApp,{once:true});
  }else{
    initWhatsApp();
  }
})();
