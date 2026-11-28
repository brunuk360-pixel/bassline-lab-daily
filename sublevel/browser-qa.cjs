"use strict";
// Browser smoke test against the actual generated site, not a recreation.
// Network isolated: no requests to remote music services, account APIs or tracking.
const path=require("node:path"),fs=require("node:fs"),http=require("node:http"),assert=require("node:assert/strict");
const deps=process.env.SL_QA_DEPS||"/tmp/sublevel-qa/node_modules";
const puppeteer=require(path.join(deps,"puppeteer-core"));
const chromium=require(path.join(deps,"@sparticuz/chromium"));
const root=path.resolve(process.argv[2]||"crate-public");
const server=http.createServer((req,res)=>{
 try{let p=path.resolve(root,"."+decodeURIComponent(new URL(req.url,"http://localhost").pathname));if(!p.startsWith(root+path.sep)&&p!==root){res.writeHead(403).end();return}if(p===root)p=path.join(root,"index.html");
 const data=fs.readFileSync(p),type={".html":"text/html; charset=utf-8",".jpg":"image/jpeg",".png":"image/png",".webp":"image/webp",".json":"application/json"}[path.extname(p)]||"application/octet-stream";res.writeHead(200,{"Content-Type":type});res.end(data)
 }catch{res.writeHead(404).end()}
});
(async()=>{
 let browser;let failures=0;const checks=[];
 try{
 await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
 const origin="http://127.0.0.1:"+server.address().port;
 chromium.setGraphicsMode=false;
 browser=await puppeteer.launch({executablePath:await chromium.executablePath(),args:[...chromium.args,"--disable-dev-shm-usage"],headless:true,defaultViewport:{width:390,height:844,isMobile:true,hasTouch:true,deviceScaleFactor:1}});
 const page=await browser.newPage();page.setDefaultTimeout(6000);await page.setRequestInterception(true);
 page.on("request",r=>{const u=r.url();if(u.startsWith(origin+"/")||u.startsWith("data:")||u.startsWith("blob:")||u==="about:blank")r.continue().catch(()=>{});else r.abort().catch(()=>{})});
 let runtimeErrors=0;page.on("pageerror",()=>runtimeErrors++);
 await page.goto(origin+"/",{waitUntil:"domcontentloaded",timeout:15000});await page.waitForSelector("#app .night-home");
 const check=async(name,fn)=>{try{await fn();checks.push(name+" PASS")}catch(e){failures++;checks.push(name+" FAIL ("+(e.name==="AssertionError"?"assertion":"navigation/runtime")+")");console.log("QA diagnostic "+name+": "+String(e.message).slice(0,500))}};
 const settle=()=>new Promise(r=>setTimeout(r,220));
 const nav=async name=>{await page.click('.bottom button[data-nav-label="'+name+'"]');await settle()};
 const overflow=()=>page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2);
 await check("390px homepage layout",async()=>{await page.waitForSelector(".sl-home-index");assert.equal(await overflow(),false)});
 await check("Daily Dig and listening queue",async()=>{
 await page.click(".sl-d-entry");await page.waitForSelector(".sl-discovery-dialog[open]");assert.equal(await page.$eval(".sl-discovery-dialog",d=>d.scrollWidth>d.clientWidth+2),false);
 const edition=await page.evaluate(()=>{const D=window.__slDiscovery,today=new Intl.DateTimeFormat("sv-SE",{timeZone:"Europe/London",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());const f=D.editorialFeature;if(f?.date!==today||f.ids.length!==10)return null;return {expected:f.ids.map(id=>D.items.find(r=>r[0]===id)?.[1]),actual:[...document.querySelectorAll(".sl-discovery-dialog .sl-d-list")][0]&&[...document.querySelectorAll(".sl-discovery-dialog .sl-d-list:first-of-type .sl-d-record h3")].slice(0,10).map(x=>x.textContent),firstList:[...document.querySelector(".sl-discovery-dialog .sl-d-list")?.querySelectorAll(".sl-d-record h3")||[]].map(x=>x.textContent)}});
 if(edition)assert.deepEqual(edition.firstList,edition.expected,"today's editorial release order");
 const listen=await page.evaluate(()=>{const b=[...document.querySelectorAll(".sl-discovery-dialog button")].find(x=>x.textContent.includes("Start listening"));if(!b)return false;b.click();return true});assert.ok(listen);
 await page.waitForSelector(".sl-d-queue");assert.ok(await page.$(".sl-d-queue-row"));
 assert.ok(await page.$(".sl-d-release-hero h1"));assert.equal(await page.evaluate(()=>document.querySelectorAll(".sl-d-release-meta dt").length),3);assert.equal(await page.$eval(".sl-discovery-dialog",d=>d.scrollWidth>d.clientWidth+2),false);
 await page.click(".sl-d-close");await page.waitForFunction(()=>!document.querySelector(".sl-discovery-dialog")?.open);
 });
 await check("Genre directory and chart selector",async()=>{
 await nav("Genres");await page.waitForSelector(".sl-chart-directory");
 const labels=await page.evaluate(()=>[...document.querySelectorAll("#app button")].filter(b=>!b.closest(".sl-chart-directory")&&b.getClientRects().length).map(b=>b.innerText.trim().replace(/\s+/g," ").slice(0,85)).filter(Boolean).slice(0,50));
 console.log("SUBLEVEL public genre view controls: "+JSON.stringify(labels));
 await page.click(".sl-chart-summary");await page.select(".sl-chart-select","House");await settle();
 assert.equal(await page.$$eval(".sl-chart-directory .sl-chart-row",rows=>rows.length),10);
 assert.equal(await overflow(),false);
 });
 await check("Every original genre room has a complete labelled chart",async()=>{
 const rooms=await page.evaluate(()=>window.__slCharts.rooms.map(r=>r[0]));
 assert.equal(rooms.length,20);
 for(const room of rooms){
   await page.select(".sl-chart-select",room);await settle();
   const expected=await page.evaluate(name=>{const f=window.__slCharts,room=f.rooms.find(r=>r[0]===name),source=f.sources.find(s=>s[0]===room[1]),chart=f.charts.find(c=>c.id===source[2]);return chart.rows.map(r=>r.title)},room);
   const actual=await page.evaluate(()=>Array.from(document.querySelectorAll(".sl-chart-directory .sl-chart-row strong"),r=>r.textContent));
   assert.equal(actual.length,10,room);
   assert.deepEqual(actual,expected,room+" ranking order");
   assert.equal(await overflow(),false,room+" horizontal overflow");
   assert.ok(await page.$eval(".sl-chart-directory .sl-chart-status",n=>n.textContent.trim().length>0),room);
 }
 });
 await check("Combined Hip Hop and R&B chart playback",async()=>{
 await page.select(".sl-chart-select","Hip-Hop");await settle();
 const expected=await page.evaluate(()=>{const c=window.__slCharts.charts.find(x=>x.id==="hip-hop-rnb");return {count:c.rows.length,tracks:c.rows.map(r=>({id:"chart:"+c.id+":"+r.title+":"+r.artist,title:r.title,artist:r.artist,url:r.url||"https://music.youtube.com/search?q="+encodeURIComponent(r.artist+" "+r.title),embedUrl:r.embedUrl})).filter(r=>window.SUBLEVELPlayer.available(r)).map(r=>r.title)}});
 assert.equal(await page.$$eval(".sl-chart-directory .sl-chart-row",x=>x.length),expected.count);
 assert.match(await page.$eval(".sl-chart-directory h2",x=>x.textContent),/Hip Hop & R&B/);
 assert.equal(await page.$$eval(".sl-chart-directory .sl-chart-play",x=>x.length),expected.tracks.length);
 if(expected.tracks.length){await page.click(".sl-chart-directory .sl-chart-play");await page.waitForSelector(".sl-player iframe");assert.ok(await page.$eval(".sl-player .sl-p-copy strong",(n,t)=>n.textContent===t,expected.tracks[0]));await page.click('.sl-player button[aria-label="Stop and close player"]')}
 await page.select(".sl-chart-select","R&B");await settle();
 assert.equal(await page.$$eval(".sl-chart-directory .sl-chart-row",x=>x.length),expected.count);
 assert.equal(await overflow(),false);
 });
 await check("Genre room Top 10 is a native tab beside Discover 10",async()=>{
 await nav("Today");await page.waitForSelector("#app .night-home");await nav("Genres");
 const clicked=await page.evaluate(()=>{const b=[...document.querySelectorAll("#app button")].find(b=>!b.closest(".sl-chart-directory")&&/drum\s*(?:&|and)\s*bass/i.test(b.textContent)&&/discover/i.test(b.textContent));if(!b)return false;b.click();return true});assert.ok(clicked,"Could not locate D&B genre card");
 await page.waitForSelector("#app .roomhead");await settle();
 const inspect=()=>page.evaluate(()=>{const tabs=document.querySelector("#app .tabs"),buttons=Array.from(tabs?.querySelectorAll("button")||[]);const top=buttons.find(b=>b.textContent.trim()==="Top 10"),discover=buttons.find(b=>b.textContent.toLowerCase().replace(/[^a-z0-9]+/g,"")==="discover10");return {labels:buttons.map(b=>({text:b.textContent.trim(),class:b.className})),adjacent:!!top&&!!discover&&discover.nextElementSibling===top,visibleTracks:Array.from(document.querySelectorAll("#app .track")).filter(x=>x.getClientRects().length).length,chart:!!document.querySelector("#app .sl-chart-inline")}});
 const clickTab=async name=>{assert.ok(await page.evaluate(name=>{const b=Array.from(document.querySelectorAll("#app .tabs button")).find(b=>b.textContent.toLowerCase().replace(/[^a-z0-9]+/g,"")===name.toLowerCase().replace(/[^a-z0-9]+/g,""));if(!b)return false;b.click();return true},name),"Missing native tab "+name);await settle()};
 let state=await inspect();console.log("SUBLEVEL genre tab diagnostic: "+JSON.stringify(state));assert.ok(state.adjacent,"Top 10 must be immediately beside Discover 10");
 await clickTab("Discover 10");state=await inspect();assert.ok(!state.chart,"Discover tab must not show the chart");assert.ok(state.visibleTracks>0,"Discover 10 tracks visible");
 await clickTab("Top 10");await page.waitForSelector(".sl-chart-inline .sl-chart-row");state=await inspect();assert.ok(state.chart&&state.adjacent);assert.equal(state.visibleTracks,0,"No legacy archive shown under current chart");
 const actual=await page.evaluate(()=>Array.from(document.querySelectorAll(".sl-chart-inline .sl-chart-row strong"),x=>x.textContent));const expected=await page.evaluate(()=>window.__slCharts.charts.find(c=>c.id==="dnb").rows.map(r=>r.title));assert.deepEqual(actual,expected);assert.equal(await overflow(),false);
 await clickTab("Discover 10");state=await inspect();assert.ok(!state.chart&&state.visibleTracks>0,"Switching back restores Discover 10");
 await clickTab("Top 10");await page.waitForSelector(".sl-chart-inline .sl-chart-row");assert.equal(await page.evaluate(()=>document.querySelectorAll(".sl-chart-inline").length),1);assert.equal(await overflow(),false);
 await nav("Today");assert.equal(await page.evaluate(()=>document.getElementById("app").hasAttribute("data-sl-chart-mode")),false,"No chart state leaks to home");
 });
 await check("Persistent official player",async()=>{
 await nav("Today");await page.waitForSelector(".sl-d-entry");
 await page.click(".sl-d-entry");await page.waitForSelector(".sl-discovery-dialog[open]");
 const started=await page.evaluate(()=>{const r=window.__slDiscovery.items.find(x=>x[0]==="allnight");if(!r)return false;const items=window.__slDiscovery.items.filter(x=>["allnight","baddadan"].includes(x[0])).map(([id,title,artist,date,genre,tag,url])=>({id,title,artist,url}));window.SUBLEVELPlayer.play(items.find(x=>x.id==="allnight"),items);return true});assert.ok(started);
 await page.waitForSelector(".sl-player iframe");const src=await page.$eval(".sl-player iframe",f=>f.src);assert.match(src,/^https:\/\/open\.spotify\.com\/embed\/track\//);
 await page.evaluate(()=>{window.__qaPlayerFrame=document.querySelector(".sl-player iframe")});
 await page.click(".sl-d-close");await page.waitForFunction(()=>!document.querySelector(".sl-discovery-dialog")?.open);
 await nav("Genres");assert.equal(await page.evaluate(()=>window.__qaPlayerFrame===document.querySelector(".sl-player iframe")),true,"same iframe survives navigation");
 await page.click('.sl-player button[aria-label="Compact player details"]');assert.equal(await page.evaluate(()=>window.__qaPlayerFrame===document.querySelector(".sl-player iframe")),true,"compact preserves iframe");await page.click('.sl-player button[aria-label="Expand player details"]');await page.click(".sl-p-queue summary");await page.click(".sl-p-options button:nth-child(2)");assert.equal(await page.$eval(".sl-p-options button:nth-child(2)",b=>b.getAttribute("aria-pressed")),"true");await page.click(".sl-p-options button:first-child");await page.click(".sl-p-queue summary");await page.click('.sl-player button[aria-label="Next selection"]');assert.notEqual(await page.$eval(".sl-player iframe",f=>f.src),src);
 await page.click('.sl-player button[aria-label="Stop and close player"]');assert.equal(await page.$(".sl-player iframe"),null);
 });
 await check("Listen here catalogue and real play button",async()=>{
 await nav("Today");await page.waitForSelector(".sl-d-playable-entry");await page.click(".sl-d-playable-entry");await page.waitForSelector('.sl-discovery-dialog[data-room="playable"][open]');
 const count=await page.$$eval(".sl-d-results .sl-p-launch",x=>x.length);assert.ok(count>=17,"expected expanded playable catalogue");
 assert.equal(await page.$$eval(".sl-d-results .sl-p-source",x=>x.length),0,"only confirmed embed sources");
 assert.equal(await page.$(".sl-player iframe"),null,"no provider before choosing track");
 await page.click(".sl-d-results .sl-p-launch");await page.waitForSelector(".sl-player iframe");
 const src=await page.$eval(".sl-player iframe",f=>f.src);assert.ok(["open.spotify.com","www.youtube-nocookie.com","w.soundcloud.com","bandcamp.com","embed.music.apple.com"].includes(new URL(src).hostname));
 await page.click('.sl-player button[aria-label="Stop and close player"]');await page.click(".sl-d-close");
 assert.equal(await page.$(".sl-player iframe"),null);
 });
 await check("Apple Music official preview and catalogue availability filter",async()=>{
 await nav("Today");await page.waitForSelector(".sl-d-entry");await page.click(".sl-d-entry");await page.waitForSelector(".sl-discovery-dialog[open]");
 const select='select[aria-label="Filter by availability"]';await page.waitForSelector(select);await page.select(select,"covered");await settle();
 const count=await page.evaluate(()=>{const r=document.querySelector(".sl-d-results");return {all:r.querySelectorAll(".sl-d-record").length,empty:r.querySelectorAll(".sl-d-record.sl-d-no-art").length}});assert.ok(count.all>0);
 // Provider images are deliberately blocked, so inspect filter membership using original record titles.
 const shown=await page.evaluate(()=>Array.from(document.querySelectorAll(".sl-d-results .sl-d-record h3"),x=>x.textContent));const valid=await page.evaluate(()=>window.__slDiscovery.items.filter(r=>window.__slDiscovery.artwork[r[0]]).map(r=>r[1]));assert.ok(shown.every(t=>valid.includes(t)));
 await page.select(select,"playable");await settle();assert.equal(await page.evaluate(()=>document.querySelectorAll(".sl-d-results .sl-p-source").length),0);
 const started=await page.evaluate(()=>{const row=window.__slDiscovery.items.find(r=>r[0]==="dusky-bindweed");if(!row)return false;const [id,title,artist,date,genre,tag,url]=row;const record={id,title,artist,url};if(!window.SUBLEVELPlayer.available(record))return false;window.SUBLEVELPlayer.play(record);return true});assert.ok(started);
 await page.waitForSelector(".sl-player iframe");assert.equal(await page.$eval(".sl-player iframe",f=>new URL(f.src).hostname),"embed.music.apple.com");await page.click('.sl-player button[aria-label="Stop and close player"]');await page.click(".sl-d-close");
 });
 await check("Source-reviewed release tracklist in listening room",async()=>{
 await nav("Today");await page.waitForSelector(".sl-d-entry");await page.click(".sl-d-entry");await page.waitForSelector(".sl-discovery-dialog[open]");
 const launched=await page.evaluate(()=>{const row=Array.from(document.querySelectorAll(".sl-d-record")).find(r=>r.querySelector("h3")?.textContent==="Bindweed (Limonata Mix)");const b=Array.from(row?.querySelectorAll("button")||[]).find(x=>x.textContent.includes("Listen / details"));if(!b)return false;b.click();return true});assert.ok(launched,"Expected curated Dusky release");
 await page.waitForSelector(".sl-d-release-tracks");
 const actual=await page.evaluate(()=>Array.from(document.querySelectorAll(".sl-d-release-tracks li"),r=>[r.querySelector("strong").textContent,r.querySelector("time").textContent]));const expected=await page.evaluate(()=>window.__slDiscovery.releaseFacts["dusky-bindweed"].tracks);assert.deepEqual(actual,expected);
 assert.equal(await page.$eval(".sl-d-release-tracklist a",a=>a.href),"https://duskymusic.bandcamp.com/album/bindweed-limonata-mix");assert.equal(await page.$eval(".sl-discovery-dialog",d=>d.scrollWidth>d.clientWidth+2),false);
 await page.click(".sl-d-close");
 });
 await check("Saved library tabs",async()=>{await nav("Saved");await page.waitForSelector(".sl-library-entry");await page.click(".sl-library-entry button");await page.waitForSelector(".sl-library-tabs");assert.equal(await page.$$eval(".sl-library-tab",x=>x.length),6);await page.evaluate(()=>[...document.querySelectorAll(".sl-library-tab")].find(b=>b.textContent==="Profile & data").click());assert.ok(await page.$(".sl-library-account"));await page.click(".sl-d-close")});
 await check("Unsigned link",async()=>{await nav("Today");await page.waitForSelector(".sl-u-entry");assert.equal(await page.$eval(".sl-u-primary",a=>a.href),"https://sublevel-unsigned-xvpf.onrender.com/")});
 for(const width of [320,360,430,1280])await check(width+"px homepage layout",async()=>{await page.setViewport({width,height:844,isMobile:width<700,hasTouch:width<700,deviceScaleFactor:1});await page.reload({waitUntil:"domcontentloaded"});await page.waitForSelector(".sl-home-index");assert.equal(await overflow(),false)});
 console.log("SUBLEVEL browser QA: "+JSON.stringify(checks)+"; uncaught page errors="+runtimeErrors+"; failures="+failures);
 if(failures||runtimeErrors)process.exitCode=2;
 }catch(e){console.log("SUBLEVEL browser QA unavailable or incomplete: "+e.name);process.exitCode=3}
 finally{if(browser)await browser.close().catch(()=>{});server.close()}
})().catch(()=>{process.exitCode=3});
