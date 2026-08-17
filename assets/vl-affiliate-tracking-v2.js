(function(){
  'use strict';

  if (window.vlAffiliateTrackingV2Installed) return;
  window.vlAffiliateTrackingV2Installed = true;

  var CONSENT_KEY = 'vl_cookie_consent_v1';
  var ENTRY_KEY = 'vl_affiliate_entry_v2';
  var LAST_CLICK_KEY = 'vl_last_affiliate_click_v2';

  function safeJson(raw){
    try { return JSON.parse(raw); } catch(e) { return null; }
  }

  function analyticsAllowed(){
    try {
      var data = safeJson(localStorage.getItem(CONSENT_KEY));
      return !!(data && data.analytics === true && (!data.expiresAt || Date.now() <= data.expiresAt));
    } catch(e) {
      return false;
    }
  }

  function clean(value, max){
    var text = String(value == null ? '' : value).trim();
    if (max && text.length > max) text = text.slice(0, max);
    return text;
  }

  function slugFromPath(pathname){
    var p = String(pathname || '/').replace(/^\/+|\/+$/g, '');
    if (!p) return 'home';
    return p.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 80) || 'page';
  }

  function referrerHost(){
    try { return document.referrer ? new URL(document.referrer).hostname : ''; }
    catch(e) { return ''; }
  }

  function queryValue(names){
    try {
      var q = new URLSearchParams(location.search);
      for (var i = 0; i < names.length; i++) {
        var v = q.get(names[i]);
        if (v) return clean(v, 80).toLowerCase();
      }
    } catch(e) {}
    return '';
  }

  function trafficHint(){
    var source = queryValue(['utm_source']);
    var medium = queryValue(['utm_medium']);
    if (source || medium) return clean((source || 'unknown') + ' / ' + (medium || 'unknown'), 100);
    try {
      var q = new URLSearchParams(location.search);
      if (q.get('gclid')) return 'google / cpc';
      if (q.get('msclkid')) return 'bing / cpc';
    } catch(e) {}
    var ref = referrerHost();
    return ref ? clean(ref + ' / referral_or_organic', 100) : '(direct) / (none)';
  }

  function currentRoute(){
    var origin = queryValue(['origen','origin','from']);
    var destination = queryValue(['destino','destination','to']);
    if (!origin || !destination) {
      var path = String(location.pathname || '').toLowerCase();
      var m = path.match(/\/seguro-viaje\/([^/]+)-a-([^/]+)\/?$/);
      if (m) {
        if (!origin) origin = m[1];
        if (!destination) destination = m[2];
      }
    }
    return { origin: clean(origin, 60), destination: clean(destination, 60) };
  }

  function ensureEntry(){
    if (!analyticsAllowed()) return null;
    try {
      var existing = safeJson(sessionStorage.getItem(ENTRY_KEY));
      if (existing && existing.entry_path) return existing;
      var route = currentRoute();
      var entry = {
        entry_path: clean(location.pathname + location.search, 100),
        entry_page: slugFromPath(location.pathname),
        referrer_host: clean(referrerHost(), 100),
        traffic_hint: trafficHint(),
        utm_source: queryValue(['utm_source']),
        utm_medium: queryValue(['utm_medium']),
        utm_campaign: queryValue(['utm_campaign']),
        route_origin: route.origin,
        route_destination: route.destination,
        captured_at: new Date().toISOString()
      };
      sessionStorage.setItem(ENTRY_KEY, JSON.stringify(entry));
      return entry;
    } catch(e) {
      return null;
    }
  }

  function partnerFromHref(href){
    var h = String(href || '').toLowerCase();
    if (h.indexOf('iatiseguros.com') !== -1) return 'iati';
    if (h.indexOf('intermundial.es') !== -1) return 'intermundial';
    if (h.indexOf('tradedoubler.com') !== -1 && h.indexOf('301095') !== -1) return 'holins';
    if (h.indexOf('tradedoubler.com') !== -1 && h.indexOf('343758') !== -1) return 'axa';
    if (h.indexOf('saily.com') !== -1) return 'saily';
    return '';
  }

  function createClickId(){
    try {
      if (window.crypto && typeof window.crypto.getRandomValues === 'function') {
        var arr = new Uint32Array(2);
        window.crypto.getRandomValues(arr);
        return 'vlc_' + Date.now().toString(36) + '_' + arr[0].toString(36) + arr[1].toString(36);
      }
    } catch(e) {}
    return 'vlc_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 12);
  }

  function partnerLinkPosition(link, partner){
    try {
      var links = Array.prototype.slice.call(document.querySelectorAll('a[href]')).filter(function(a){
        return partnerFromHref(a.href || a.getAttribute('href')) === partner;
      });
      var idx = links.indexOf(link);
      return idx >= 0 ? idx + 1 : 1;
    } catch(e) { return 1; }
  }

  function decorateIntermundial(link, clickId, sourcePage, linkPosition, route){
    try {
      var url = new URL(link.href, location.href);
      url.searchParams.set('vl_site', 'viajerolatam');
      url.searchParams.set('vl_partner', 'intermundial');
      url.searchParams.set('vl_page', sourcePage);
      url.searchParams.set('vl_link', String(linkPosition));
      url.searchParams.set('vl_click_id', clickId);
      if (route.origin) url.searchParams.set('vl_origin', route.origin);
      if (route.destination) url.searchParams.set('vl_destination', route.destination);
      link.href = url.toString();
    } catch(e) {}
  }

  function sendEvent(partner, clickId, link, sourcePage, linkPosition, entry, route){
    if (typeof window.gtag !== 'function') return;
    var eventName = 'affiliate_click_' + partner + '_v2';
    var outboundHost = '';
    try { outboundHost = new URL(link.href, location.href).hostname; } catch(e) {}

    var params = {
      event_category: 'affiliate_v2',
      affiliate_partner: clean(partner, 40),
      affiliate_click_id: clean(clickId, 80),
      source_page: clean(sourcePage, 80),
      source_path: clean(location.pathname, 100),
      entry_page: clean(entry && entry.entry_page, 80),
      entry_path: clean(entry && entry.entry_path, 100),
      traffic_hint: clean(entry && entry.traffic_hint, 100),
      entry_referrer_host: clean(entry && entry.referrer_host, 100),
      route_origin: clean(route.origin || (entry && entry.route_origin), 60),
      route_destination: clean(route.destination || (entry && entry.route_destination), 60),
      link_position: linkPosition,
      link_text: clean(link.textContent || link.getAttribute('aria-label') || '', 100),
      outbound_host: clean(outboundHost, 100),
      transport_type: 'beacon'
    };

    try { window.gtag('event', eventName, params); } catch(e) {}

    try {
      localStorage.setItem(LAST_CLICK_KEY, JSON.stringify({
        event_name: eventName,
        affiliate_partner: partner,
        affiliate_click_id: clickId,
        source_page: sourcePage,
        source_path: location.pathname,
        entry_page: entry && entry.entry_page || '',
        entry_path: entry && entry.entry_path || '',
        route_origin: params.route_origin,
        route_destination: params.route_destination,
        outbound_host: outboundHost,
        clicked_at: new Date().toISOString()
      }));
    } catch(e) {}
  }

  function handleAffiliateClick(event){
    var link = event.target && event.target.closest ? event.target.closest('a[href]') : null;
    if (!link) return;
    var partner = partnerFromHref(link.href || link.getAttribute('href'));
    if (!partner) return;

    if (!analyticsAllowed()) return;

    var entry = ensureEntry() || {};
    var sourcePage = slugFromPath(location.pathname);
    var route = currentRoute();
    var clickId = createClickId();
    var linkPosition = partnerLinkPosition(link, partner);

    link.setAttribute('data-vl-affiliate-v2', partner);
    link.setAttribute('data-vl-click-id', clickId);

    if (partner === 'intermundial') {
      decorateIntermundial(link, clickId, sourcePage, linkPosition, route);
    }

    sendEvent(partner, clickId, link, sourcePage, linkPosition, entry, route);
  }

  document.addEventListener('click', handleAffiliateClick, true);

  function init(){ ensureEntry(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.addEventListener('vl:consent-updated', function(e){
    if (e && e.detail && e.detail.analytics) ensureEntry();
  });
})();
