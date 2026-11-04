const root = document.querySelector('#main');
const escape = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const shuffle = items => {
  const copy = [...items];
  for(let i=copy.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [copy[i],copy[j]]=[copy[j],copy[i]];
  }
  return copy;
};
let state;
try {state=JSON.parse(localStorage.getItem('museum-study-v1'))} catch {}
state ??= {level:0, seen:[[],[],[]], notes:{}, run:null};
let storageError=false;
function save(){
  try {localStorage.setItem('museum-study-v1',JSON.stringify(state))}
  catch {storageError=true}
}
const available = () => bank.filter(q=>!state.seen[state.level].includes(q.id));
const byId = id => bank[id];
const keyFor = item => [item.level,item.id,item.written].join(':');
function makeSet(pool){
  const mixed=shuffle(pool);
  const first=shuffle([...new Set(mixed.map(q=>q.d))]).map(d=>mixed.find(q=>q.d===d));
  const picked=[...first];
  while(picked.length<25){
    const next=mixed.filter(q=>!picked.includes(q)).sort((a,b)=>picked.filter(q=>q.d===a.d).length-picked.filter(q=>q.d===b.d).length)[0];
    picked.push(next);
  }
  const all=shuffle(picked);
  return all.map((q,i)=>{
    const level=state.level;
    const related=shuffle(bank.filter(other=>other.d===q.d && other.id!==q.id));
    const foreign=shuffle(bank.filter(other=>other.d!==q.d));
    const distractors=level===0 ? foreign.slice(0,3) : [...related,...foreign].slice(0,3);
    return {id:q.id,level,written:i>=20,options:shuffle([q,...distractors]).map(other=>other.id),answer:null};
  });
}
function start(){
  const pool=available();
  if(pool.length<25)return;
  const items=makeSet(pool);
  state.seen[state.level].push(...items.map(item=>item.id));
  state.run={items,index:0};
  save();
  go('quiz');
}
function go(route){
  if(location.hash==='#'+route) render();
  else location.hash=route;
}
function prompt(item){
  const q=byId(item.id);
  if(item.written){
    return [
      'Explain '+q.term+' in your own words. Include the key features discussed in the lecture.',
      'In the museum context, what is the purpose of '+q.term+'? Describe the elements that make it useful or relevant.',
      'A museum team has this objective: “'+q.exp+'.” Identify the relevant concept or method. Explain which features make it suitable for that objective.'
    ][item.level];
  }
  if(q.clue && item.level<2) return (item.level===0?'Which term matches this lecture excerpt?':'Which concept best explains this lecture excerpt?')+'\n“'+q.clue+'”';
  return [
    'Which term best matches this description? “'+q.exp+'.”',
    'A museum team wants to '+q.exp[0].toLowerCase()+q.exp.slice(1)+'. Which concept, method, or example is most relevant?',
    'Which statement best explains how “'+q.term+'” is used or understood in the lecture?'
  ][item.level];
}
const choiceText=(q,level)=>level===2?(q.clue||q.exp):q.term;
const diagrams={
  '13': ['data-information','Recorded data is interpreted as meaningful information using knowledge.'],
  '32': ['structured-light','A projector casts a pattern on an object. A camera observes the pattern as deformed by the surface.'],
  '38': ['contextual-learning','Personal, sociocultural and physical contexts shape the museum visit.'],
  '60': ['europeana','Institutions supply metadata through aggregators to Europeana.']
};
function evidenceDiagram(q){
  const id=[14,15].includes(q.id)?13:q.id===61?60:q.id;
  const diagram=diagrams[id];
  if(!diagram)return '';
  const [name,caption]=diagram;
  return '<figure class="lecture-figure"><img src="images/'+name+'.svg" alt="'+escape(caption)+'" width="560" height="230" loading="lazy"><figcaption lang="en">Study diagram · '+escape(caption)+'</figcaption></figure>';
}
function evidence(q){
  return '<p class="label">Lecture evidence</p><a href="#sources">'+escape(q.source.normalize())+' · PDF p. '+q.p+'</a>'+ (q.quote?'<blockquote class="quote">'+escape(q.quote)+'</blockquote>':'')+evidenceDiagram(q);
}
function findMatches(q,answer){
  const text=answer.normalize('NFKC').toLowerCase();
  return q.keys.map(group=>group.find(word=>text.includes(word.toLowerCase())));
}
function annotated(answer,matches){
  const needles=matches.filter(Boolean).sort((a,b)=>b.length-a.length);
  if(!needles.length)return escape(answer);
  const pattern=new RegExp('('+needles.map(s=>s.replace(/[^\p{L}\p{N} ]/gu,c=>'\\'+c)).join('|')+')','giu');
  return answer.split(pattern).map((part,i)=>i%2?'<mark>'+escape(part)+'</mark>':escape(part)).join('');
}
function submit(item,answer,retry=false){
  if(item.answer!==null)return;
  item.answer=answer;
  const q=byId(item.id);
  item.correct=item.written ? findMatches(q,answer).every(Boolean) : answer===q.id;
  if(!item.correct && (!retry || Object.hasOwn(state.notes,keyFor(item))))state.notes[keyFor(item)]={...item};
  save();
  render();
  document.querySelector('#feedback')?.focus();
}
function feedback(item){
  const q=byId(item.id);
  if(!item.written){
    const other=byId(item.answer);
    return '<div id="feedback" tabindex="-1" class="feedback '+(item.correct?'ok':'miss')+'"><h3>'+(item.correct?'✓ Correct':'✕ Incorrect')+'</h3><p><strong>'+escape(q.term)+'</strong> · '+escape(q.exp)+'.</p>'+(!item.correct?'<p>선택한 보기의 의미 · '+escape(other.exp)+'.</p>':'')+evidence(q)+'</div>';
  }
  const matches=findMatches(q,item.answer);
  return '<div id="feedback" tabindex="-1" class="feedback '+(item.correct?'ok':'partial')+'"><h3>서술형 피드백 · '+matches.filter(Boolean).length+' / '+matches.length+' 핵심 기준 감지</h3><p class="muted">한·영 키워드로 점검한 결과입니다. 문장의 사실관계, 부정 표현, 사례의 타당성은 아래 모범답안과 비교해 확인하세요.</p><h3>내 답안</h3><p class="quote">'+annotated(item.answer,matches)+'</p><ul class="rubric">'+q.keys.map((group,i)=>'<li class="'+(matches[i]?'ok':'miss')+'">'+(matches[i]?'✓ 감지됨':'△ 확인 필요')+' · '+escape(group.join(' / '))+'</li>').join('')+'</ul><h3>Model answer</h3><p lang="en"><strong>'+escape(q.term)+'</strong> · '+escape(q.exp)+'.</p>'+evidence(q)+'</div>';
}
function home(){
  const count=available().length;
  root.innerHTML='<section class="hero"><p class="label">GCT583 · Study companion</p><h1>Museum Study Lab</h1><p>박물관의 정의부터 3D 기록, 관람객 경험, 가상 박물관까지. 강의자료를 근거로 영어 퀴즈를 풀어보세요.</p></section><section class="panel"><p class="label">20 multiple-choice + 5 written</p><h2>퀴즈 난이도 선택</h2><div class="grid">'+levels.map((level,i)=>'<button data-level="'+i+'" aria-pressed="'+(state.level===i)+'"><strong>'+level+'</strong><br><small>'+descriptions[i]+'</small></button>').join('')+'</div><p class="muted">미출제 문항 '+count+'개 · 같은 난이도에서는 이미 출제된 주제를 제외합니다. 난이도를 바꾸면 같은 주제가 다른 질문으로 나올 수 있습니다.</p><div class="row"><button class="primary" id="start" '+(count<25 || (state.run&&state.run.index<25)?'disabled':'')+'>새 세트 시작</button>'+(state.run&&state.run.index<25?'<a href="#quiz">진행 중인 세트 이어 풀기</a>':count<25?'<button id="reset">이 난이도의 출제 기록 초기화</button>':'')+'</div>'+(count<25?'<p class="muted">새 세트에는 미출제 문항이 25개 필요합니다. 출제 기록을 초기화해도 오답 노트는 유지됩니다.</p>':'')+'</section>';
  root.querySelectorAll('[data-level]').forEach(button=>button.onclick=()=>{state.level=Number(button.dataset.level);save();render()});
  root.querySelector('#start').onclick=start;
  const reset=root.querySelector('#reset');
  if(reset)reset.onclick=()=>{state.seen[state.level]=[];save();render()};
}
function examStem(item){
  const [question, excerpt]=prompt(item).split('\n');
  return '<h2 lang="en">'+escape(question)+'</h2>'+
    (excerpt?'<blockquote class="exam-excerpt" lang="en">'+escape(excerpt)+'</blockquote>':'');
}
function quiz(retry=false){
  const run=retry?state.retry:state.run;
  if(!run){retry?review():home();return}
  const total=run.items.length;
  if(retry && run.index===total){
    const correct=run.items.filter(item=>item.correct).length;
    root.innerHTML='<section class="panel exam-sheet"><h1>오답 퀴즈 완료</h1><p>'+total+'문항 중 ' +correct+'문항 통과</p><a href="#review">오답 노트로 돌아가기</a></section>';
    return;
  }
  if(run.index===total){
    const multiple=run.items.filter(i=>!i.written&&i.correct).length;
    const written=run.items.filter(i=>i.written&&i.correct).length;
    root.innerHTML='<section class="panel"><p class="label">Session complete</p><h1>세트 완료</h1><p>객관식 '+multiple+' / 20 정답 · 서술형 '+written+' / 5 문항에서 모든 핵심 기준 감지</p><div class="row"><a href="#home">새 퀴즈</a><a href="#review">오답 노트 보기</a></div></section>';
    return;
  }
  const item=run.items[run.index], done=item.answer!==null;
  root.innerHTML='<section class="panel exam-sheet"><div class="paper-masthead"><strong>GCT583 · MUSEUM TECHNOLOGY IN DIGITAL ERA</strong><span>'+(retry?'REVIEW QUIZ':'PRACTICE EXAM')+'</span></div><div class="row"><p class="label">'+levels[item.level]+' · '+(item.written?'Written response':'Multiple choice')+'</p><p>Question '+(run.index+1)+' / '+total+'</p></div><progress aria-label="퀴즈 진행률" value="'+(run.index+Number(done))+'" max="'+total+'"></progress>'+examStem(item)+
    (item.written ? (done?'':'<form><label for="answer">한국어 또는 영어로 답변</label><textarea id="answer" required maxlength="6000"></textarea><button class="primary" type="submit">답안 제출</button></form>') :
    '<div class="choices" lang="en">'+item.options.map((id,i)=>'<button data-choice="'+id+'" '+(done?'disabled':'')+' class="'+(done?(id===item.id?'correct':id===item.answer?'wrong':''):'')+'">'+'<span class="choice-letter">'+String.fromCharCode(65+i)+'</span><span>'+escape(choiceText(byId(id),item.level))+'</span>'+'</button>').join('')+'</div>')+
    (done?feedback(item)+'<button id="next" class="primary">'+(run.index===total-1?'결과 보기':'다음 문제')+'</button>':'')+'</section>';
  root.querySelectorAll('[data-choice]').forEach(button=>button.onclick=()=>submit(item,Number(button.dataset.choice),retry));
  const form=root.querySelector('form');
  if(form)form.onsubmit=e=>{e.preventDefault();const answer=form.querySelector('textarea').value.trim();if(answer)submit(item,answer,retry)};
  const next=root.querySelector('#next');
  if(next)next.onclick=()=>{run.index++;save();render();root.focus();window.scrollTo(0,0)};
}
function startRetry(){
  const items=shuffle(Object.values(state.notes)).map(item=>({
    id:item.id, level:item.level, written:item.written,
    options:shuffle(item.options), answer:null
  }));
  if(!items.length)return;
  state.retry={items,index:0};
  save();
  go('retry');
}
function review(){
  const entries=Object.entries(state.notes).reverse();
  const inProgress=state.retry && state.retry.index<state.retry.items.length;
  const cards=entries.map(([key,item])=>{
    const q=byId(item.id);
    const missed=item.written ? q.keys.filter((_,i)=>!findMatches(q,item.answer)[i]).map(group=>group[0]).join(' · ') : '';
    return '<article class="note-card"><div class="row"><h2 lang="en">'+escape(q.term)+'</h2><button class="note-remove" data-remove="'+escape(key)+'" aria-label="'+escape(q.term)+' 오답 삭제">삭제</button></div>'+
      (missed?'<p class="note-keywords">확인할 표현 · '+escape(missed)+'</p>':'')+
      '<p class="label">'+levels[item.level]+' · '+(item.written?'Written response':'Multiple choice')+'</p>'+
      '<details><summary>문제와 해설 보기</summary><p lang="en">'+escape(prompt(item))+'</p>'+feedback(item).replace('id="feedback"','')+'</details></article>';
  }).join('');
  root.innerHTML='<h1>오답 노트</h1><p class="muted">복습할 개념 '+entries.length+'개</p>'+
    (cards||'<section class="panel">아직 저장된 오답이 없습니다. <a href="#home">퀴즈 풀기</a></section>')+
    '<section class="panel retry-panel"><p class="label">Review practice</p><h2>오답 퀴즈</h2><p>현재 오답 노트에 남아 있는 '+entries.length+'문항을 무작위 순서로 다시 풉니다. 다시 맞힌 문항도 직접 삭제할 때까지 오답 노트에 남습니다.</p><div class="row"><button class="primary" id="start-retry" '+(entries.length?'':'disabled')+'>오답 퀴즈 시작</button>'+(inProgress?'<a href="#retry">진행 중인 오답 퀴즈 이어 풀기</a>':'')+'</div></section>';
  root.querySelectorAll('[data-remove]').forEach(button=>button.onclick=()=>{
    delete state.notes[button.dataset.remove];
    save();
    render();
    (root.querySelector('[data-remove]')||root).focus();
  });
  root.querySelector('#start-retry').onclick=startRetry;
}
let lectureKey=null;
const bytesFromHex = hex => Uint8Array.from(hex.match(/../g),value=>parseInt(value,16));
const encode = value => new TextEncoder().encode(value);
function decryptLecture(key,bytes,context){
  return crypto.subtle.decrypt({name:'AES-GCM',iv:bytes.slice(0,12),additionalData:encode(context)},key,bytes.slice(12));
}
async function unlockLectures(password){
  const material=await crypto.subtle.importKey('raw',encode(password),'PBKDF2',false,['deriveKey']);
  const key=await crypto.subtle.deriveKey({name:'PBKDF2',salt:bytesFromHex(lectureVault.salt),iterations:600000,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['decrypt']);
  await decryptLecture(key,bytesFromHex(lectureVault.check),'unlock');
  return key;
}
async function downloadLecture(file,key){
  const buffers=[];
  for(const name of file.parts){
    const response=await fetch('lectures/'+name);
    if(!response.ok)throw new Error('Lecture file unavailable');
    buffers.push(await decryptLecture(key,new Uint8Array(await response.arrayBuffer()),name));
  }
  if(lectureKey!==key)return;
  const url=URL.createObjectURL(new Blob(buffers,{type:'application/pdf'}));
  const anchor=document.createElement('a');
  anchor.href=url;
  anchor.download=file.name;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(()=>URL.revokeObjectURL(url),30000);
}
function sources(){
  root.innerHTML='<h1>강의자료</h1><p class="muted">강의자료 12개 · 문항 출처는 원본 PDF 기준 페이지 번호입니다.</p>';
  if(!lectureKey){
    root.insertAdjacentHTML('beforeend','<section class="panel"><h2>강의자료 잠금</h2><p>비밀번호를 입력하면 원본 PDF를 다운로드할 수 있습니다.</p><form id="lecture-unlock"><label for="lecture-password">비밀번호</label><input class="lecture-password" type="password" id="lecture-password" required><button class="primary">잠금 해제</button><p role="status" class="lecture-status"></p></form></section>');
    const form=root.querySelector('#lecture-unlock');
    form.onsubmit=async event=>{
      event.preventDefault();
      const status=form.querySelector('[role="status"]');
      const button=form.querySelector('button');
      if(!globalThis.crypto?.subtle){status.textContent='HTTPS에서 사이트를 열어주세요.';return}
      button.disabled=true;
      try{
        const key=await unlockLectures(form.querySelector('input').value);
        if(form.isConnected){lectureKey=key;render();root.focus()}
      }catch{status.textContent='비밀번호를 확인해 주세요.'}
      finally{button.disabled=false}
    };
    return;
  }
  root.insertAdjacentHTML('beforeend','<div class="row lecture-actions"><p class="muted">잠금 해제됨</p><button id="lecture-lock">다시 잠그기</button></div><p role="status" class="lecture-status"></p>'+
    Object.entries(lectureVault.files).map(([id,file])=>'<section class="panel row"><span>'+escape(file.name.normalize())+'</span><button class="primary" data-pdf="'+id+'" aria-label="'+escape(file.name)+' 다운로드">PDF 다운로드</button></section>').join(''));
  root.querySelector('#lecture-lock').onclick=()=>{lectureKey=null;render();root.querySelector('input').focus()};
  const status=root.querySelector('[role="status"]');
  root.querySelectorAll('[data-pdf]').forEach(button=>button.onclick=async()=>{
    button.disabled=true;
    status.textContent='PDF 다운로드 준비 중…';
    try{await downloadLecture(lectureVault.files[button.dataset.pdf],lectureKey);status.textContent=''}
    catch{status.textContent='PDF를 내려받지 못했습니다. 잠시 후 다시 시도해 주세요.'}
    finally{button.disabled=false}
  });
}
function render(){
  document.querySelector('#badge').textContent=Object.keys(state.notes).length||'';
  const route=location.hash.slice(1);
  ({quiz,review,sources,retry:()=>quiz(true)}[route]||home)();
  if(storageError)root.insertAdjacentHTML('afterbegin','<p role="alert">이 브라우저에서 기록을 저장할 수 없습니다. 페이지를 닫으면 진행 상황이 사라질 수 있습니다.</p>');
}
window.addEventListener('hashchange',()=>{render();root.focus();window.scrollTo(0,0)});
render();
