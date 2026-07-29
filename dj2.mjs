import { chromium } from '/Users/paulsalem/.npm/_npx/2334a3ea0ef73d73/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath:'/Users/paulsalem/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing', args:['--no-sandbox','--autoplay-policy=no-user-gesture-required'] });
const c = await b.newContext({ viewport:{width:1100,height:820} });
const p = await c.newPage();
await p.goto('http://localhost:8080/dear-joshua-game.html',{waitUntil:'load'}); await p.waitForTimeout(1500);
await p.keyboard.press('Enter'); await p.waitForTimeout(1200);
// let the song run so a line highlights, and type a couple words
const l0="autopilot turns";
for(const ch of l0){ if(/[a-z0-9]/i.test(ch)){ await p.keyboard.type(ch); await p.waitForTimeout(45); } }
await p.waitForTimeout(900);
await p.screenshot({path:'scratchpad/dj-karaoke.png'});
// jump ahead in the song to see scroll + a later line highlight
await p.evaluate(()=>{ if(audio) audio.currentTime=42; });
await p.waitForTimeout(1200);
await p.screenshot({path:'scratchpad/dj-karaoke2.png'});
const st=await p.evaluate(()=>({li, songT:audio?audio.currentTime.toFixed(0):'-'}));
console.log('state:',JSON.stringify(st));
await b.close();
