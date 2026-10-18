/**
 * Mocked model response, intentionally no network calls and no secrets.
 * The production AI integration is deliberately NOT shared publicly.
 */
export function mockExtract(message) {
  const text=String(message??'').toLowerCase();
  const mentions=[];
  for (const [re, title] of [
    [/океан|ocean\s+quest/,'Ocean Quest'],
    [/неон|neon\s+drift/,'Neon Drift'],
    [/лесн|forest\s+keepers/,'Forest Keepers'],
    [/хроник|starlight/,'Starlight Chronicles'],
    [/архитектор\s+планет|planet\s+architect/,'Planet Architect'],
    [/головоломк|пазл|puzzle/,'Puzzle Parade']
  ]) if(re.test(text))mentions.push(title);
  const amount=text.match(/\b([1-9])\s*(?:игр[уы]?|штук[и]?)/u);
  return {mentions,count:amount?Number(amount[1]):Math.max(mentions.length,1),source:'offline-demo'};
}