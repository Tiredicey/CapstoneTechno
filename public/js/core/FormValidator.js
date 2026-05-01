
(function(){
'use strict';
if(window.BloomFormValidator)return;


function validate(form,rules){
  if(typeof form==='string')form=document.querySelector(form);
  if(!form)return true;
  var errors=[];

  Object.keys(rules).forEach(function(fieldId){
    var rule=rules[fieldId];
    var el=form.querySelector('#'+fieldId)||form.querySelector('[name="'+fieldId+'"]');
    if(!el)return;
    var val=(el.value||'').trim();
    var label=rule.label||_labelFor(el)||fieldId;

 
    el.removeAttribute('aria-invalid');
    var feEl=el.parentElement.querySelector('.fe');
    if(feEl)feEl.textContent='';

 
    if(rule.required&&!val){
      errors.push({field:fieldId,label:label,msg:rule.message||(label+' is required')});
      return;
    }
    if(!val)return;


    if(rule.type==='email'&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)){
      errors.push({field:fieldId,label:label,msg:label+' must be a valid email address'});
      return;
    }


    if(rule.type==='tel'&&!/^[\d\s\-+()]{7,20}$/.test(val)){
      errors.push({field:fieldId,label:label,msg:label+' must be a valid phone number'});
      return;
    }


    if(rule.min&&val.length<rule.min){
      errors.push({field:fieldId,label:label,msg:label+' must be at least '+rule.min+' characters'});
      return;
    }


    if(rule.max&&val.length>rule.max){
      errors.push({field:fieldId,label:label,msg:label+' must be at most '+rule.max+' characters'});
      return;
    }


    if(rule.pattern&&!rule.pattern.test(val)){
      errors.push({field:fieldId,label:label,msg:rule.message||(label+' format is invalid')});
    }
  });

  _renderSummary(form,errors);
  return errors.length===0;
}

function _labelFor(el){

  if(el.id){
    var lbl=document.querySelector('label[for="'+el.id+'"]');
    if(lbl)return lbl.textContent.trim();
  }

  var parent=el.closest('label');
  if(parent){
    var txt=parent.querySelector('.form-label,.fi-lbl');
    if(txt)return txt.textContent.trim();
  }

  var prev=el.parentElement.querySelector('.form-label,.fi-lbl');
  if(prev)return prev.textContent.trim();
  return '';
}

function _renderSummary(form,errors){

  var summary=form.querySelector('.err-summary');
  if(!summary){
    summary=document.createElement('div');
    summary.className='err-summary';
    summary.setAttribute('role','alert');
    summary.setAttribute('aria-live','assertive');
    summary.setAttribute('tabindex','-1');
    form.insertBefore(summary,form.firstChild);
  }

  if(!errors.length){
    summary.classList.remove('on');
    summary.innerHTML='';
    return;
  }


  errors.forEach(function(err){
    var el=form.querySelector('#'+err.field)||form.querySelector('[name="'+err.field+'"]');
    if(el){
      el.setAttribute('aria-invalid','true');
      var feEl=el.parentElement.querySelector('.fe');
      if(feEl)feEl.textContent=err.msg;
    }
  });

 
  summary.innerHTML='<h4>⚠ Please correct '+errors.length+' error'+(errors.length>1?'s':'')+'</h4>'+
    '<ul>'+errors.map(function(err){
      return '<li><a href="#'+err.field+'">'+_escHtml(err.msg)+'</a></li>';
    }).join('')+'</ul>';
  summary.classList.add('on');


  summary.focus();


  summary.querySelectorAll('a').forEach(function(a){
    a.addEventListener('click',function(e){
      e.preventDefault();
      var target=form.querySelector('#'+a.getAttribute('href').slice(1));
      if(target){target.focus();target.scrollIntoView({behavior:'smooth',block:'center'});}
    });
  });
}

function _escHtml(s){return String(s).replace(/[<>&"']/g,function(c){return{'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[c];});}

function clearErrors(form){
  if(typeof form==='string')form=document.querySelector(form);
  if(!form)return;
  var summary=form.querySelector('.err-summary');
  if(summary){summary.classList.remove('on');summary.innerHTML='';}
  form.querySelectorAll('[aria-invalid]').forEach(function(el){el.removeAttribute('aria-invalid');});
  form.querySelectorAll('.fe').forEach(function(el){el.textContent='';});
}

window.BloomFormValidator={validate:validate,clearErrors:clearErrors};
})();
