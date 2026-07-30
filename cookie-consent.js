(function(){
  'use strict';
  var GA_ID = 'G-P1Q2TSMVNJ';
  var STORAGE_KEY = 'vl_cookie_consent_v1';
  var SCRIPT_ID = 'vl-ga4-loader';
  var loadedGA = false;
  window.dataLayer = window.dataLayer || [];
  function getStoredConsent(){ try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch(e){ return null; } }
  function hasAnalyticsConsent(){ var c = getStoredConsent(); return !!(c && c.analytics === true); }
  window.gtag = window.gtag || function(){ var args = Array.prototype.slice.call(arguments); if(args[0] === 'event' && !hasAnalyticsConsent()) return; window.dataLayer.push(arguments); };
  gtag('consent', 'default', {'analytics_storage':'denied','ad_storage':'denied','ad_user_data':'denied','ad_personalization':'denied','functionality_storage':'granted','security_storage':'granted'});
  gtag('set', 'ads_data_redaction', true);
  function deleteCookieName(name){
    var host = location.hostname;
    var domains = [host, '.' + host.replace(/^www\./,'')];
    var paths = ['/', location.pathname || '/'];
    domains.forEach(function(domain){ paths.forEach(function(path){ document.cookie = name + '=; Max-Age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=' + path + '; domain=' + domain + '; SameSite=Lax'; }); });
    document.cookie = name + '=; Max-Age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax';
  }
  function clearAnalyticsCookies(){
    var names = ['_ga','_gid','_gat','_gac_' + GA_ID.replace(/-/g,'_')];
    document.cookie.split(';').forEach(function(cookie){ var name = cookie.split('=')[0].trim(); if(/^_ga/.test(name) || /^_gid/.test(name) || /^_gat/.test(name) || /^_gcl/.test(name)) names.push(name); });
    names.filter(Boolean).forEach(deleteCookieName);
  }
  function loadGA(){
    if(loadedGA || document.getElementById(SCRIPT_ID)) return;
    loadedGA = true;
    var s = document.createElement('script'); s.id = SCRIPT_ID; s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA_ID); document.head.appendChild(s);
    gtag('js', new Date());
    gtag('config', GA_ID, {'anonymize_ip': true, 'send_page_view': true});
  }
  function setConsent(analytics){
    var value = analytics ? 'granted' : 'denied';
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({analytics: !!analytics, updatedAt: new Date().toISOString()})); } catch(e){}
    gtag('consent', 'update', {'analytics_storage': value,'ad_storage':'denied','ad_user_data':'denied','ad_personalization':'denied','functionality_storage':'granted','security_storage':'granted'});
    if(analytics){ loadGA(); try { gtag('event', 'cookie_consent_update', {consent_analytics: 'granted'}); } catch(e){} } else { clearAnalyticsCookies(); }
    hideBanner(); hideSettingsButton();
  }
  function bannerHtml(){ return '<div class="vl-cookie-card" role="dialog" aria-modal="true" aria-labelledby="vl-cookie-title"><div class="vl-cookie-text"><strong id="vl-cookie-title">Privacidad y cookies</strong><p>Usamos cookies técnicas necesarias y, solo si aceptas, cookies analíticas de Google Analytics para medir visitas y mejorar ViajeroLatam. Puedes aceptar, rechazar o configurar tu elección.</p><a href="/cookies/">Ver política de cookies</a></div><div class="vl-cookie-actions"><button type="button" class="vl-cookie-btn secondary" data-vl-cookie="reject">Rechazar no esenciales</button><button type="button" class="vl-cookie-btn ghost" data-vl-cookie="settings">Configurar</button><button type="button" class="vl-cookie-btn primary" data-vl-cookie="accept">Aceptar todas</button></div></div>'; }
  function modalHtml(){ var checked = hasAnalyticsConsent() ? 'checked' : ''; return '<div class="vl-cookie-modal-backdrop" id="vlCookieModal"><div class="vl-cookie-modal" role="dialog" aria-modal="true" aria-labelledby="vl-cookie-modal-title"><button type="button" class="vl-cookie-close" data-vl-cookie="close" aria-label="Cerrar">×</button><h2 id="vl-cookie-modal-title">Configurar cookies</h2><div class="vl-cookie-option locked"><div><strong>Cookies técnicas necesarias</strong><p>Necesarias para que la web funcione. No se pueden desactivar desde este panel.</p></div><span>Siempre activas</span></div><label class="vl-cookie-option"><div><strong>Cookies analíticas</strong><p>Permiten medir visitas, páginas vistas y clics importantes con Google Analytics.</p></div><input id="vlAnalyticsToggle" type="checkbox" ' + checked + ' /></label><p class="vl-cookie-small">Puedes cambiar tu decisión más adelante desde la Política de cookies.</p><div class="vl-cookie-modal-actions"><button type="button" class="vl-cookie-btn secondary" data-vl-cookie="reject">Rechazar no esenciales</button><button type="button" class="vl-cookie-btn primary" data-vl-cookie="save">Guardar configuración</button><button type="button" class="vl-cookie-btn primary alt" data-vl-cookie="accept">Aceptar todas</button></div></div></div>'; }
  function showBanner(){ if(document.getElementById('vlCookieBanner')) return; var el = document.createElement('div'); el.id = 'vlCookieBanner'; el.className = 'vl-cookie-banner'; el.innerHTML = bannerHtml(); document.body.appendChild(el); }
  function hideBanner(){ var el = document.getElementById('vlCookieBanner'); if(el) el.remove(); var modal = document.getElementById('vlCookieModal'); if(modal) modal.remove(); }
  function openSettings(){ var old = document.getElementById('vlCookieModal'); if(old) old.remove(); var wrap = document.createElement('div'); wrap.innerHTML = modalHtml(); document.body.appendChild(wrap.firstChild); }
  function showSettingsButton(){ if(document.getElementById('vlCookieSettingsBtn')) return; var btn = document.createElement('button'); btn.id = 'vlCookieSettingsBtn'; btn.className = 'vl-cookie-settings-btn'; btn.type = 'button'; btn.textContent = 'Cookies'; btn.setAttribute('aria-label','Cambiar configuración de cookies'); btn.addEventListener('click', openSettings); document.body.appendChild(btn); }
  function hideSettingsButton(){ var btn = document.getElementById('vlCookieSettingsBtn'); if(btn) btn.remove(); }
  document.addEventListener('click', function(e){ var btn = e.target.closest('[data-vl-cookie]'); if(!btn) return; var action = btn.getAttribute('data-vl-cookie'); if(action === 'accept') setConsent(true); if(action === 'reject') setConsent(false); if(action === 'settings') openSettings(); if(action === 'close') { var modal = document.getElementById('vlCookieModal'); if(modal) modal.remove(); } if(action === 'save') { var toggle = document.getElementById('vlAnalyticsToggle'); setConsent(!!(toggle && toggle.checked)); } });
  document.addEventListener('DOMContentLoaded', function(){ var consent = getStoredConsent(); if(consent && consent.analytics === true){ gtag('consent', 'update', {'analytics_storage': 'granted'}); loadGA(); hideSettingsButton(); } else if(consent && consent.analytics === false){ clearAnalyticsCookies(); hideSettingsButton(); } else { showBanner(); } });
  window.vlCookieConsent = { open: openSettings, acceptAll: function(){ setConsent(true); }, rejectNonEssential: function(){ setConsent(false); }, reset: function(){ try{localStorage.removeItem(STORAGE_KEY);}catch(e){}; clearAnalyticsCookies(); hideSettingsButton(); showBanner(); } };
})();
