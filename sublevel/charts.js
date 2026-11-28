(()=>{
"use strict";
const app=document.getElementById("app"),feed=window.__slCharts;if(!app||!feed)return;
const make=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n};
const norm=s=>(s||"").toLowerCase().replace(/[^a-z0-9]+/g,"");
const alias={"drumbass":"dnb","drumandbass":"dnb","dnb":"dnb","ukgarage":"ukgaragebassline","dance":"ukdance","nudisco":"nudiscoindiedance","progressivehouse":"melodicprogressivehouse","ambient":"ambientexperimental","hardcore":"harddancehardcoreneorave"};
const today=()=>new Intl.DateTimeFormat("sv-SE",{timeZone:"Europe/London",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const link=(text,url)=>{const a=make("a","sl-chart-link",text);a.href=url;a.target="_blank";a.rel="noopener noreferrer";return a};
function status(c,now=today()){if(c.status==="weekly")return c.checked===now?"Latest checked weekly DJ report · published "+c.published:"Weekly DJ report · last checked "+c.checked;if(c.status!=="verified")return "Archived snapshot — not confirmed current";if(c.through)return now>=c.from&&now<=c.through?"Current published chart period":"Past chart period";return c.checked===now?"Verified on "+c.checked:"Last verified "+c.checked+" · refresh needed"}
function roomFor(genre){return (feed.rooms||[]).find(r=>norm(r[0])===norm(genre))}
function sourceFor(genre){const room=roomFor(genre);if(room)return room[1]?feed.sources.find(s=>norm(s[0])===norm(room[1])):undefined;const key=norm(genre);return feed.sources.find(s=>norm(s[0])===key)||feed.sources.find(s=>norm(s[0])===(alias[key]||key)||s[2]===(alias[key]||key))}
// Build chart rows with the original genre-room track classes and structure.
 // Copy presentation classes only: never clone stale record data, art, links,
 // IDs, inline handlers or saved-state controls from the editorial list.
function nativeShell(sample,tag,classes=""){
 const safeTags=["DIV","ARTICLE","SECTION","LI","OL","UL","SPAN","BUTTON","B","STRONG","SMALL","P"];
 const el=make(sample&&safeTags.includes(sample.tagName)?sample.tagName.toLowerCase():tag,sample?.className||classes);
 return el
}
function nativeChartRows(chart,template){
 const original=template?.querySelector(".track"),sample=original?.querySelector(".trackline"),sampleTitle=sample?.querySelector(".tracktitle"),sampleCover=sample?.querySelector(".cover");
 if(!sample||!sampleTitle||!sampleCover)return null;
 const list=nativeShell(template,"div","tracks");list.classList.add("tracks","sl-chart-native-list");
 const tracks=chart.rows.map(r=>({id:"chart:"+chart.id+":"+r.title+":"+r.artist,title:r.title,artist:r.artist,url:r.url||r.embedUrl||"https://music.youtube.com/search?q="+encodeURIComponent(r.artist+" "+r.title),embedUrl:r.embedUrl,alternateEmbedUrl:r.alternateEmbedUrl,embedSpec:r.embedSpec}));
 const sampleRank=Array.from(sample.children).find(n=>!n.contains(sampleTitle)&&!n.contains(sampleCover)&&(/^#?\d{1,2}$/.test(n.textContent.trim())||/rank|number|position/i.test(n.className||"")));
 const samplePlay=sample.querySelector(".play"),sampleExpand=sample.querySelector(".expandarrow"),sampleQueue=Array.from(sample.querySelectorAll(".iconbtn")).find(n=>!n.classList.contains("expandarrow"));
 const action=(cls,label,txt,fn)=>{const b=make("button",cls,txt);b.type="button";b.setAttribute("aria-label",label);b.title=label;b.addEventListener("click",fn);return b};
 for(const r of chart.rows){
  const row=nativeShell(original,"article","track");row.classList.add("track","sl-chart-native-row");row.dataset.rank=String(r.rank);
  const line=make("div",sample.className||"trackline");line.classList.add("trackline");
  const rank=nativeShell(sampleRank,"span","rank");rank.classList.add("sl-chart-native-rank");rank.textContent=String(r.rank).padStart(2,"0");
  const cover=nativeShell(sampleCover,"div","cover");cover.classList.add("cover","sl-chart-native-cover");
  if(r.art){const img=make("img");img.src=r.art;img.alt="";img.loading="lazy";img.decoding="async";img.addEventListener("error",()=>{img.remove();cover.classList.add("sl-chart-cover-unavailable")},{once:true});cover.append(img)}else cover.classList.add("sl-chart-cover-unavailable");
  const copy=nativeShell(sampleTitle,"div","tracktitle");copy.classList.add("tracktitle");
  const title=nativeShell(sampleTitle.querySelector("strong,b"),"strong");title.textContent=r.title;title.classList.add("sl-chart-native-title");
  const artist=nativeShell(sampleTitle.querySelector("small"),"small");artist.textContent=r.artist;copy.append(title,artist);
  const track=tracks[r.rank-1],playable=window.SUBLEVELPlayer?.available(track);
  const details=make("div","sl-chart-native-detail");details.hidden=true;
  const expand=action(sampleExpand?.className||"iconbtn expandarrow","Expand "+r.title,"⌄",()=>toggle());
  expand.classList.add("sl-chart-native-expand");expand.setAttribute("aria-expanded","false");
  const toggle=()=>{details.hidden=!details.hidden;expand.setAttribute("aria-expanded",String(!details.hidden));expand.textContent=details.hidden?"⌄":"⌃";copy.setAttribute("aria-expanded",String(!details.hidden))};
  if(copy.tagName==="BUTTON")copy.type="button";else{copy.setAttribute("role","button");copy.tabIndex=0;copy.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();toggle()}})}
  copy.setAttribute("aria-expanded","false");copy.addEventListener("click",toggle);
  let play;
  if(playable)play=action(samplePlay?.className||"play","Play "+r.title+" here","▶",()=>window.SUBLEVELPlayer.play(track,tracks));
  else{play=make("a",samplePlay?.className||"play","▶");play.href=track.url;play.target="_blank";play.rel="noopener noreferrer";play.setAttribute("aria-label","Open "+r.title+" release");play.title="Open original release"}
  play.classList.add("sl-chart-native-play");
  const queue=action(sampleQueue?.className||"iconbtn","Queue next: "+r.title,"+",()=>{window.SUBLEVELPlayer.addNext(track);queue.textContent="✓";queue.setAttribute("aria-label","Queued: "+r.title);queue.title="Added to listening queue"});
  queue.classList.add("sl-chart-native-queue");
  line.append(rank,cover,copy,play,queue,expand);
  details.append(link(r.url||r.embedUrl?"Listen / release ↗":"Find music ↗",track.url));
  if(playable){const p=action("sl-chart-link sl-chart-play","Play "+r.title+" here","▶ Play here",()=>window.SUBLEVELPlayer.play(track,tracks));details.append(p)}
  if(r.artSource)details.append(link("Artwork source ↗",r.artSource));
  row.append(line,details);list.append(row)
 }
 return list
}
function chartPanel(genre,template=null){
 const source=sourceFor(genre);const chart=source&&feed.charts.find(c=>c.id===source[2]);
 const panel=make("section","sl-chart-panel");
 panel.dataset.chartGenre=genre;panel.append(make("span","sl-chart-kicker","SUBLEVEL / CHART DESK"),make("h2",null,chart?chart.genre+" — Top 10":genre+" — chart sources"));
 const room=roomFor(genre);if(room?.[2])panel.append(make("p","sl-chart-meta",room[2]));
 if(chart){
 panel.append(make("p","sl-chart-status",status(chart)),make("p","sl-chart-meta",chart.source+" · "+(chart.from?chart.from+" to "+chart.through:"Checked "+chart.checked)));
 if(chart.note)panel.append(make("p","sl-chart-meta",chart.note));
 const native=template&&nativeChartRows(chart,template);
 if(native){panel.classList.add("sl-chart-native-panel");panel.prepend(native)}
 else{
 const list=make("ol","sl-chart-list");const tracks=chart.rows.map(r=>({id:"chart:"+chart.id+":"+r.title+":"+r.artist,title:r.title,artist:r.artist,url:r.url||r.embedUrl||"https://music.youtube.com/search?q="+encodeURIComponent(r.artist+" "+r.title),embedUrl:r.embedUrl,alternateEmbedUrl:r.alternateEmbedUrl,embedSpec:r.embedSpec}));for(const r of chart.rows){
 const row=make("li","sl-chart-row");row.append(make("span","sl-chart-rank",String(r.rank).padStart(2,"0")));
 if(r.art){const img=make("img","sl-chart-cover");img.src=r.art;img.alt="";img.loading="lazy";img.addEventListener("error",()=>img.remove(),{once:true});row.append(img)}
 const copy=make("div","sl-chart-copy");copy.append(make("strong",null,r.title),make("small",null,r.artist));row.append(copy,link(r.url||r.embedUrl?"Listen / release ↗":"Find music ↗",r.url||r.embedUrl||"https://music.youtube.com/search?q="+encodeURIComponent(r.artist+" "+r.title)));const track=tracks[r.rank-1];if(window.SUBLEVELPlayer?.available(track)){const play=make("button","sl-chart-link sl-chart-play","▶ Play here");play.type="button";play.addEventListener("click",()=>window.SUBLEVELPlayer.play(track,tracks));row.append(play)}list.append(row)}
 panel.append(list)
 }
 }else panel.append(make("p","sl-chart-meta",source?"A full verified Top 10 is not available in this edition. Check the live source rather than relying on an incomplete ranking.":"No verified dedicated chart has been linked for this genre. Editorial recommendations below are not current rankings."));
 if(source)panel.append(link("View latest source chart ↗",source[1]));
 return panel
}
function directory(){const panel=make("details","sl-chart-directory");panel.append(make("summary","sl-chart-summary","Current charts · choose genre"));panel.append(make("p","sl-chart-meta","Published retailer, national and DJ-play rankings, separate from editorial picks. "+feed.charts.filter(c=>status(c).startsWith("Verified on")||status(c)==="Current published chart period").length+" current dated lists; other sources and archives remain clearly identified."));
 const select=make("select","sl-chart-select");select.setAttribute("aria-label","Chart genre");
 const rooms=(feed.rooms||[]).map(r=>r[0]);const names=[...rooms,...feed.sources.map(s=>s[0]).filter(n=>!rooms.some(r=>norm(r)===norm(n)))];for(const name of names){const o=make("option",null,name);o.value=name;select.append(o)}select.value=rooms[0]||"UK Dance";
 const area=make("div","sl-chart-area");const draw=()=>area.replaceChildren(chartPanel(select.value));select.addEventListener("change",draw);panel.append(select,area);draw();return panel}
// Reuse the native genre tabs and their original click handlers. The old
// Top 10 list remains intact but is hidden while the source-dated chart is open.
let roomName="",chartSelected=null;
const tabName=b=>b.textContent.trim().replace(/\s+/g," ");
const isTop=b=>/^(?:top\s*10|top ten|archive picks)$/i.test(tabName(b));
const isDiscover=b=>norm(tabName(b))==="discover10";
const selected=b=>b.matches(".active,.on,.selected,.current,[aria-selected='true'],[aria-pressed='true'],[data-state='active']");
function roomTitle(){const room=app.querySelector(".roomhead");return room?.querySelector(".roomcopy h1")?.textContent.trim()||room?.querySelector("h1")?.textContent.trim()||""}
function clearRoomChart(){delete app.dataset.slChartMode;app.querySelector(".sl-chart-room")?.remove()}
app.addEventListener("click",event=>{
 const tab=event.target.closest?.(".tabs button");
 const name=roomTitle();
 if(!tab||!name||!app.contains(tab))return;
 roomName=name;chartSelected=isTop(tab)||tab.dataset.slChartTop==="true";
 if(!chartSelected)clearRoomChart();
 // The native handler still runs, so its existing active-state styling and
 // navigation remain authoritative. Mount after that handler redraws the room.
 schedule();
},true);
function mount(){
 const active=document.querySelector(".bottom button.active");const genreList=app.querySelector(".signature-genres");if(genreList&&!genreList.querySelector(".sl-chart-directory"))genreList.prepend(directory());else if(active?.dataset.navLabel==="Genres"&&!app.querySelector(".roomhead")&&!app.querySelector(".sl-chart-directory"))app.prepend(directory());
 const explore=app.querySelector(".sl-d-explore");if(explore&&!explore.querySelector(".sl-chart-directory"))explore.append(directory());
 const name=roomTitle();
 if(!name){roomName="";chartSelected=null;clearRoomChart();return}
 if(roomName!==name){roomName=name;chartSelected=null;clearRoomChart()}
 const tabs=app.querySelector(".tabs");
 if(!tabs){clearRoomChart();return}
 const buttons=Array.from(tabs.querySelectorAll("button"));
 const top=buttons.find(b=>b.dataset.slChartTop==="true"||isTop(b)),discover=buttons.find(isDiscover);
 if(!top){clearRoomChart();return}
 top.dataset.slChartTop="true";
 if(tabName(top)!=="Top 10")top.textContent="Top 10";
 if(discover&&discover.parentElement===top.parentElement&&discover.nextElementSibling!==top)discover.after(top);
 // On first entry use the native selected tab. Subsequent user choices are
 // captured above and survive native DOM rebuilds without duplicating panels.
 if(chartSelected===null)chartSelected=selected(top)&&!buttons.some(b=>b!==top&&selected(b));
 if(!chartSelected){clearRoomChart();return}
 app.dataset.slChartMode="top";
 const previous=app.querySelector(".sl-chart-room");
 if(previous?.dataset.chartGenre===name&&previous.previousElementSibling===tabs)return;
 previous?.remove();
 const panel=make("div","sl-chart-room sl-chart-inline");panel.dataset.chartGenre=name;
 panel.setAttribute("aria-label",name+" Top 10");
 const template=app.querySelector(".tracks:not(.sl-chart-native-list)");
 panel.append(chartPanel(name,template));tabs.after(panel);
}

let pending=false;const schedule=()=>{if(!pending){pending=true;requestAnimationFrame(()=>{pending=false;mount()})}};
new MutationObserver(schedule).observe(app,{childList:true,subtree:true});schedule()
})()
