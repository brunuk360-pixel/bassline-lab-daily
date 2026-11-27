(()=>{
"use strict";
const app=document.getElementById("app"),feed=window.__slCharts;if(!app||!feed)return;
const make=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n};
const norm=s=>(s||"").toLowerCase().replace(/[^a-z0-9]+/g,"");
const alias={"drumbass":"dnb","drumandbass":"dnb","dnb":"dnb","ukgarage":"ukgaragebassline","dance":"ukdance","nudisco":"nudiscoindiedance","progressivehouse":"melodicprogressivehouse","ambient":"ambientexperimental","hardcore":"harddancehardcoreneorave"};
const today=()=>new Intl.DateTimeFormat("sv-SE",{timeZone:"Europe/London",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const link=(text,url)=>{const a=make("a","sl-chart-link",text);a.href=url;a.target="_blank";a.rel="noopener noreferrer";return a};
function status(c,now=today()){if(c.status!=="verified")return "Archived snapshot — not confirmed current";if(c.through)return now>=c.from&&now<=c.through?"Current published chart period":"Past chart period";return c.checked===now?"Verified on "+c.checked:"Last verified "+c.checked+" · refresh needed"}
function roomFor(genre){return (feed.rooms||[]).find(r=>norm(r[0])===norm(genre))}
function sourceFor(genre){const room=roomFor(genre);if(room)return room[1]?feed.sources.find(s=>norm(s[0])===norm(room[1])):undefined;const key=norm(genre);return feed.sources.find(s=>norm(s[0])===key)||feed.sources.find(s=>norm(s[0])===(alias[key]||key)||s[2]===(alias[key]||key))}
function chartPanel(genre){
 const source=sourceFor(genre);const chart=source&&feed.charts.find(c=>c.id===source[2]);
 const panel=make("section","sl-chart-panel");
 panel.dataset.chartGenre=genre;panel.append(make("span","sl-chart-kicker","SUBLEVEL / CHART DESK"),make("h2",null,chart?chart.genre+" — Top 10":genre+" — chart sources"));
 const room=roomFor(genre);if(room?.[2])panel.append(make("p","sl-chart-meta",room[2]));
 if(chart){
 panel.append(make("p","sl-chart-status",status(chart)),make("p","sl-chart-meta",chart.source+" · "+(chart.from?chart.from+" to "+chart.through:"Checked "+chart.checked)));
 if(chart.note)panel.append(make("p","sl-chart-meta",chart.note));
 const list=make("ol","sl-chart-list");for(const r of chart.rows){
 const row=make("li","sl-chart-row");row.append(make("span","sl-chart-rank",String(r.rank).padStart(2,"0")));
 if(r.art){const img=make("img","sl-chart-cover");img.src=r.art;img.alt="";img.loading="lazy";img.addEventListener("error",()=>img.remove(),{once:true});row.append(img)}
 const copy=make("div","sl-chart-copy");copy.append(make("strong",null,r.title),make("small",null,r.artist));row.append(copy,link(r.url?"Listen / release ↗":"Find music ↗",r.url||"https://music.youtube.com/search?q="+encodeURIComponent(r.artist+" "+r.title)));list.append(row)}
 panel.append(list)
 }else panel.append(make("p","sl-chart-meta",source?"A full verified Top 10 is not available in this edition. Check the live source rather than relying on an incomplete ranking.":"No verified dedicated chart has been linked for this genre. Editorial recommendations below are not current rankings."));
 if(source)panel.append(link("View latest source chart ↗",source[1]));
 return panel
}
function directory(){const panel=make("details","sl-chart-directory");panel.append(make("summary","sl-chart-summary","Current charts · choose genre"));panel.append(make("p","sl-chart-meta","Published retailer or national rankings, separate from editorial picks. "+feed.charts.filter(c=>status(c).startsWith("Verified on")||status(c)==="Current published chart period").length+" current dated lists; other sources and archives remain clearly identified."));
 const select=make("select","sl-chart-select");select.setAttribute("aria-label","Chart genre");
 const rooms=(feed.rooms||[]).map(r=>r[0]);const names=[...rooms,...feed.sources.map(s=>s[0]).filter(n=>!rooms.some(r=>norm(r)===norm(n)))];for(const name of names){const o=make("option",null,name);o.value=name;select.append(o)}select.value=rooms[0]||"UK Dance";
 const area=make("div","sl-chart-area");const draw=()=>area.replaceChildren(chartPanel(select.value));select.addEventListener("change",draw);panel.append(select,area);draw();return panel}
function mount(){
 const active=document.querySelector(".bottom button.active");const genreList=app.querySelector(".signature-genres");if(genreList&&!genreList.querySelector(".sl-chart-directory"))genreList.prepend(directory());else if(active?.dataset.navLabel==="Genres"&&!app.querySelector(".roomhead")&&!app.querySelector(".sl-chart-directory"))app.prepend(directory());
 const explore=app.querySelector(".sl-d-explore");if(explore&&!explore.querySelector(".sl-chart-directory"))explore.append(directory());
 const room=app.querySelector(".roomhead");if(!room)return;
 const name=room.querySelector(".roomcopy h1")?.textContent.trim()||room.querySelector("h1")?.textContent.trim();if(!name)return;
 // Only retitle the existing chart tab, leaving its track controls and saved IDs intact.
 const tabs=app.querySelector(".tabs");if(tabs){
 for(const b of tabs.querySelectorAll("button")){if(/^(top\s*10|top ten)$/i.test(b.textContent.trim())){b.textContent="Archive picks";b.dataset.slArchive="true"}}
 }
 const previous=app.querySelector(".sl-chart-room");if(previous?.dataset.chartGenre===name&&previous.previousElementSibling===room)return;
 previous?.remove();const panel=make("details","sl-chart-room");panel.dataset.chartGenre=name;panel.append(make("summary","sl-chart-summary","Current chart / source →"),chartPanel(name));room.after(panel);
}
let pending=false;const schedule=()=>{if(!pending){pending=true;requestAnimationFrame(()=>{pending=false;mount()})}};
new MutationObserver(schedule).observe(app,{childList:true,subtree:true});schedule()
})()
