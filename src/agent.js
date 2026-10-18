/**
 * Deterministic part of a manager-in-the-loop AI workflow.
 * The LLM (simulated separately) suggests candidates; this code validates
 * candidates, applies prices from a trusted catalog and enforces budgets.
 * Adapted as a self-contained public educational excerpt from a real workflow;
 * it is NOT the production pricing engine.
 */
export function normalizeText(value) {
  return String(value ?? '').normalize('NFKC').toLowerCase().replace(/ё/g,'е')
    .replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ');
}

function tokenize(text) { return normalizeText(text).split(' ').filter(Boolean); }
function exactAlias(item, normalized) {
  return [item.title, ...(item.aliases||[])].some(a => normalizeText(a) === normalized);
}

export function resolveCatalogItem(mention, catalog) {
  const query=normalizeText(mention);
  if (!query) return {status:'missing',matches:[]};
  const exact=catalog.filter(item=>exactAlias(item,query));
  if(exact.length===1) return {status:'resolved',item:exact[0],matches:exact};
  if(exact.length>1) return {status:'ambiguous',matches:exact};
  const tokens=tokenize(mention);
  // A subset/similarity result is a suggestion, never an auto-approved order.
  const suggested=catalog.filter(item=>[item.title,...(item.aliases||[])].some(alias=>
    tokens.every(t=>tokenize(alias).includes(t))));
  if(suggested.length===1) return {status:'needs-review',matches:suggested};
  if(suggested.length>1) return {status:'ambiguous',matches:suggested};
  return {status:'missing',matches:[]};
}

/** Keep total-vs-per-item meaning explicit. Conflicts require human review. */
export function parseBudget(message){
  const clean=normalizeText(message).replace(/\s(?=\d{3}(?:\s|$))/g,'');
  const match=clean.match(/(?:до|бюджет|не больше|максимум)\s*(\d{3,6})\s*(?:руб|р|₽)?/u);
  if(!match) return {limit:null,scope:'unset',needsReview:false};
  const limit=Number(match[1]);
  const per=/(?:кажд(?:ая|ую|ой)|за\s+каждую|за\s+одну|за\s+игру|по\s*\d+\s*за\s*игру)/u.test(clean);
  const total=/(?:на\s*все|всего|общий|за\s*все|суммарно)/u.test(clean);
  if(per && total) return {limit,scope:'unclear',needsReview:true};
  if(per) return {limit,scope:'per-item',needsReview:false};
  if(total) return {limit,scope:'total',needsReview:false};
  // No assumption that 'up to 3000' means a total budget.
  return {limit,scope:'unclear',needsReview:true};
}

export function priceFor(item,region){
  const price=item?.regionPrices?.[region];
  if(!Number.isSafeInteger(price)||price<0) throw new Error('Price unavailable for the selected region');
  return price;
}

/**
 * Choose as many items as requested under total budget. Preference is catalog
 * ranking (stable order), not cheapest cost. Exact enumeration is bounded to
 * a small demo catalog; production code uses a bounded DP approach.
 */
export function chooseUnderBudget(items, count, budget, region){
  const selected=[];
  let best=[];
  const cap=Math.max(0,Math.min(count,items.length));
  function walk(start,total){
    if(selected.length>best.length || (selected.length===best.length &&
      selected.map(x=>items.indexOf(x)).join(',')<best.map(x=>items.indexOf(x)).join(','))){best=[...selected];}
    if(selected.length===cap) return;
    for(let i=start;i<items.length;i++){
      const cost=priceFor(items[i],region);
      if(total+cost>budget) continue;
      selected.push(items[i]);walk(i+1,total+cost);selected.pop();
    }
  }
  walk(0,0); return best;
}

/** Never trust LLM-provided monetary values or client secrets. */
export function prepareProposal({modelResult,message,catalog,region='A'}){
  if(!['A','B'].includes(region)) throw new Error('Unsupported demo region');
  const budget=parseBudget(message);
  const names=Array.isArray(modelResult?.mentions)?modelResult.mentions.filter(x=>typeof x==='string').slice(0,12):[];
  const candidates=names.map(name=>({mention:name,...resolveCatalogItem(name,catalog)}));
  const confident=candidates.filter(x=>x.status==='resolved').map(x=>x.item);
  const unique=[...new Map(confident.map(item=>[item.id,item])).values()];
  const requiresReview=budget.needsReview||candidates.some(x=>x.status!=='resolved');
  const count=Math.max(1,Math.min(10,Number.isInteger(modelResult?.count)?modelResult.count:unique.length||1));
  const basket=budget.scope==='total'
    ? chooseUnderBudget(unique,count,budget.limit,region)
    : unique.filter(item=>budget.scope!=='per-item'||priceFor(item,region)<=budget.limit).slice(0,count);
  const items=basket.map(item=>({id:item.id,title:item.title,price:priceFor(item,region)}));
  const total=items.reduce((s,item)=>s+item.price,0);
  return {items,total,region,budget,requiresReview:true,manualCheckRecommended:requiresReview,
    warnings:[
      ...(budget.needsReview?['Уточните: бюджет на всю корзину или на одну игру.']:[]),
      ...candidates.filter(x=>x.status!=='resolved').map(x=>`Проверьте название: «${x.mention}» (${x.status}).`),
      ...(basket.length<count?['Не удалось подобрать запрошенное количество товаров.']:[])
    ],candidates};
}