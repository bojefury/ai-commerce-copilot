import test from 'node:test';
import assert from 'node:assert/strict';
import {DEMO_CATALOG} from '../src/catalog.js';
import {parseBudget,resolveCatalogItem,chooseUnderBudget,prepareProposal} from '../src/agent.js';
import {mockExtract} from '../src/mock-llm.js';

test('total budget and per-item budget are distinct',()=>{
  assert.deepEqual(parseBudget('3 игры до 3500 на всё'),{limit:3500,scope:'total',needsReview:false});
  assert.deepEqual(parseBudget('каждая до 3500'),{limit:3500,scope:'per-item',needsReview:false});
});
test('ambiguous budget needs manager approval',()=>{
  assert.equal(parseBudget('до 3500').needsReview,true);
  assert.equal(parseBudget('до 3500 всего и каждая до 3500').needsReview,true);
});
test('aliases are normalized, not guessed',()=>{
  assert.equal(resolveCatalogItem('ОКЕАН КВЕСТ',DEMO_CATALOG).item.id,'ocean-quest');
  assert.equal(resolveCatalogItem('Starlight',DEMO_CATALOG).status,'ambiguous');
  assert.equal(resolveCatalogItem('Game that does not exist',DEMO_CATALOG).status,'missing');
});
test('product prices always come from verified catalog not model',()=>{
  const answer=prepareProposal({modelResult:{mentions:['Neon Drift'],count:1,price:1},message:'неон дрифт',catalog:DEMO_CATALOG});
  assert.equal(answer.items[0].price,990);
  assert.equal(answer.total,990);
  assert.equal(answer.requiresReview,true);
});
test('total budget never exceeded, even with partial results',()=>{
  const result=prepareProposal({modelResult:{mentions:['Ocean Quest','Neon Drift','Forest Keepers'],count:3},message:'3 игры до 2000 на всё',catalog:DEMO_CATALOG});
  assert.ok(result.total<=2000);
  assert.equal(result.items.length,2);
  assert.ok(result.warnings.length>=1);
});
test('pricing depends on region; invalid regions denied',()=>{
  const input={modelResult:{mentions:['Ocean Quest'],count:1},message:'океан',catalog:DEMO_CATALOG};
  assert.equal(prepareProposal({...input,region:'A'}).total,1290);
  assert.equal(prepareProposal({...input,region:'B'}).total,1490);
  assert.throws(()=>prepareProposal({...input,region:'prod'}),/Unsupported/);
});
test('uncertain games are surfaced, not charged',()=>{
  const result=prepareProposal({modelResult:{mentions:['Starlight','Unknown Game'],count:2},message:'игры до 3000',catalog:DEMO_CATALOG});
  assert.equal(result.total,0);
  assert.equal(result.candidates[0].status,'ambiguous');
  assert.ok(result.warnings.some(s=>s.includes('Starlight')));
});
test('demo extractor cannot directly set trusted prices',()=>{
  const extraction=mockExtract('Нужен неон дрифт и лесные хранители, до 2000 на всё');
  assert.deepEqual(extraction.mentions,['Neon Drift','Forest Keepers']);
  const result=prepareProposal({modelResult:extraction,message:'до 2000 на всё',catalog:DEMO_CATALOG});
  assert.equal(result.total,1780);
});
test('selection algorithm respects budget and maximum items',()=>{
  const picks=chooseUnderBudget(DEMO_CATALOG,2,1400,'A');
  assert.ok(picks.reduce((s,i)=>s+i.regionPrices.A,0)<=1400);
  assert.ok(picks.length<=2);
});