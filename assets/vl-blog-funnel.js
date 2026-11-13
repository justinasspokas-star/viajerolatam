/* ViajeroLatam: embudo del botón flotante del blog hacia aseguradoras.
 * Respeta consentimiento analítico y no cambia enlaces ni cotizaciones.
 * Flujo: blog_sticky_click -> blog_comparator_view -> blog_search_submit
 *        -> blog_results_view -> blog_affiliate_click.
 */
(function(){
  'use strict';

  var KEY = 'vl_blog_funnel_v1';
  var CONSENT_KEY = 'vl_cookie_consent_v1';
  var TTL = 30 * 60 * 1000;
  var path = window.location.pathname;

  function consentGranted(){
    try{
      var data = JSON.parse(window.localStorage.getItem(CONSENT_KEY) || 'null');
      return !!(data && data.version === 1 && data.analytics === true &&
        data.expiresAt && data.expiresAt > Date.now());
    }catch(e){ return false; }
  }
  function clear(){
    try{ window.sessionStorage.removeItem(KEY); }catch(e){}
  }
  function save(flow){
    try{ window.sessionStorage.setItem(KEY, JSON.stringify(flow)); }catch(e){}
  }
  function read(){
    if(!consentGranted()){ clear(); return null; }
    try{
      var flow = JSON.parse(window.sessionStorage.getItem(KEY) || 'null');
      if(!flow || typeof flow.source_page !== 'string' ||
         flow.source_page.indexOf('/blog/') !== 0 ||
         !flow.started_at || Date.now() - flow.started_at > TTL ||
         Date.now() < flow.started_at){
        clear();
        return null;
      }
      return flow;
    }catch(e){ clear(); return null; }
  }
  function emit(name, flow, extra){
    if(!consentGranted() || typeof window.gtag !== 'function') return;
    var params = {
      event_category: 'blog_comparison_funnel',
      source_page: flow.source_page,
      entry_point: 'blog_mobile_sticky',
      page_path: path,
      transport_type: 'beacon'
    };
    if(extra) Object.keys(extra).forEach(function(key){ params[key] = extra[key]; });
    window.gtag('event', name, params);
  }
  function isHome(){
    return path === '/';
  }
  function isResults(){
    return path === '/resultados/' || path === '/resultados/index.html';
  }
  function sourceFromCard(link){
    var card = link.closest('.card');
    var name = card && card.querySelector('.card-name');
    return name ? name.textContent.trim().toLowerCase()
      .replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'') : 'unknown';
  }
  function init(){
    var sticky = document.getElementById('vl-blog-mobile-home-compare');
    if(sticky){
      sticky.addEventListener('click',function(event){
        var link = event.target.closest('a[href="/#comparar"]');
        if(!link) return;
        if(!consentGranted()){ clear(); return; }
        var flow = {
          source_page: path,
          started_at: Date.now(),
          stage: 'clicked'
        };
        save(flow);
        emit('blog_sticky_click', flow, {cta_target: '/#comparar'});
      });
    }

    if(isHome()){
      var flow = read();
      if(flow && flow.stage === 'clicked' && window.location.hash === '#comparar'){
        emit('blog_comparator_view',flow,{landing_path:'/#comparar'});
        flow.stage = 'landed';
        save(flow);
      }
      var form = document.getElementById('vl-search-form');
      if(form){
        form.addEventListener('submit',function(){
          var current = read();
          if(!current || current.stage !== 'landed' || !form.checkValidity()) return;
          var origin = document.getElementById('sb-origen');
          var destination = document.getElementById('sb-destino');
          var country = document.getElementById('vl-pais-destino');
          var days = document.getElementById('sb-dias');
          emit('blog_search_submit',current,{
            route_origin: origin ? origin.value : '',
            route_destination: destination ? destination.value : '',
            country_destination: country ? country.value : '',
            trip_days: days && Number(days.value) > 0 ? Number(days.value) : undefined
          });
          current.stage = 'submitted';
          save(current);
        });
      }
    }

    if(isResults()){
      var flowResults = read();
      if(flowResults && flowResults.stage === 'submitted'){
        emit('blog_results_view',flowResults,{results_path:'/resultados/'});
        flowResults.stage = 'results';
        save(flowResults);
      }
      document.addEventListener('click',function(event){
        var link = event.target.closest('a.btn-contract[href]');
        if(!link || link.classList.contains('disabled') ||
           link.getAttribute('aria-disabled') === 'true') return;
        var current = read();
        if(!current || current.stage !== 'results') return;
        emit('blog_affiliate_click',current,{
          affiliate_partner: sourceFromCard(link),
          outbound_domain: (function(){
            try{ return new URL(link.href,window.location.href).hostname; }
            catch(e){ return ''; }
          })()
        });
      });
    }
  }

  window.addEventListener('vl:consent-updated',function(event){
    if(event.detail && event.detail.analytics === false) clear();
  });
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
