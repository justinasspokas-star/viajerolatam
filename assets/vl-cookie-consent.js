
(function(){
  'use strict';

  var STORAGE_KEY = 'vl_cookie_consent_v1';
  var MAX_AGE_MS = 730 * 24 * 60 * 60 * 1000;

  function gtagSafe(){
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function(){ window.dataLayer.push(arguments); };
    return window.gtag;
  }

  function readConsent(){
    try{
      var raw = localStorage.getItem(STORAGE_KEY);
      if(!raw) return null;
      var data = JSON.parse(raw);
      if(!data || data.version !== 1 || !data.expiresAt || Date.now() > data.expiresAt){
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      return {
        analytics: Boolean(data.analytics),
        marketing: Boolean(data.marketing),
        savedAt: data.savedAt || Date.now(),
        expiresAt: data.expiresAt
      };
    }catch(error){
      return null;
    }
  }

  function writeConsent(preferences){
    var data = {
      version: 1,
      analytics: Boolean(preferences.analytics),
      marketing: Boolean(preferences.marketing),
      savedAt: Date.now(),
      expiresAt: Date.now() + MAX_AGE_MS
    };
    try{
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }catch(error){}
    return data;
  }

  function removeCookie(name){
    var host = location.hostname;
    var domains = [host, '.' + host, '.viajerolatam.com', 'viajerolatam.com'];
    var paths = ['/', location.pathname || '/'];
    domains.forEach(function(domain){
      paths.forEach(function(path){
        document.cookie = name + '=; Max-Age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=' + path + '; domain=' + domain + '; SameSite=Lax';
      });
    });
    document.cookie = name + '=; Max-Age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax';
  }

  function deleteMatchingCookies(prefixes){
    var cookies = document.cookie ? document.cookie.split(';') : [];
    cookies.forEach(function(item){
      var name = item.split('=')[0].trim();
      if(prefixes.some(function(prefix){ return name === prefix || name.indexOf(prefix) === 0; })){
        removeCookie(name);
      }
    });
  }

  function cleanDeniedStorage(preferences){
    if(!preferences.analytics){
      deleteMatchingCookies(['_ga', '_gid', '_gat']);
    }
    if(!preferences.marketing){
      deleteMatchingCookies(['_gcl_', '_gac_', '_gcl_au', '_gcl_aw', '_gcl_dc']);
    }
  }

  function applyConsent(preferences, persist){
    var gtag = gtagSafe();
    var analytics = preferences.analytics ? 'granted' : 'denied';
    var marketing = preferences.marketing ? 'granted' : 'denied';

    gtag('consent', 'update', {
      analytics_storage: analytics,
      ad_storage: marketing,
      ad_user_data: marketing,
      ad_personalization: marketing
    });

    cleanDeniedStorage(preferences);

    if(persist){
      writeConsent(preferences);
    }

    try{
      window.dispatchEvent(new CustomEvent('vl:consent-updated', {
        detail: {
          analytics: Boolean(preferences.analytics),
          marketing: Boolean(preferences.marketing)
        }
      }));
    }catch(error){}
  }

  function buildInterface(){
    if(document.getElementById('vl-cookie-banner')) return;

    var wrapper = document.createElement('div');
    wrapper.innerHTML =
      '<section class="vl-cookie-banner" id="vl-cookie-banner" role="dialog" aria-modal="false" aria-labelledby="vl-cookie-title" hidden>' +
        '<div class="vl-cookie-banner__inner">' +
          '<div>' +
            '<h2 class="vl-cookie-banner__title" id="vl-cookie-title">Tu privacidad, tu elección</h2>' +
            '<p class="vl-cookie-banner__text">Usamos almacenamiento necesario para guardar tus preferencias. Con tu permiso, usamos cookies analíticas para medir el uso del sitio y cookies de marketing para medir campañas. Puedes aceptar, rechazar o configurar. <a href="/politica-cookies/">Política de cookies</a>.</p>' +
          '</div>' +
          '<div class="vl-cookie-banner__actions">' +
            '<button class="vl-cookie-btn vl-cookie-btn--accept" id="vl-cookie-accept" type="button">Aceptar todas</button>' +
            '<button class="vl-cookie-btn vl-cookie-btn--reject" id="vl-cookie-reject" type="button">Rechazar todas</button>' +
            '<button class="vl-cookie-btn vl-cookie-btn--settings" id="vl-cookie-settings" type="button">Configurar</button>' +
          '</div>' +
        '</div>' +
      '</section>' +

      '<div class="vl-cookie-modal" id="vl-cookie-modal" role="dialog" aria-modal="true" aria-labelledby="vl-cookie-modal-title" hidden>' +
        '<div class="vl-cookie-dialog">' +
          '<div class="vl-cookie-dialog__head">' +
            '<div>' +
              '<h2 id="vl-cookie-modal-title">Configurar cookies</h2>' +
              '<p>Elige qué categorías permites. Las necesarias no pueden desactivarse porque guardan tu selección y permiten funciones básicas.</p>' +
            '</div>' +
            '<button class="vl-cookie-close" id="vl-cookie-close" type="button" aria-label="Cerrar configuración">×</button>' +
          '</div>' +
          '<div class="vl-cookie-dialog__body">' +
            '<div class="vl-cookie-category">' +
              '<div><h3>Necesarias</h3><p>Permiten el funcionamiento básico y conservan tu decisión de consentimiento durante un máximo de 24 meses.</p></div>' +
              '<span class="vl-cookie-always">Siempre activas</span>' +
            '</div>' +
            '<div class="vl-cookie-category">' +
              '<div><h3>Analíticas</h3><p>Google Analytics nos ayuda a conocer páginas visitadas, sesiones y uso general para mejorar ViajeroLatam.</p></div>' +
              '<label class="vl-cookie-switch"><input id="vl-cookie-analytics" type="checkbox"><span class="vl-cookie-slider"></span></label>' +
            '</div>' +
            '<div class="vl-cookie-category">' +
              '<div><h3>Marketing y medición publicitaria</h3><p>Permiten medir campañas de Google Ads y mejorar la atribución publicitaria. No son necesarias para usar la web.</p></div>' +
              '<label class="vl-cookie-switch"><input id="vl-cookie-marketing" type="checkbox"><span class="vl-cookie-slider"></span></label>' +
            '</div>' +
          '</div>' +
          '<div class="vl-cookie-dialog__foot">' +
            '<button class="vl-cookie-btn vl-cookie-btn--reject" id="vl-cookie-modal-reject" type="button">Rechazar todas</button>' +
            '<button class="vl-cookie-btn vl-cookie-btn--settings" id="vl-cookie-save" type="button">Guardar selección</button>' +
            '<button class="vl-cookie-btn vl-cookie-btn--accept" id="vl-cookie-modal-accept" type="button">Aceptar todas</button>' +
          '</div>' +
          '<a class="vl-cookie-policy-link" href="/politica-cookies/">Leer la política de cookies completa</a>' +
        '</div>' +
      '</div>' +

      '<button class="vl-cookie-reopen" id="vl-cookie-reopen" type="button" hidden>Configurar cookies</button>';

    while(wrapper.firstChild){
      document.body.appendChild(wrapper.firstChild);
    }
  }

  function init(){
    buildInterface();

    var banner = document.getElementById('vl-cookie-banner');
    var modal = document.getElementById('vl-cookie-modal');
    var reopen = document.getElementById('vl-cookie-reopen');
    var analyticsToggle = document.getElementById('vl-cookie-analytics');
    var marketingToggle = document.getElementById('vl-cookie-marketing');
    var lastFocus = null;

    function currentStoredOrDenied(){
      return readConsent() || { analytics:false, marketing:false };
    }

    function syncToggles(){
      var stored = currentStoredOrDenied();
      analyticsToggle.checked = stored.analytics;
      marketingToggle.checked = stored.marketing;
    }

    function showBanner(){
      banner.hidden = false;
      reopen.hidden = true;
    }

    function hideBanner(){
      banner.hidden = true;
      reopen.hidden = true;
    }

    function openSettings(){
      lastFocus = document.activeElement;
      syncToggles();
      modal.hidden = false;
      document.documentElement.style.overflow = 'hidden';
      setTimeout(function(){ document.getElementById('vl-cookie-close').focus(); }, 0);
    }

    function closeSettings(){
      modal.hidden = true;
      document.documentElement.style.overflow = '';
      if(lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
    }

    function save(preferences){
      applyConsent(preferences, true);
      closeSettings();
      hideBanner();
    }

    document.getElementById('vl-cookie-accept').addEventListener('click', function(){
      save({analytics:true, marketing:true});
    });
    document.getElementById('vl-cookie-reject').addEventListener('click', function(){
      save({analytics:false, marketing:false});
    });
    document.getElementById('vl-cookie-settings').addEventListener('click', openSettings);
    document.getElementById('vl-cookie-close').addEventListener('click', closeSettings);
    document.getElementById('vl-cookie-modal-reject').addEventListener('click', function(){
      save({analytics:false, marketing:false});
    });
    document.getElementById('vl-cookie-modal-accept').addEventListener('click', function(){
      save({analytics:true, marketing:true});
    });
    document.getElementById('vl-cookie-save').addEventListener('click', function(){
      save({
        analytics: analyticsToggle.checked,
        marketing: marketingToggle.checked
      });
    });
    reopen.addEventListener('click', openSettings);
    document.addEventListener('click', function(event){
      var trigger = event.target.closest('[data-vl-cookie-settings]');
      if(trigger){
        event.preventDefault();
        openSettings();
      }
    });

    modal.addEventListener('click', function(event){
      if(event.target === modal) closeSettings();
    });
    document.addEventListener('keydown', function(event){
      if(event.key === 'Escape' && !modal.hidden) closeSettings();
    });

    var stored = readConsent();
    if(stored){
      applyConsent(stored, false);
      hideBanner();
    }else{
      showBanner();
    }
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  }else{
    init();
  }
})();
