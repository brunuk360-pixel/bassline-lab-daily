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
 page.on("request",r=>{const u=r.url();if(u.startsWith(origin+"/")||u.startsWith("data:")||u.startsWith("blob:")||u==="about:blank")r.continue().catch(()=>{});else if(r.resourceType()==="image"&&/^https:\/\/([a-z0-9-]+\.(?:mzstatic\.com|bcbits\.com|shopify\.com)|coverartarchive\.org|i\.scdn\.co)\//.test(u)){r.respond({status:200,contentType:"image/jpeg",body:fs.readFileSync(path.join(root,"section-art","warehouse.jpg"))}).catch(()=>{})}else r.abort().catch(()=>{})});
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
 await check("Discovery room theme and on-screen navigation",async()=>{
 await nav("Today");await page.click(".sl-d-entry");await page.waitForSelector(".sl-discovery-dialog[open] .sl-d-editorial-head");
 const go=async label=>{assert.ok(await page.evaluate(label=>{const b=[...document.querySelectorAll(".sl-d-screen-nav button")].find(n=>n.textContent.includes(label));if(!b)return false;b.click();return true},label));await settle()};
 await page.waitForFunction(()=>document.querySelector(".sl-d-editorial-photo")?.naturalWidth>0);
 assert.equal(await page.$eval(".sl-d-editorial-head",n=>getComputedStyle(n).backgroundColor),"rgb(236, 236, 227)");
 await go("Explore");assert.equal(await page.$eval(".sl-discovery-dialog",n=>n.dataset.room),"hub");
 await go("Library");assert.equal(await page.$eval(".sl-discovery-dialog",n=>n.dataset.room),"journey");
 await page.click(".sl-d-back");assert.equal(await page.$eval(".sl-discovery-dialog",n=>n.dataset.room),"hub");
 await page.setViewport({width:320,height:700,isMobile:true,hasTouch:true,deviceScaleFactor:1});await settle();
 assert.equal(await page.$eval(".sl-discovery-dialog",n=>n.scrollWidth>n.clientWidth+2),false);
 const controls=await page.$$eval(".sl-d-screen-nav button",nodes=>nodes.map(n=>n.getBoundingClientRect().height));assert.ok(controls.every(h=>h>=44));
 await go("Genres");await page.waitForSelector(".sl-chart-directory");assert.equal(await page.$eval(".sl-discovery-dialog",n=>n.open),false);
 await page.setViewport({width:390,height:844,isMobile:true,hasTouch:true,deviceScaleFactor:1});await nav("Today");await page.click(".sl-d-entry");await go("Home");await page.waitForSelector("#app .night-home");assert.equal(await page.$eval(".sl-discovery-dialog",n=>n.open),false);
 });
 await check("Artwork-linked archive and listening queue",async()=>{
 await nav("Today");await page.click(".sl-d-entry");await page.waitForSelector(".sl-discovery-dialog[open]");
 await page.evaluate(()=>[...document.querySelectorAll(".sl-d-screen-nav button")].find(b=>b.textContent==="Explore").click());await settle();
 await page.evaluate(()=>[...document.querySelectorAll(".sl-d-tile")].find(b=>b.textContent.includes("On This Day")).click());await page.waitForSelector(".sl-d-history-event");
 const art=await page.evaluate(()=>{const imgs=[...document.querySelectorAll(".sl-d-history-event .sl-d-small-cover")];return {count:imgs.length,valid:imgs.every(img=>img.alt.endsWith("release artwork")&&Object.values(window.__slDiscovery.artwork).includes(img.getAttribute("src")))}});
 assert.ok(art.count>0&&art.valid,"nonempty archive artwork uses only verified release references");
 assert.ok(await page.$(".sl-d-history-event .sl-d-history-copy button"));
 await page.click(".sl-d-back");await page.waitForSelector(".sl-d-hub");await page.click(".sl-d-close");
 await page.waitForFunction(()=>!document.querySelector(".sl-discovery-dialog")?.open);
 });
 await check("Illustrated Explore shortcuts and unique room artwork",async()=>{
 await nav("Explore");await page.waitForSelector(".sl-d-shortcut-image");
 const inspect=selector=>page.evaluate(sel=>{const imgs=[...document.querySelectorAll(sel)];return {count:imgs.length,unique:new Set(imgs.map(n=>n.getAttribute("src"))).size,known:imgs.every(n=>Object.values(window.__slDiscovery.artwork).includes(n.getAttribute("src"))||/^section-art\/(genres|warehouse|underground|afterhours|late-drive)\.jpg$/.test(n.getAttribute("src"))) }},selector);
 const entry=await inspect(".sl-d-shortcut-image");assert.equal(entry.count,8);assert.equal(entry.unique,8);assert.ok(entry.known);
 await page.evaluate(()=>[...document.querySelectorAll(".sl-d-explore button")].find(b=>b.textContent.includes("Browse complete catalogue")).click());await page.waitForSelector(".sl-d-hub");
 const hub=await inspect(".sl-d-tile-image");assert.equal(hub.count,8);assert.equal(hub.unique,8);assert.ok(hub.known);
 await page.setViewport({width:320,height:700,isMobile:true,hasTouch:true,deviceScaleFactor:1});await settle();assert.equal(await page.$eval(".sl-discovery-dialog",n=>n.scrollWidth>n.clientWidth+2),false);
 await page.click(".sl-d-close");await page.waitForFunction(()=>!document.querySelector(".sl-discovery-dialog")?.open);assert.equal(await overflow(),false);
 await page.setViewport({width:390,height:844,isMobile:true,hasTouch:true,deviceScaleFactor:1});await nav("Today");
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
 const styleOf=()=>page.evaluate(()=>{const r=Array.from(document.querySelectorAll("#app .track")).find(n=>n.getClientRects().length),line=r?.querySelector(".trackline"),cover=line?.querySelector(".cover"),title=line?.querySelector(".tracktitle");const pick=(n,keys)=>Object.fromEntries(keys.map(k=>[k,n?getComputedStyle(n)[k]:""]));return {row:pick(r,["borderRadius","backgroundColor","borderBottomWidth"]),line:pick(line,["display","paddingTop","paddingBottom","paddingLeft","paddingRight","gap","alignItems"]),cover:pick(cover,["width","height","borderRadius"]),title:pick(title?.querySelector("strong,b"),["fontSize","fontWeight","lineHeight","color"]),artist:pick(title?.querySelector("small"),["fontSize","color"]),structure:Array.from(line?.children||[]).map(n=>({tag:n.tagName,cls:n.getAttribute("class")||""}))}});
 const discoverStyle=await styleOf();console.log("SUBLEVEL native Discover card style: "+JSON.stringify(discoverStyle));
 await clickTab("Top 10");await page.waitForSelector(".sl-chart-inline .sl-chart-native-row");state=await inspect();assert.ok(state.chart&&state.adjacent);assert.equal(state.visibleTracks,10,"Only ten native ranked cards visible");
 const chartStyle=await styleOf();console.log("SUBLEVEL native Top 10 card style: "+JSON.stringify(chartStyle));
 for(const field of ["row","line","cover","title","artist"])assert.deepEqual(chartStyle[field],discoverStyle[field],"Native style parity: "+field);
 const controlCounts=await page.evaluate(()=>Array.from(document.querySelectorAll(".sl-chart-native-row"),r=>r.querySelectorAll(".trackline > .play,.trackline > .iconbtn").length));assert.ok(controlCounts.every(n=>n===3),"Three native-style track actions per ranked card");
 await page.click(".sl-chart-native-row .tracktitle");assert.equal(await page.$eval(".sl-chart-native-row .sl-chart-native-expand",n=>n.getAttribute("aria-expanded")),"true");assert.ok(await page.$(".sl-chart-native-detail:not([hidden]) a[href^='https://']"));
 await page.click(".sl-chart-native-row .sl-chart-native-expand");assert.equal(await page.$eval(".sl-chart-native-row .sl-chart-native-expand",n=>n.getAttribute("aria-expanded")),"false");
 const playable=await page.evaluate(()=>Array.from(document.querySelectorAll(".sl-chart-native-row button.sl-chart-native-play")).map(x=>x.getAttribute("aria-label")));assert.ok(playable.length>=3,"Three or more verified D&B chart player identities");
 await page.click(".sl-chart-native-row button.sl-chart-native-play");await page.waitForSelector(".sl-player iframe");assert.ok(await page.$(".sl-player iframe"));await page.click('.sl-player button[aria-label="Stop and close player"]');
 await page.click(".sl-chart-native-row .sl-chart-native-queue");assert.match(await page.$eval(".sl-chart-native-row .sl-chart-native-queue",n=>n.getAttribute("aria-label")),/^Queued:/);
 const actual=await page.evaluate(()=>Array.from(document.querySelectorAll(".sl-chart-inline .sl-chart-native-title"),x=>x.textContent));const expected=await page.evaluate(()=>window.__slCharts.charts.find(c=>c.id==="dnb").rows.map(r=>r.title));assert.deepEqual(actual,expected);assert.equal(await overflow(),false);
 await clickTab("Discover 10");state=await inspect();assert.ok(!state.chart&&state.visibleTracks>0,"Switching back restores Discover 10");
 await clickTab("Top 10");await page.waitForSelector(".sl-chart-inline .sl-chart-native-row");assert.equal(await page.evaluate(()=>document.querySelectorAll(".sl-chart-inline").length),1);assert.equal(await overflow(),false);
 await nav("Today");assert.equal(await page.evaluate(()=>document.getElementById("app").hasAttribute("data-sl-chart-mode")),false,"No chart state leaks to home");
 });
 await check("House, Techno and Garage native chart rooms",async()=>{
 for(const genre of ["House","Techno","UK Garage"]){
  await nav("Today");await nav("Genres");
  const opened=await page.evaluate(name=>{
   const norm=s=>(s||"").toLowerCase().replace(/[^a-z0-9]/g,"");
   const cards=Array.from(document.querySelectorAll("#app .genre"));
   const card=cards.find(n=>norm(n.querySelector(".genre-name")?.textContent)===norm(name));
   if(!card)return false;card.click();return true
  },genre);
  assert.ok(opened,"Genre card exists: "+genre);
  await page.waitForSelector("#app .roomhead");await settle();
  const tab=async name=>{assert.ok(await page.evaluate(t=>{const b=Array.from(document.querySelectorAll("#app .tabs button")).find(n=>n.textContent.toLowerCase().replace(/[^a-z0-9]/g,"")===t);if(!b)return false;b.click();return true},name));await settle()};
  await tab("discover10");
  const baseline=await page.evaluate(()=>{const t=Array.from(document.querySelectorAll(".tracks .track")).find(x=>x.getClientRects().length),s=getComputedStyle(t.querySelector(".trackline"));return [s.gap,s.paddingTop,s.paddingLeft,getComputedStyle(t.querySelector(".cover")).width]});
  await tab("top10");await page.waitForSelector(".sl-chart-native-row");
  const result=await page.evaluate(()=>{const name=document.querySelector(".roomcopy h1")?.textContent.trim()||document.querySelector(".roomhead h1")?.textContent.trim();const f=window.__slCharts,norm=s=>(s||"").toLowerCase().replace(/[^a-z0-9]/g,""),room=f.rooms.find(r=>norm(r[0])===norm(name)),source=f.sources.find(s=>norm(s[0])===norm(room?.[1])),chart=f.charts.find(c=>c.id===source?.[2]);const rows=Array.from(document.querySelectorAll(".sl-chart-native-row")),s=getComputedStyle(rows[0].querySelector(".trackline"));return {actual:rows.map(r=>r.querySelector(".sl-chart-native-title").textContent),expected:chart?.rows.map(r=>r.title),style:[s.gap,s.paddingTop,s.paddingLeft,getComputedStyle(rows[0].querySelector(".cover")).width],visible:rows.filter(r=>r.getClientRects().length).length,controls:rows.every(r=>r.querySelectorAll(".trackline > .play,.trackline > .iconbtn").length===3)}});
  assert.equal(result.visible,10,genre);assert.deepEqual(result.actual,result.expected,genre+" chart order");assert.deepEqual(result.style,baseline,genre+" native styles");assert.ok(result.controls,genre);assert.equal(await overflow(),false,genre);
  await tab("discover10");assert.equal(await page.$(".sl-chart-inline"),null);
 }
 await nav("Today");
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
 await check("Persistent player queue editing preserves active iframe",async()=>{
 await nav("Today");
 await page.evaluate(()=>{const ids=["allnight","baddadan","fire","backbone"];const records=ids.map(id=>{const r=window.__slDiscovery.items.find(x=>x[0]===id);return {id:r[0],title:r[1],artist:r[2],url:r[6]}});window.SUBLEVELPlayer.play(records[0],records)});
 await page.waitForSelector(".sl-player iframe");await page.evaluate(()=>window.__qaEditFrame=document.querySelector(".sl-player iframe"));
 await page.$eval(".sl-p-queue",n=>n.open=true);
 const before=await page.$$eval(".sl-p-queue-select",nodes=>nodes.map(n=>n.textContent.replace(/^\d+\. /,"")));
 await page.click(".sl-p-queue-row:nth-child(3) .sl-p-queue-edit:first-child");
 const after=await page.$$eval(".sl-p-queue-select",nodes=>nodes.map(n=>n.textContent.replace(/^\d+\. /,"")));assert.deepEqual(after,[before[0],before[2],before[1],before[3]]);
 await page.click(".sl-p-queue-row:nth-child(4) .sl-p-queue-edit:last-child");
 assert.equal(await page.$$eval(".sl-p-queue-select",n=>n.length),3);
 assert.equal(await page.evaluate(()=>window.__qaEditFrame===document.querySelector(".sl-player iframe")),true);
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem("sublevel.player.queue.v1")));assert.deepEqual(saved.items.map(r=>r.id),["allnight","fire","baddadan"]);
 assert.equal(await page.$eval(".sl-player",n=>n.scrollWidth>n.clientWidth+2),false);
 await page.click('.sl-player button[aria-label="Stop and close player"]');
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
 await page.select(select,"tracklist");await settle();
 const factTitles=await page.evaluate(()=>Array.from(document.querySelectorAll(".sl-d-results .sl-d-record h3"),x=>x.textContent));
 const factExpected=await page.evaluate(()=>Object.values(window.__slDiscovery.releaseFacts).map(x=>x.title));
 assert.ok(factTitles.length>0&&factTitles.every(t=>factExpected.includes(t)),"Tracklist filter includes only documented releases");
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
