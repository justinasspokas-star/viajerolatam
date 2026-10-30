/* ViajeroLatam — países y regiones con sugerencias, sin API externa. */
(function(){
'use strict';
const COUNTRIES={"af":{"label":"Afganistán","flag":"🇦🇫"},"al":{"label":"Albania","flag":"🇦🇱"},"de":{"label":"Alemania","flag":"🇩🇪"},"ad":{"label":"Andorra","flag":"🇦🇩"},"ao":{"label":"Angola","flag":"🇦🇴"},"ai":{"label":"Anguila","flag":"🇦🇮"},"ag":{"label":"Antigua y Barbuda","flag":"🇦🇬"},"aq":{"label":"Antártida","flag":"🇦🇶"},"sa":{"label":"Arabia Saudí","flag":"🇸🇦"},"dz":{"label":"Argelia","flag":"🇩🇿"},"ar":{"label":"Argentina","flag":"🇦🇷"},"am":{"label":"Armenia","flag":"🇦🇲"},"aw":{"label":"Aruba","flag":"🇦🇼"},"au":{"label":"Australia","flag":"🇦🇺"},"at":{"label":"Austria","flag":"🇦🇹"},"az":{"label":"Azerbaiyán","flag":"🇦🇿"},"bs":{"label":"Bahamas","flag":"🇧🇸"},"bd":{"label":"Bangladés","flag":"🇧🇩"},"bb":{"label":"Barbados","flag":"🇧🇧"},"bh":{"label":"Baréin","flag":"🇧🇭"},"bz":{"label":"Belice","flag":"🇧🇿"},"bj":{"label":"Benín","flag":"🇧🇯"},"bm":{"label":"Bermudas","flag":"🇧🇲"},"by":{"label":"Bielorrusia","flag":"🇧🇾"},"bo":{"label":"Bolivia","flag":"🇧🇴"},"ba":{"label":"Bosnia y Herzegovina","flag":"🇧🇦"},"bw":{"label":"Botsuana","flag":"🇧🇼"},"br":{"label":"Brasil","flag":"🇧🇷"},"bn":{"label":"Brunéi","flag":"🇧🇳"},"bg":{"label":"Bulgaria","flag":"🇧🇬"},"bf":{"label":"Burkina Faso","flag":"🇧🇫"},"bi":{"label":"Burundi","flag":"🇧🇮"},"bt":{"label":"Bután","flag":"🇧🇹"},"be":{"label":"Bélgica","flag":"🇧🇪"},"cv":{"label":"Cabo Verde","flag":"🇨🇻"},"kh":{"label":"Camboya","flag":"🇰🇭"},"cm":{"label":"Camerún","flag":"🇨🇲"},"ca":{"label":"Canadá","flag":"🇨🇦"},"bq":{"label":"Caribe neerlandés","flag":"🇧🇶"},"qa":{"label":"Catar","flag":"🇶🇦"},"td":{"label":"Chad","flag":"🇹🇩"},"cz":{"label":"Chequia","flag":"🇨🇿"},"cl":{"label":"Chile","flag":"🇨🇱"},"cn":{"label":"China","flag":"🇨🇳"},"cy":{"label":"Chipre","flag":"🇨🇾"},"va":{"label":"Ciudad del Vaticano","flag":"🇻🇦"},"co":{"label":"Colombia","flag":"🇨🇴"},"km":{"label":"Comoras","flag":"🇰🇲"},"cg":{"label":"Congo","flag":"🇨🇬"},"kp":{"label":"Corea del Norte","flag":"🇰🇵"},"kr":{"label":"Corea del Sur","flag":"🇰🇷"},"cr":{"label":"Costa Rica","flag":"🇨🇷"},"hr":{"label":"Croacia","flag":"🇭🇷"},"cu":{"label":"Cuba","flag":"🇨🇺"},"cw":{"label":"Curazao","flag":"🇨🇼"},"ci":{"label":"Côte d’Ivoire","flag":"🇨🇮"},"dk":{"label":"Dinamarca","flag":"🇩🇰"},"dm":{"label":"Dominica","flag":"🇩🇲"},"ec":{"label":"Ecuador","flag":"🇪🇨"},"eg":{"label":"Egipto","flag":"🇪🇬"},"sv":{"label":"El Salvador","flag":"🇸🇻"},"ae":{"label":"Emiratos Árabes Unidos","flag":"🇦🇪"},"er":{"label":"Eritrea","flag":"🇪🇷"},"sk":{"label":"Eslovaquia","flag":"🇸🇰"},"si":{"label":"Eslovenia","flag":"🇸🇮"},"es":{"label":"España","flag":"🇪🇸"},"us":{"label":"Estados Unidos","flag":"🇺🇸"},"ee":{"label":"Estonia","flag":"🇪🇪"},"sz":{"label":"Esuatini","flag":"🇸🇿"},"et":{"label":"Etiopía","flag":"🇪🇹"},"ph":{"label":"Filipinas","flag":"🇵🇭"},"fi":{"label":"Finlandia","flag":"🇫🇮"},"fj":{"label":"Fiyi","flag":"🇫🇯"},"fr":{"label":"Francia","flag":"🇫🇷"},"ga":{"label":"Gabón","flag":"🇬🇦"},"gm":{"label":"Gambia","flag":"🇬🇲"},"ge":{"label":"Georgia","flag":"🇬🇪"},"gh":{"label":"Ghana","flag":"🇬🇭"},"gi":{"label":"Gibraltar","flag":"🇬🇮"},"gd":{"label":"Granada","flag":"🇬🇩"},"gr":{"label":"Grecia","flag":"🇬🇷"},"gl":{"label":"Groenlandia","flag":"🇬🇱"},"gp":{"label":"Guadalupe","flag":"🇬🇵"},"gu":{"label":"Guam","flag":"🇬🇺"},"gt":{"label":"Guatemala","flag":"🇬🇹"},"gf":{"label":"Guayana Francesa","flag":"🇬🇫"},"gg":{"label":"Guernesey","flag":"🇬🇬"},"gn":{"label":"Guinea","flag":"🇬🇳"},"gq":{"label":"Guinea Ecuatorial","flag":"🇬🇶"},"gw":{"label":"Guinea-Bisáu","flag":"🇬🇼"},"gy":{"label":"Guyana","flag":"🇬🇾"},"ht":{"label":"Haití","flag":"🇭🇹"},"hn":{"label":"Honduras","flag":"🇭🇳"},"hu":{"label":"Hungría","flag":"🇭🇺"},"in":{"label":"India","flag":"🇮🇳"},"id":{"label":"Indonesia","flag":"🇮🇩"},"iq":{"label":"Irak","flag":"🇮🇶"},"ie":{"label":"Irlanda","flag":"🇮🇪"},"ir":{"label":"Irán","flag":"🇮🇷"},"bv":{"label":"Isla Bouvet","flag":"🇧🇻"},"im":{"label":"Isla de Man","flag":"🇮🇲"},"cx":{"label":"Isla de Navidad","flag":"🇨🇽"},"nf":{"label":"Isla Norfolk","flag":"🇳🇫"},"is":{"label":"Islandia","flag":"🇮🇸"},"ax":{"label":"Islas Aland","flag":"🇦🇽"},"ky":{"label":"Islas Caimán","flag":"🇰🇾"},"cc":{"label":"Islas Cocos","flag":"🇨🇨"},"ck":{"label":"Islas Cook","flag":"🇨🇰"},"fo":{"label":"Islas Feroe","flag":"🇫🇴"},"gs":{"label":"Islas Georgia del Sur y Sandwich del Sur","flag":"🇬🇸"},"hm":{"label":"Islas Heard y McDonald","flag":"🇭🇲"},"fk":{"label":"Islas Malvinas","flag":"🇫🇰"},"mp":{"label":"Islas Marianas del Norte","flag":"🇲🇵"},"mh":{"label":"Islas Marshall","flag":"🇲🇭"},"um":{"label":"Islas menores alejadas de EE. UU.","flag":"🇺🇲"},"pn":{"label":"Islas Pitcairn","flag":"🇵🇳"},"sb":{"label":"Islas Salomón","flag":"🇸🇧"},"tc":{"label":"Islas Turcas y Caicos","flag":"🇹🇨"},"vg":{"label":"Islas Vírgenes Británicas","flag":"🇻🇬"},"vi":{"label":"Islas Vírgenes de EE. UU.","flag":"🇻🇮"},"il":{"label":"Israel","flag":"🇮🇱"},"it":{"label":"Italia","flag":"🇮🇹"},"jm":{"label":"Jamaica","flag":"🇯🇲"},"jp":{"label":"Japón","flag":"🇯🇵"},"je":{"label":"Jersey","flag":"🇯🇪"},"jo":{"label":"Jordania","flag":"🇯🇴"},"kz":{"label":"Kazajistán","flag":"🇰🇿"},"ke":{"label":"Kenia","flag":"🇰🇪"},"kg":{"label":"Kirguistán","flag":"🇰🇬"},"ki":{"label":"Kiribati","flag":"🇰🇮"},"kw":{"label":"Kuwait","flag":"🇰🇼"},"la":{"label":"Laos","flag":"🇱🇦"},"ls":{"label":"Lesoto","flag":"🇱🇸"},"lv":{"label":"Letonia","flag":"🇱🇻"},"lr":{"label":"Liberia","flag":"🇱🇷"},"ly":{"label":"Libia","flag":"🇱🇾"},"li":{"label":"Liechtenstein","flag":"🇱🇮"},"lt":{"label":"Lituania","flag":"🇱🇹"},"lu":{"label":"Luxemburgo","flag":"🇱🇺"},"lb":{"label":"Líbano","flag":"🇱🇧"},"mk":{"label":"Macedonia del Norte","flag":"🇲🇰"},"mg":{"label":"Madagascar","flag":"🇲🇬"},"my":{"label":"Malasia","flag":"🇲🇾"},"mw":{"label":"Malaui","flag":"🇲🇼"},"mv":{"label":"Maldivas","flag":"🇲🇻"},"ml":{"label":"Mali","flag":"🇲🇱"},"mt":{"label":"Malta","flag":"🇲🇹"},"ma":{"label":"Marruecos","flag":"🇲🇦"},"mq":{"label":"Martinica","flag":"🇲🇶"},"mu":{"label":"Mauricio","flag":"🇲🇺"},"mr":{"label":"Mauritania","flag":"🇲🇷"},"yt":{"label":"Mayotte","flag":"🇾🇹"},"fm":{"label":"Micronesia","flag":"🇫🇲"},"md":{"label":"Moldavia","flag":"🇲🇩"},"mn":{"label":"Mongolia","flag":"🇲🇳"},"me":{"label":"Montenegro","flag":"🇲🇪"},"ms":{"label":"Montserrat","flag":"🇲🇸"},"mz":{"label":"Mozambique","flag":"🇲🇿"},"mm":{"label":"Myanmar (Birmania)","flag":"🇲🇲"},"mx":{"label":"México","flag":"🇲🇽"},"mc":{"label":"Mónaco","flag":"🇲🇨"},"na":{"label":"Namibia","flag":"🇳🇦"},"nr":{"label":"Nauru","flag":"🇳🇷"},"np":{"label":"Nepal","flag":"🇳🇵"},"ni":{"label":"Nicaragua","flag":"🇳🇮"},"ng":{"label":"Nigeria","flag":"🇳🇬"},"nu":{"label":"Niue","flag":"🇳🇺"},"no":{"label":"Noruega","flag":"🇳🇴"},"nc":{"label":"Nueva Caledonia","flag":"🇳🇨"},"nz":{"label":"Nueva Zelanda","flag":"🇳🇿"},"ne":{"label":"Níger","flag":"🇳🇪"},"om":{"label":"Omán","flag":"🇴🇲"},"pk":{"label":"Pakistán","flag":"🇵🇰"},"pw":{"label":"Palaos","flag":"🇵🇼"},"pa":{"label":"Panamá","flag":"🇵🇦"},"pg":{"label":"Papúa Nueva Guinea","flag":"🇵🇬"},"py":{"label":"Paraguay","flag":"🇵🇾"},"nl":{"label":"Países Bajos","flag":"🇳🇱"},"pe":{"label":"Perú","flag":"🇵🇪"},"pf":{"label":"Polinesia Francesa","flag":"🇵🇫"},"pl":{"label":"Polonia","flag":"🇵🇱"},"pt":{"label":"Portugal","flag":"🇵🇹"},"pr":{"label":"Puerto Rico","flag":"🇵🇷"},"hk":{"label":"RAE de Hong Kong (China)","flag":"🇭🇰"},"mo":{"label":"RAE de Macao (China)","flag":"🇲🇴"},"gb":{"label":"Reino Unido","flag":"🇬🇧"},"cf":{"label":"República Centroafricana","flag":"🇨🇫"},"cd":{"label":"República Democrática del Congo","flag":"🇨🇩"},"do":{"label":"República Dominicana","flag":"🇩🇴"},"re":{"label":"Reunión","flag":"🇷🇪"},"rw":{"label":"Ruanda","flag":"🇷🇼"},"ro":{"label":"Rumanía","flag":"🇷🇴"},"ru":{"label":"Rusia","flag":"🇷🇺"},"ws":{"label":"Samoa","flag":"🇼🇸"},"as":{"label":"Samoa Americana","flag":"🇦🇸"},"bl":{"label":"San Bartolomé","flag":"🇧🇱"},"kn":{"label":"San Cristóbal y Nieves","flag":"🇰🇳"},"sm":{"label":"San Marino","flag":"🇸🇲"},"mf":{"label":"San Martín","flag":"🇲🇫"},"pm":{"label":"San Pedro y Miquelón","flag":"🇵🇲"},"vc":{"label":"San Vicente y las Granadinas","flag":"🇻🇨"},"sh":{"label":"Santa Elena","flag":"🇸🇭"},"lc":{"label":"Santa Lucía","flag":"🇱🇨"},"st":{"label":"Santo Tomé y Príncipe","flag":"🇸🇹"},"sn":{"label":"Senegal","flag":"🇸🇳"},"rs":{"label":"Serbia","flag":"🇷🇸"},"sc":{"label":"Seychelles","flag":"🇸🇨"},"sl":{"label":"Sierra Leona","flag":"🇸🇱"},"sg":{"label":"Singapur","flag":"🇸🇬"},"sx":{"label":"Sint Maarten","flag":"🇸🇽"},"sy":{"label":"Siria","flag":"🇸🇾"},"so":{"label":"Somalia","flag":"🇸🇴"},"lk":{"label":"Sri Lanka","flag":"🇱🇰"},"za":{"label":"Sudáfrica","flag":"🇿🇦"},"sd":{"label":"Sudán","flag":"🇸🇩"},"ss":{"label":"Sudán del Sur","flag":"🇸🇸"},"se":{"label":"Suecia","flag":"🇸🇪"},"ch":{"label":"Suiza","flag":"🇨🇭"},"sr":{"label":"Surinam","flag":"🇸🇷"},"sj":{"label":"Svalbard y Jan Mayen","flag":"🇸🇯"},"eh":{"label":"Sáhara Occidental","flag":"🇪🇭"},"th":{"label":"Tailandia","flag":"🇹🇭"},"tw":{"label":"Taiwán","flag":"🇹🇼"},"tz":{"label":"Tanzania","flag":"🇹🇿"},"tj":{"label":"Tayikistán","flag":"🇹🇯"},"io":{"label":"Territorio Británico del Océano Índico","flag":"🇮🇴"},"tf":{"label":"Territorios Australes Franceses","flag":"🇹🇫"},"ps":{"label":"Territorios Palestinos","flag":"🇵🇸"},"tl":{"label":"Timor-Leste","flag":"🇹🇱"},"tg":{"label":"Togo","flag":"🇹🇬"},"tk":{"label":"Tokelau","flag":"🇹🇰"},"to":{"label":"Tonga","flag":"🇹🇴"},"tt":{"label":"Trinidad y Tobago","flag":"🇹🇹"},"tm":{"label":"Turkmenistán","flag":"🇹🇲"},"tr":{"label":"Turquía","flag":"🇹🇷"},"tv":{"label":"Tuvalu","flag":"🇹🇻"},"tn":{"label":"Túnez","flag":"🇹🇳"},"ua":{"label":"Ucrania","flag":"🇺🇦"},"ug":{"label":"Uganda","flag":"🇺🇬"},"uy":{"label":"Uruguay","flag":"🇺🇾"},"uz":{"label":"Uzbekistán","flag":"🇺🇿"},"vu":{"label":"Vanuatu","flag":"🇻🇺"},"ve":{"label":"Venezuela","flag":"🇻🇪"},"vn":{"label":"Vietnam","flag":"🇻🇳"},"wf":{"label":"Wallis y Futuna","flag":"🇼🇫"},"ye":{"label":"Yemen","flag":"🇾🇪"},"dj":{"label":"Yibuti","flag":"🇩🇯"},"zm":{"label":"Zambia","flag":"🇿🇲"},"zw":{"label":"Zimbabue","flag":"🇿🇼"},"espana-schengen":{"label":"Zona Schengen (varios países)","flag":"🌐"},"europa-no-schengen":{"label":"Europa fuera de Schengen","flag":"🌍"},"europa":{"label":"Europa completa (Schengen + otros)","flag":"🌍"},"eeuu-canada":{"label":"Estados Unidos + Canadá","flag":"🇺🇸🇨🇦"},"asia":{"label":"Asia","flag":"🌏"},"mundial":{"label":"Todo el mundo","flag":"🌎"}};
const SCHENGEN=new Set('at be bg hr cz dk ee fi fr de gr hu is it lv li lt lu mt nl no pl pt ro sk si es se ch'.split(' '));
const OTHER_EUROPE=new Set('gb ie cy al ba rs me mk md ua tr ge am az by ru ad mc sm va gi fo im je gg xk'.split(' '));
const ASIA=new Set('af bh bd bt bn kh cn hk in id ir iq il jp jo kz kw kg la lb mo my mv mn mm np kp kr om pk ps ph qa sa sg lk sy tw tj th tl tm ae uz vn ye'.split(' '));
const ORIGINS=new Set('co mx ar ve pe cl ec bo br uy py cr pa gt sv hn ni cu ht do at be bg hr cz dk ee fi fr de gr hu is it lv li lt lu mt nl no pl pt ro sk si es se ch'.split(' '));
const GROUPS=['espana-schengen','europa-no-schengen','europa','eeuu-canada','asia','mundial'];
const REGIONS=[['espana-schengen','🌐 Zona Schengen (varios países)'],['europa-no-schengen','🌍 Europa fuera de Schengen'],['europa','🌍 Europa completa (Schengen + otros)'],['eeuu-canada','🇺🇸🇨🇦 Estados Unidos + Canadá'],['asia','🌏 Asia'],['mundial','🌎 Todo el mundo']];
const ALIASES={
 gb:['inglaterra','uk','gran bretana','londres','london','manchester','liverpool'],ie:['dublin'],es:['espana','madrid','barcelona','sevilla','malaga','valencia espana'],fr:['paris'],de:['berlin'],it:['roma','venecia','milan'],pt:['lisboa','oporto'],at:['viena'],cz:['praga','republica checa'],hu:['budapest'],ro:['bucarest'],bg:['sofia'],cy:['nicosia'],rs:['belgrado'],tr:['turquia','estambul','istanbul'],al:['tirana'],
 co:['bogota','medellin','cali','cartagena colombia'],mx:['mexico','ciudad de mexico','cdmx','cancun','monterrey'],ar:['buenos aires'],pe:['peru','lima','cusco'],ve:['caracas'],cl:['santiago de chile'],ec:['quito','guayaquil'],uy:['montevideo'],do:['rep dominicana','republica dominicana','santo domingo'],
 us:['usa','eeuu','estados unidos','nueva york','new york','miami','orlando','los angeles','las vegas'],ca:['canada','toronto','vancouver','montreal'],
 jp:['japon','tokio','tokyo','osaka','kioto'],kr:['seul','seoul','corea del sur'],th:['bangkok','phuket'],vn:['hanoi'],ae:['dubai','abu dhabi','emiratos arabes'],sg:['singapur'],nl:['holanda','paises bajos']
};
function norm(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();}
function group(code){if(SCHENGEN.has(code))return 'espana-schengen';if(OTHER_EUROPE.has(code))return 'europa-no-schengen';if(code==='us'||code==='ca')return 'eeuu-canada';if(ASIA.has(code))return 'asia';return 'mundial';}
const countries=Object.keys(COUNTRIES).filter(code=>code.length===2).map(code=>({
 code,label:COUNTRIES[code].flag+' '+COUNTRIES[code].label,region:false,
 aliases:[norm(COUNTRIES[code].label),code].concat((ALIASES[code]||[]).map(norm)),group:group(code)
}));
const regions=REGIONS.map(([code,label])=>({
 code,label,region:true,
 // La región no debe coincidir con «España»: España aparece una sola vez, como país 🇪🇸.
 aliases:code==='espana-schengen'
  ? ['schengen','zona schengen','espacio schengen','area schengen']
  : [norm(label),norm(code),norm(label.split(' ').slice(1).join(' '))]
}));
function levenshtein(a,b){
 const prev=Array.from({length:b.length+1},(_,j)=>j);let row=prev;
 for(let i=1;i<=a.length;i++){const next=[i];for(let j=1;j<=b.length;j++)next[j]=Math.min(next[j-1]+1,row[j]+1,row[j-1]+(a[i-1]===b[j-1]?0:1));row=next;}
 return row[b.length];
}
function score(item,q){
 if(!q)return item.region?5:1;
 let best=-1;
 for(const w of item.aliases){
  if(w===q)best=Math.max(best,120);
  else if(w.startsWith(q))best=Math.max(best,85-Math.min(20,w.length-q.length));
  else if(q.length>=3&&w.includes(q))best=Math.max(best,60);
  else if(q.length>=4&&Math.abs(w.length-q.length)<=2){const d=levenshtein(w,q);if(d<=(q.length<=5?1:2))best=Math.max(best,40-d*7);}
 }
 return best;
}
function options(select,kind){
 const allowed=new Set(Array.from(select.options).map(o=>o.value));
 if(kind==='origin'){
  if(allowed.has('europa')&&allowed.has('mundial'))return regions.filter(x=>allowed.has(x.code));
  return countries.filter(x=>ORIGINS.has(x.code)&&allowed.has(x.code==='es'?'espana-schengen':x.code));
 }
 if(!allowed.has('espana-schengen'))return countries.filter(x=>allowed.has(x.code));
 // Si se sale desde un país Schengen, no sugerir la región genérica
 // porque para esa ruta el usuario necesita elegir un país de llegada concreto.
 const origin=document.getElementById(select.id==='ep-destino'?'ep-origen':'sb-origen');
 const originCode=origin&&origin.value==='espana-schengen'?'es':origin&&origin.value;
 const shownRegions=SCHENGEN.has(originCode)?regions.filter(x=>x.code!=='espana-schengen'):regions;
 return shownRegions.concat(countries);
}
function mappedValue(select,kind,item){
 const allowed=new Set(Array.from(select.options).map(o=>o.value));
 if(item.region)return allowed.has(item.code)?item.code:null;
 if(kind==='origin'){const c=item.code==='es'?'espana-schengen':item.code;return allowed.has(c)?c:null;}
 // Si el select acepta países específicos (p. ej., búsqueda invertida), conservarlos.
 if(allowed.has(item.code))return item.code;
 return allowed.has(item.group)?item.group:null;
}
const instances=[];
function attach(select,kind){
 if(!select||select.dataset.placeEnhanced)return;
 const isResults=select.id.startsWith('ep-');
 const countryField=kind==='destination'?document.getElementById(isResults?'ep-pais-destino':'vl-pais-destino'):null;
 const box=document.createElement('div');box.className='vl-place-box '+(kind==='destination'?'vl-place-right':'vl-place-left');
 const input=document.createElement('input');input.type='text';input.id=select.id+'-search';input.className='vl-place-input';
 input.autocomplete='off';input.spellcheck=false;input.placeholder=kind==='origin'?'Escribe tu país':'¿A dónde viajas?';
 input.setAttribute('role','combobox');input.setAttribute('aria-autocomplete','list');input.setAttribute('aria-expanded','false');
 const menu=document.createElement('div');menu.className='vl-place-menu';menu.id=select.id+'-choices';menu.setAttribute('role','listbox');
 input.setAttribute('aria-controls',menu.id);
 const error=document.createElement('p');error.className='vl-place-error';error.hidden=true;error.setAttribute('role','status');
 select.parentNode.insertBefore(box,select);box.append(input,menu,error);
 select.classList.add('vl-place-original');select.dataset.placeEnhanced='1';select.tabIndex=-1;
 // Validate the visible text input; native validation cannot focus the hidden select.
 select.required=false;input.required=true;
 const label=document.querySelector('label[for="'+select.id+'"]');
 if(label)label.htmlFor=input.id;else input.setAttribute('aria-label',kind==='origin'?'Voy desde':'Destino');
 let chosen=null,found=[],active=-1;
 function setError(t){error.textContent=t;error.hidden=!t;input.setAttribute('aria-invalid',t?'true':'false');}
 function close(){menu.replaceChildren();menu.classList.remove('open');input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');found=[];active=-1;}
 function pick(item){
  const value=mappedValue(select,kind,item);
  if(!value){setError('Esta ruta aún no está disponible.');return false;}
  if(kind==='destination'&&!item.region){
    const originSelect=document.getElementById(isResults?'ep-origen':'sb-origen');
    const originCode=originSelect&&originSelect.value==='espana-schengen'?'es':originSelect&&originSelect.value;
    if(originCode===item.code){
      setError('Elige un país de destino distinto del país desde el que viajas.');
      return false;
    }
  }
  chosen=item;input.value=item.label;select.value=value;
  if(countryField)countryField.value=item.region?'':item.code;
  setError('');close();select.dispatchEvent(new Event('change',{bubbles:true}));return true;
 }
 function matches(){
  const q=norm(input.value);const raw=options(select,kind).map(item=>({item,points:score(item,q)})).filter(x=>x.points>=0);
  raw.sort((a,b)=>b.points-a.points||a.item.label.localeCompare(b.item.label,'es'));
  return raw.slice(0,7);
 }
 function autoResolve(){
  if(chosen&&norm(chosen.label)===norm(input.value))return true;
  const q=norm(input.value),ranked=matches();
  const exact=ranked.find(x=>x.item.aliases.includes(q));
  if(exact)return pick(exact.item);
  if(q.length>=4&&ranked.length&&ranked[0].points>=30&&(!ranked[1]||ranked[0].points>ranked[1].points+3))return pick(ranked[0].item);
  setError('Selecciona un país o una sugerencia de la lista.');return false;
 }
 function highlight(n){active=Math.min(Math.max(0,n),found.length-1);Array.from(menu.children).forEach((el,i)=>{el.classList.toggle('active',i===active);el.setAttribute('aria-selected',String(i===active));});if(found.length)input.setAttribute('aria-activedescendant',select.id+'-choice-'+active);}
 function open(){
  // La lista solo aparece al escribir; evita una larga lista de regiones y países sin contexto.
  if(!norm(input.value)){close();return;}
  found=matches().map(x=>x.item);menu.replaceChildren();
  found.forEach((item,i)=>{
   const el=document.createElement('button');el.type='button';el.id=select.id+'-choice-'+i;el.className='vl-place-choice';el.setAttribute('role','option');el.setAttribute('aria-selected','false');
   const name=document.createElement('span');name.textContent=item.label;el.appendChild(name);
   if(!item.region&&kind==='destination'){
    // No mostrar «Mundial» junto a países concretos (Colombia, Perú, etc.).
    const subtitle=item.group==='espana-schengen'?'Schengen':item.group==='europa-no-schengen'?'Fuera de Schengen':item.group==='eeuu-canada'?'Norteamérica':item.group==='asia'?'Asia':'';
    if(subtitle){const detail=document.createElement('small');detail.textContent=subtitle;el.appendChild(detail);}
   }
   el.addEventListener('pointerdown',e=>e.preventDefault());el.addEventListener('click',()=>{pick(item);input.focus();});menu.appendChild(el);
  });
  if(!found.length){
   const hint=document.createElement('div');hint.className='vl-place-no-results';hint.setAttribute('role','status');
   hint.textContent=kind==='origin'?'No hay rutas disponibles desde ese país por ahora.':'No encontramos ese destino. Comprueba el nombre.';
   menu.appendChild(hint);
  }
  active=-1;menu.classList.add('open');input.setAttribute('aria-expanded','true');
 }
 input.addEventListener('focus',()=>{input.select();});
 input.addEventListener('input',()=>{chosen=null;setError('');open();});
 input.addEventListener('keydown',e=>{
  if(e.key==='ArrowDown'){e.preventDefault();if(!found.length)open();if(found.length)highlight(active+1);}
  if(e.key==='ArrowUp'){e.preventDefault();if(found.length)highlight(active<=0?0:active-1);}
  if(e.key==='Enter'&&found.length){e.preventDefault();pick(found[active>=0?active:0]);}
  if(e.key==='Escape')close();
  if(e.key==='Tab'&&found.length&&active>=0)pick(found[active]);
 });
 input.addEventListener('blur',()=>setTimeout(()=>{if(!box.contains(document.activeElement)){if(!chosen&&input.value.trim())autoResolve();close();}},100));
 function sync(){
  let item=null;const val=select.value;
  if(countryField&&countryField.value)item=countries.find(x=>x.code===countryField.value&&mappedValue(select,kind,x)===val);
  if(!item){
   // En origen, "espana-schengen" significa España; en destino es una región.
   if(kind==='origin')item=countries.find(x=>(x.code==='es'?'espana-schengen':x.code)===val);
   if(!item)item=regions.find(x=>x.code===val)||countries.find(x=>x.code===val);
  }
  chosen=item||null;input.value=val?(item?item.label:(select.options[select.selectedIndex]?.textContent||'')):'';setError('');close();
 }
 sync();instances.push({select,input,autoResolve,sync,setError});
}
function validSchengenPair(prefix){
 const origin=document.getElementById(prefix+'-origen');
 const destination=document.getElementById(prefix+'-destino');
 const country=document.getElementById(prefix==='sb'?'vl-pais-destino':'ep-pais-destino');
 if(!origin||!destination)return true;
 const source=origin.value==='espana-schengen'?'es':origin.value;
 const dest=country?country.value:'';
 const search=instances.find(x=>x.select.id===prefix+'-destino');
 // Nunca comparar un viaje que termina en el mismo país de salida.
 if(source && dest && source===dest){
   if(search){search.setError('El origen y el destino deben ser países distintos.');search.input.focus();}
   return false;
 }
 if(!SCHENGEN.has(source)||destination.value!=='espana-schengen')return true;
 if(!SCHENGEN.has(dest)){
   if(search){search.setError('Escribe y selecciona el país Schengen al que viajas.');search.input.focus();}
   return false;
 }
 if(source===dest){
   if(search){search.setError('Elige otro país Schengen diferente al de salida.');search.input.focus();}
   return false;
 }
 return true;
}
function init(){
 [['sb-origen','origin'],['sb-destino','destination'],['ep-origen','origin'],['ep-destino','destination']].forEach(([id,kind])=>attach(document.getElementById(id),kind));
 const form=document.getElementById('vl-search-form');
 if(form)form.addEventListener('submit',e=>{
   for(const x of instances)if(x.select.id.startsWith('sb-')&&!x.autoResolve()){e.preventDefault();e.stopImmediatePropagation();x.input.focus();return;}
   if(!validSchengenPair('sb')){e.preventDefault();e.stopImmediatePropagation();}
 },true);
 const btn=document.querySelector('button[onclick="applyEditSearch()"]');
 if(btn)btn.addEventListener('click',e=>{
   for(const x of instances)if(x.select.id.startsWith('ep-')&&!x.autoResolve()){e.preventDefault();e.stopImmediatePropagation();x.input.focus();return;}
   if(!validSchengenPair('ep')){e.preventDefault();e.stopImmediatePropagation();}
 },true);
}
window.VLPlaceSearch={countries:COUNTRIES,group,validate:(code,category)=>Boolean(COUNTRIES[code]&&(group(code)===category||category==='europa'||category==='mundial')),syncAll:()=>instances.forEach(x=>x.sync()),label:code=>COUNTRIES[code]?COUNTRIES[code].flag+' '+COUNTRIES[code].label:'',showError:(id,message)=>{const x=instances.find(x=>x.select.id===id);if(x){x.setError(message);x.input.focus();}}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();