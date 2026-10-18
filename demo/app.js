import {DEMO_CATALOG} from '../src/catalog.js';
import {mockExtract} from '../src/mock-llm.js';
import {prepareProposal} from '../src/agent.js';
const $=selector=>document.querySelector(selector);
const formatRub = price => new Intl.NumberFormat('ru-RU').format(price)+' ₽';
let current = null;
const cards = $('#cards');
for(const button of document.querySelectorAll('[data-example]')){
  button.addEventListener('click',()=>{$('#message').value=button.dataset.example;});
}
$('#run').addEventListener('click',()=>{
  const input=$('#message').value.trim();
  if(!input) return;
  const start=performance.now();
  const suggestion=mockExtract(input);
  current=prepareProposal({modelResult:suggestion,message:input,catalog:DEMO_CATALOG,region:$('#region').value});
  $('#latency').textContent='Локально · '+Math.max(1,Math.round(performance.now()-start))+' мс';
  cards.replaceChildren();
  $('#warnings').replaceChildren();
  for(const warning of current.warnings){
    const el=document.createElement('div');el.className='warning';el.textContent=warning;$('#warnings').append(el);
  }
  if(!current.items.length){
    const empty=document.createElement('p');empty.className='placeholder';empty.textContent='Нет подтверждённых позиций — необходима проверка менеджера.';cards.append(empty);
  }
  for(const item of current.items){
    const row=document.createElement('div');row.className='item';
    const left=document.createElement('div');
    const title=document.createElement('div');title.className='item-name';title.textContent=item.title;
    const desc=document.createElement('div');desc.className='item-meta';desc.textContent='Прайс из локального каталога · регион '+current.region;
    left.append(title,desc);
    const price=document.createElement('span');price.className='price';price.textContent=formatRub(item.price);
    row.append(left,price);cards.append(row);
  }
  $('#total').textContent=formatRub(current.total);
  $('#approve').disabled=!current.items.length;
  $('#approve-status').className='approve-status';
  $('#approve-status').textContent=current.warnings.length
    ? 'Нужна проверка: '+current.warnings.length+' предупреждений'
    : 'Проверка менеджером обязательна. Автоматической отправки нет.';
});
$('#approve').addEventListener('click',()=>{
  if(!current?.items.length)return;
  $('#approve-status').className='approve-status ok';
  $('#approve-status').textContent='✓ Локально подтверждено менеджером. Никакие данные не отправлены.';
});