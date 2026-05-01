(function(){
'use strict';
if(window.BloomAnalytics)return;
var _m={};

function _obs(type,cb){
  if(!('PerformanceObserver' in window))return;
  try{var o=new PerformanceObserver(cb);o.observe({type:type,buffered:true});return o;}catch(e){}
}

_obs('largest-contentful-paint',function(l){var e=l.getEntries();if(e.length){_m.lcp=Math.round(e[e.length-1].startTime);_send('LCP',_m.lcp);}});
_obs('first-input',function(l){var e=l.getEntries();if(e.length){_m.fid=Math.round(e[0].processingStart-e[0].startTime);_send('FID',_m.fid);}});

var _cls=0,_sVal=0,_sEntries=[];
_obs('layout-shift',function(l){l.getEntries().forEach(function(e){if(!e.hadRecentInput){var last=_sEntries[_sEntries.length-1];if(_sVal&&last&&e.startTime-last.startTime<1000){_sVal+=e.value;_sEntries.push(e);}else{_sVal=e.value;_sEntries=[e];}if(_sVal>_cls){_cls=_sVal;_m.cls=parseFloat(_cls.toFixed(4));}}});});
document.addEventListener('visibilitychange',function(){if(document.visibilityState==='hidden'&&_m.cls!==undefined)_send('CLS',_m.cls);});

var _inp=0;
_obs('event',function(l){l.getEntries().forEach(function(e){if(e.duration>_inp){_inp=e.duration;_m.inp=Math.round(_inp);}});});

function _ttfb(){try{var n=performance.getEntriesByType('navigation');if(n&&n.length){_m.ttfb=Math.round(n[0].responseStart-n[0].requestStart);_send('TTFB',_m.ttfb);}}catch(e){}}

function _send(name,val){_ev('web_vital',{metric:name,value:val,url:location.pathname,ts:Date.now()});}

function _ev(type,payload){
  if(!window.Api){setTimeout(function(){_ev(type,payload);},2000);return;}
  try{
    if(type==='web_vital'&&navigator.sendBeacon){
      navigator.sendBeacon((Api.baseUrl||'/api')+'/analytics/event',new Blob([JSON.stringify({eventType:type,payload:payload})],{type:'application/json'}));
    }else{Api.post('/analytics/event',{eventType:type,payload:payload}).catch(function(){});}
  }catch(e){}
}

var _steps=['hero','shop','cart','checkout','confirmation'];

function trackFunnel(step){
  if(_steps.indexOf(step)===-1)return;
  _ev('funnel_step',{step:step,idx:_steps.indexOf(step),url:location.pathname,ref:document.referrer});
  var bar=document.querySelector('.funnel-bar');
  if(!bar)return;
  var ai=_steps.indexOf(step);
  bar.querySelectorAll('.funnel-step').forEach(function(el,i){el.classList.remove('done','active');if(i<ai)el.classList.add('done');if(i===ai)el.classList.add('active');});
}

function trackPageView(){_ev('page_view',{url:location.pathname+location.search,title:document.title,ref:document.referrer,w:innerWidth,h:innerHeight,dpr:devicePixelRatio||1,conn:(navigator.connection&&navigator.connection.effectiveType)||'unknown'});}
function trackEvent(name,data){_ev(name,Object.assign({url:location.pathname},data||{}));}

function init(){
  trackPageView();
  if(document.readyState==='complete')_ttfb();else window.addEventListener('load',_ttfb);
  var p=location.pathname;
  if(p==='/'||p==='/index.html'){try{var s=document.getElementById('shop');if(s)new IntersectionObserver(function(e){if(e[0].isIntersecting)trackFunnel('shop');},{threshold:0.2}).observe(s);}catch(e){}}
  else if(p.indexOf('catalog')!==-1)trackFunnel('shop');
  else if(p.indexOf('cart')!==-1)trackFunnel('cart');
  else if(p.indexOf('checkout')!==-1)trackFunnel('checkout');
  else if(p.indexOf('confirmation')!==-1)trackFunnel('confirmation');
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
window.BloomAnalytics={getMetrics:function(){return Object.assign({},_m);},trackEvent:trackEvent,trackFunnel:trackFunnel,trackPageView:trackPageView};
})();
