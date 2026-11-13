/* Conversiones editoriales de moneda; no afectan a primas ni enlaces. */
(function(){
  'use strict';
  var fx=window.VLExchangeRates;
  var nodes=document.querySelectorAll('[data-vl-fx-rate],[data-vl-fx-single],[data-vl-fx-range]');
  if(!fx||!nodes.length)return;
  function render(){
    nodes.forEach(function(node){
      var code=(node.getAttribute('data-vl-fx-code')||node.getAttribute('data-vl-fx-rate')||'').toUpperCase();
      var r=fx.rate(code);
      if(r===null||!Number.isFinite(r)||r<=0){node.textContent='equivalencia en '+code+' no disponible';return;}
      function money(v){var step=code==='COP'?1000:code==='ARS'?100:1;return '$'+(Math.round(Number(v)*r/step)*step).toLocaleString(code==='ARS'?'es-AR':'es-CO');}
      if(node.hasAttribute('data-vl-fx-rate'))node.textContent='1 € ≈ $'+Math.round(r).toLocaleString(code==='ARS'?'es-AR':'es-CO')+' '+code;
      else if(node.hasAttribute('data-vl-fx-single'))node.textContent=money(node.getAttribute('data-vl-fx-single'))+' '+code;
      else{var n=node.getAttribute('data-vl-fx-range').split(',');node.textContent=money(n[0])+'–'+money(n[1])+' '+code+' aprox.';}
      var date=fx.date(code);if(date)node.title='Cambio EUR/'+code+' de referencia '+date+'. Precio final en la aseguradora.';
    });
  }
  render();
  fx.load().then(render).catch(render);
})();
