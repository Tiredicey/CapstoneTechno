
(function(){
'use strict';
if(window.BloomTouch)return;

var SWIPE_THRESHOLD=50;
var SWIPE_TIMEOUT=300;

function enableSwipe(container,opts){
  if(!container)return;
  opts=opts||{};
  var startX=0,startY=0,startTime=0,tracking=false;

  container.addEventListener('touchstart',function(e){
    var t=e.touches[0];
    startX=t.clientX;startY=t.clientY;
    startTime=Date.now();tracking=true;
  },{passive:true});

  container.addEventListener('touchmove',function(e){
    if(!tracking)return;
   
    var dx=Math.abs(e.touches[0].clientX-startX);
    var dy=Math.abs(e.touches[0].clientY-startY);
    if(dx>dy&&dx>10){e.preventDefault();}
  },{passive:false});

  container.addEventListener('touchend',function(e){
    if(!tracking)return;
    tracking=false;
    var t=e.changedTouches[0];
    var dx=t.clientX-startX;
    var dy=t.clientY-startY;
    var dt=Date.now()-startTime;
    if(dt>SWIPE_TIMEOUT)return;
    if(Math.abs(dx)<SWIPE_THRESHOLD)return;
    if(Math.abs(dy)>Math.abs(dx))return;

    if(dx<0&&opts.onSwipeLeft)opts.onSwipeLeft();
    if(dx>0&&opts.onSwipeRight)opts.onSwipeRight();
  },{passive:true});
}



function initReviewSwipe(){
  var grid=document.getElementById('reviewsGrid');
  if(!grid)return;
  var cards=grid.querySelectorAll('.rev-card');
  if(cards.length<2)return;
  var current=0;

  function show(idx){
    if(idx<0)idx=cards.length-1;
    if(idx>=cards.length)idx=0;
    current=idx;
    cards.forEach(function(c,i){
      c.classList.toggle('mob-active',i===current);
      c.style.display=(i===current)?'block':'';
    });

    var dots=grid.parentElement.querySelectorAll('.rev-dot');
    dots.forEach(function(d,i){d.classList.toggle('active',i===current);});
  }


  if(window.innerWidth<=900){
    show(0);
  }

  enableSwipe(grid,{
    onSwipeLeft:function(){show(current+1);},
    onSwipeRight:function(){show(current-1);}
  });


  var prev=grid.parentElement.querySelector('.rev-navb:first-of-type');
  var next=grid.parentElement.querySelector('.rev-navb:last-of-type');
  if(prev)prev.addEventListener('click',function(){show(current-1);});
  if(next)next.addEventListener('click',function(){show(current+1);});


  var mql=window.matchMedia('(max-width:900px)');
  mql.addEventListener('change',function(e){
    if(e.matches)show(0);
    else cards.forEach(function(c){c.style.display='';c.classList.remove('mob-active');});
  });
}



function initScrollSwipe(selector){
  var el=document.querySelector(selector);
  if(!el)return;
  enableSwipe(el,{
    onSwipeLeft:function(){el.scrollBy({left:200,behavior:'smooth'});},
    onSwipeRight:function(){el.scrollBy({left:-200,behavior:'smooth'});}
  });
}



function initPullToRefresh(opts){
  opts=opts||{};
  var threshold=opts.threshold||80;
  var onRefresh=opts.onRefresh||function(){location.reload();};
  var startY=0,pulling=false,indicator=null;


  document.addEventListener('touchstart',function(e){
    if(window.scrollY>5)return;
    startY=e.touches[0].clientY;pulling=true;
  },{passive:true});

  document.addEventListener('touchmove',function(e){
    if(!pulling)return;
    var dy=e.touches[0].clientY-startY;
    if(dy<0){pulling=false;return;}
    if(dy>threshold){
      if(!indicator){
        indicator=document.createElement('div');
        indicator.style.cssText='position:fixed;top:0;left:50%;transform:translateX(-50%);z-index:99999;padding:8px 20px;background:rgba(230,26,26,.9);color:#fff;border-radius:0 0 12px 12px;font-size:.78rem;font-weight:600;';
        indicator.textContent='Release to refresh';
        document.body.appendChild(indicator);
      }
    }
  },{passive:true});

  document.addEventListener('touchend',function(){
    if(indicator){
      indicator.textContent='Refreshing...';
      setTimeout(function(){
        if(indicator&&indicator.parentNode)indicator.remove();
        indicator=null;
        onRefresh();
      },400);
    }
    pulling=false;
  },{passive:true});
}



function init(){
  initReviewSwipe();
  initScrollSwipe('#recScroll');
  initScrollSwipe('.cat-tabs');

  var path=location.pathname;
  if(path==='/'||path==='/index.html'||path.indexOf('catalog')!==-1){
    initPullToRefresh();
  }
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
else init();

window.BloomTouch={enableSwipe:enableSwipe,initPullToRefresh:initPullToRefresh};
})();
