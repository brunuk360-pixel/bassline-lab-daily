(()=>{
"use strict";
const D=window.__slDiscovery;
if(!D?.items?.length)return;
const app=document.getElementById("app");if(!app)return;
const records=D.items.map(([id,title,artist,date,genre,tag,url,note])=>({id,title,artist,date,genre,tag,url,note,art:D.artwork?.[id]||"",artSource:D.artworkSources?.[id]||""}));
const byId=id=>records.find(r=>r.id===id);
const modes=[
["daily","The Daily Dig","Ten selections, one new route into music.","genres.jpg"],
["artists","Artist DNA","Career stories, records and collaborators.","underground.jpg"],
["samples","Sample Detective","Trace the sounds behind the records.","warehouse.jpg"],
["history","On This Day","Release anniversaries and a music timeline.","afterhours.jpg"],
["early","Before They Were Famous","Explore earlier releases and new catalogue names.","genres.jpg"],
["gems","Hidden Gems","Dig deeper into independent catalogues.","late-drive.jpg"],
["journey","My Music Journey","Your own record shelf and listening trail.","underground.jpg"]
];
const labels=Object.fromEntries(modes.map(m=>[m[0],m[1]]));
const labelsData=[["Hospital Records","https://hospitalrecords.bandcamp.com/",["allnight","movearound","memory","everlasting","together","ultra","hoax","between","apex"]],["XL Recordings","https://xlrecordings.bandcamp.com/",["fire","original"]],["Galacy","https://galacy.bandcamp.com/",["edlan"]]];
const create=(tag,cls,txt)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(txt!=null)n.textContent=txt;return n};
function button(txt,fn,cls="sl-d-button"){const b=create("button",cls,txt);b.type="button";b.addEventListener("click",fn);return b}
function link(txt,url,cls="sl-d-button"){const a=create("a",cls,txt);a.href=url;a.target="_blank";a.rel="noopener noreferrer";return a}
const search=q=>"https://open.spotify.com/search/"+encodeURIComponent(q);
const storeKey="sublevel.discovery.journey.v1";
let state={saved:[],history:[],artists:[],labels:[]},persistent=true;
try{const raw=JSON.parse(localStorage.getItem(storeKey)||"null");if(raw)for(const k of Object.keys(state))if(Array.isArray(raw[k]))state[k]=raw[k]}catch{persistent=false}
function persist(){try{localStorage.setItem(storeKey,JSON.stringify(state))}catch{persistent=false}}
let dialog,content,heading,back,lastFocus,stack=[],current,queue=[],position=0,notice;
function announce(txt){if(notice)notice.textContent=txt}
function remember(id){state.history=[id,...state.history.filter(x=>x!==id)].slice(0,100);persist()}
function toggle(id,key="saved"){const a=state[key];const on=a.includes(id);state[key]=on?a.filter(x=>x!==id):[id,...a];persist();announce(on?"Removed from your collection":"Saved to your collection");return !on}
function saveButton(id,key="saved",label="Save"){const saved=state[key].includes(id);const b=button(saved?"✓ Saved":label,()=>{const on=toggle(id,key);b.textContent=on?"✓ Saved":label;b.setAttribute("aria-pressed",String(on));if(current?.mode==="journey")render("journey")});b.setAttribute("aria-pressed",String(saved));return b}
function artwork(r){
 const empty=()=>{const tile=create("div","sl-d-art sl-d-art-missing");tile.append(create("span",null,"SUBLEVEL / RELEASE"),create("small",null,r.genre),create("span","sl-d-art-note","Cover not available"));return tile};
 if(!r.art)return empty();
 const img=create("img","sl-d-art");img.src=r.art;img.alt=r.title+" release artwork";img.loading="lazy";img.decoding="async";img.referrerPolicy="no-referrer";
 img.addEventListener("error",()=>img.replaceWith(empty()),{once:true});return img
}
function profileArtwork(p){
 const known=p[3].map(byId).filter(r=>r?.art);
 if(!known.length)return null;
 const f=create("figure","sl-d-artist-art");f.append(artwork(known[0]));
 const caption=create("figcaption",null,"Release artwork · "+known[0].title);
 if(known[0].artSource){caption.append(" · ",link("Source ↗",known[0].artSource,"sl-d-photo-credit"))}
 f.append(caption);return f
}
function record(r,list){const a=create("article","sl-d-record");if(r.art){const cover=artwork(r);a.append(cover);cover.addEventListener("error",()=>{a.querySelector(".sl-d-art-missing")?.remove();a.classList.add("sl-d-no-art")},{once:true})}else a.classList.add("sl-d-no-art");const copy=create("div","sl-d-copy");copy.append(create("span","sl-d-kicker",r.tag+(window.SUBLEVELResearch?.has(r.title,r.artist)?" / Track dossier":"")),create("h3",null,r.title),create("p","sl-d-muted",r.artist+" · "+r.genre+(r.date?" · "+r.date:"")),create("p",null,r.note));const actions=create("div","sl-d-actions");actions.append(button("Listen / details →",()=>startListening(r.id,list)),saveButton(r.id));copy.append(actions);a.append(copy);return a}
function listRecords(list){const g=create("div","sl-d-list");list.filter(Boolean).forEach(r=>g.append(record(r,list)));return g}

function catalogue(list){
 const wrap=create("section","sl-d-catalogue");
 const controls=create("div","sl-d-filters");
 const input=create("input","sl-d-search");input.type="search";input.placeholder="Search tracks, artists, genres…";input.setAttribute("aria-label","Search discovery catalogue");
 const select=create("select","sl-d-select");select.setAttribute("aria-label","Filter by genre");
 ["All genres",...new Set(list.map(r=>r.genre))].forEach(g=>{const o=create("option",null,g);o.value=g;select.append(o)});
 const sort=create("select","sl-d-select");sort.setAttribute("aria-label","Sort records");
 [["curated","Curated order"],["newest","Newest dated first"],["artist","Artist A–Z"],["title","Track A–Z"]].forEach(([v,t])=>{const o=create("option",null,t);o.value=v;sort.append(o)});
 const count=create("p","sl-d-muted");count.setAttribute("aria-live","polite");const results=create("div","sl-d-results");
 function draw(){
  const q=input.value.toLowerCase().trim();
  let filtered=list.filter(r=>(select.value==="All genres"||r.genre===select.value)&&(!q||[r.title,r.artist,r.genre,r.tag,r.note].join(" ").toLowerCase().includes(q)));
  if(sort.value==="newest")filtered.sort((a,b)=>(b.date||"").localeCompare(a.date||""));
  if(sort.value==="artist"||sort.value==="title")filtered.sort((a,b)=>a[sort.value].localeCompare(b[sort.value]));
  count.textContent=filtered.length+" of "+list.length+" releases";
  results.replaceChildren(filtered.length?listRecords(filtered):create("p","sl-d-muted","No matches. Try another search or genre."));
 }
 input.addEventListener("input",draw);select.addEventListener("change",draw);sort.addEventListener("change",draw);
 controls.append(input,select,sort);wrap.append(controls,count,results);draw();return wrap;
}

function titleBlock(kicker,title,description){const top=create("header","sl-d-intro");top.append(create("span","sl-d-kicker",kicker),create("h1",null,title),create("p",null,description));content.append(top)}
function section(title){content.append(create("h2","sl-d-section",title))}
function dayKey(d){return new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/London",year:"numeric",month:"2-digit",day:"2-digit"}).format(d)}
function editionDate(){
 const parts=new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/London",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
 const v=t=>parts.find(p=>p.type===t).value;return v("year")+"-"+v("month")+"-"+v("day");
}
function recentReleases(){
 const today=editionDate(),cutoff=new Date(Date.parse(today+"T00:00:00Z")-7*86400000).toISOString().slice(0,10);
 return records.filter(r=>/^\d{4}-\d{2}-\d{2}$/.test(r.date)&&r.date>=cutoff&&r.date<=today&&["New release","Reissue"].includes(r.tag)).sort((a,b)=>b.date.localeCompare(a.date));
}
function daily(){
 const key=editionDate(),seed=Date.parse(key+"T00:00:00Z")/86400000;
 const shuffled=xs=>xs.map((r,i)=>({r,score:Math.sin((seed+13)*(i+19)*.9187)*10000%1})).sort((a,b)=>a.score-b.score).map(x=>x.r);
 const fresh=recentReleases(),picks=[],seen=new Set();
 const broad=g=>/drum|d&b|jungle/i.test(g)?"Bass & jungle":/garage/i.test(g)?"Garage":/techno/i.test(g)?"Techno":/house/i.test(g)?"House":/ambient/i.test(g)?"Ambient":g;
 for(const r of shuffled(fresh)){const g=broad(r.genre);if(!seen.has(g)){picks.push(r);seen.add(g)}if(picks.length>=7)break}
 for(const r of fresh){if(picks.length>=7)break;if(!picks.includes(r))picks.push(r)}
 for(const r of shuffled(records.filter(r=>!fresh.includes(r)))){if(picks.length>=10)break;if(!picks.includes(r))picks.push(r)}
 for(const r of fresh){if(picks.length>=10)break;if(!picks.includes(r))picks.push(r)}
 return picks.slice(0,10);
}
function graph(profile){
 const ids=profile[3],rlist=ids.map(byId).filter(Boolean);
 const box=create("div","sl-d-graph");const center=create("div","sl-d-node sl-d-center",profile[0]);box.append(center);
 rlist.forEach(r=>{const b=button(r.title,()=>startListening(r.id,rlist),"sl-d-node");b.append(create("small",null,r.tag));box.append(b)});
 return box
}

const connections=(D.connections||[]).filter(c=>byId(c.from)&&byId(c.to));
function connectionPanel(id,filter="All"){
 const edges=connections.filter(c=>(c.from===id||c.to===id)&&(filter==="All"||c.type===filter));
 const panel=create("div","sl-d-connected");
 const base=byId(id);if(!base||!edges.length)return panel;
 const central=create("div","sl-d-connection-center");central.append(artwork(base),create("strong",null,base.title),create("small",null,base.artist));panel.append(central);
 const list=create("div","sl-d-edge-list");
 for(const edge of edges){
  const other=byId(edge.from===id?edge.to:edge.from);
  const row=create("article","sl-d-edge");const kind=edge.type==="Sample"?(edge.from===id?"Sample source":"Sampled by"):(edge.from===id?"Remix":"Original recording");
  row.append(create("span","sl-d-kicker",kind));const info=create("div","sl-d-edge-copy");info.append(artwork(other));const txt=create("div");txt.append(create("strong",null,other.title),create("small",null,other.artist),create("p",null,edge.note));info.append(txt);row.append(info);
  const actions=create("div","sl-d-actions");actions.append(button("Listen / details →",()=>startListening(other.id,[base,other])),link("Evidence ↗",edge.source),saveButton(other.id));row.append(actions);list.append(row);
 }
 panel.append(list);return panel;
}
function shelf(list){
 const grid=create("div","sl-d-shelf");for(const r of list){const cell=create("article","sl-d-shelf-cell");const b=button("",()=>startListening(r.id,list),"sl-d-shelf-open");b.append(artwork(r),create("strong",null,r.title),create("small",null,r.artist));cell.append(b,saveButton(r.id));grid.append(cell)}return grid
}
function collectionStats(){
 const list=state.saved.map(byId).filter(Boolean),box=create("div","sl-d-stats");
 for(const [n,t] of [[list.length,"Saved releases"],[new Set(list.map(r=>r.genre)).size,"Genres"],[state.artists.length,"Artists followed"],[state.labels.length,"Labels followed"]]){const card=create("div");card.append(create("strong",null,String(n)),create("small",null,t));box.append(card)}
 const groups={};list.forEach(r=>groups[r.genre]=(groups[r.genre]||0)+1);
 const chart=create("div","sl-d-taste");
 for(const [genre,n] of Object.entries(groups).sort((a,b)=>b[1]-a[1]).slice(0,6)){const row=create("div","sl-d-taste-row");row.append(create("span",null,genre),create("small",null,String(n)));const line=create("div","sl-d-taste-track");const bar=create("div");bar.style.width=(n/list.length*100)+"%";line.append(bar);row.append(line);chart.append(row)}
 const section=create("section");section.append(box);if(list.length)section.append(create("h2","sl-d-section","Your saved genres"),chart);return section;
}

function render(mode,arg){
 current={mode,arg};dialog.dataset.room=mode;if(notice)notice.textContent="";content.replaceChildren();heading.textContent=labels[mode]||({artist:"Artist DNA",listen:"Listening room",graph:"Connections",hub:"Discover more",label:"Label catalogue"}[mode]||"SUBLEVEL");back.textContent=stack.length?"← Back":"← Close";dialog.scrollTop=0;
 if(mode==="hub"){
 titleBlock("SUBLEVEL / DISCOVERY","Go deeper.","Explore beyond the charts, or search the entire curated catalogue.");
 const grid=create("div","sl-d-hub");const usedPhotos=new Set();modes.forEach(([id,name,desc,img])=>{
 const b=button("",()=>show(id),"sl-d-tile");const heroIds={daily:daily().find(r=>r.art)?.id||"edlan",artists:"allnight",samples:"fire",history:"nookie",early:"spiders",gems:"posij",journey:"photek"};
 const cover=byId(heroIds[id]);const src=cover?.art||"section-art/"+img;
 if(src&&!usedPhotos.has(src)){
  usedPhotos.add(src);const photo=create("img",cover?.art?"sl-d-tile-cover":"sl-d-tile-photo");photo.src=src;photo.alt=cover?.art?cover.title+" release artwork":"";photo.loading="lazy";photo.decoding="async";photo.addEventListener("error",()=>{photo.remove();b.classList.add("sl-d-tile-text")},{once:true});b.append(photo);
 }else b.classList.add("sl-d-tile-text");
 b.append(create("strong",null,name),create("small",null,desc));grid.append(b)
});content.append(grid);section("Browse the catalogue");content.append(catalogue(records));
 }else if(mode==="daily"){
 titleBlock("DAILY SELECTION / "+new Date().toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric",timeZone:"Europe/London"}),"The Daily Dig","A daily selection of recently released records and catalogue discoveries, with links to the original sources.");const list=daily();const feed=create("div","sl-d-feed-status");feed.append(create("strong",null,recentReleases().length+" releases from the last 7 days"),create("small",null,"Editorial catalogue last updated "+D.edition+" · dates from linked release pages"));content.append(feed,button("Start listening →",()=>startListening(list[0].id,list),"sl-d-button sl-d-primary"),listRecords(list));section("New release archive");content.append(catalogue(records.filter(r=>["New release","Reissue"].includes(r.tag)).sort((a,b)=>b.date.localeCompare(a.date))));
 }else if(mode==="artists"){
 titleBlock("ARTIST ARCHIVE","Artist DNA","Discover the stories and connections behind the records.");D.profiles.forEach(p=>{const a=create("article","sl-d-profile");const art=profileArtwork(p);if(art){a.classList.add("sl-d-profile-with-art");a.append(art)}const copy=create("div","sl-d-profile-copy");const b=button(p[0],()=>show("artist",p[0]),"sl-d-profile-title");copy.append(b,create("p","sl-d-muted",p[1]),create("p",null,p[2]),button("Explore artist →",()=>show("artist",p[0])));a.append(copy);content.append(a)});
 }else if(mode==="artist"){
 const p=D.profiles.find(x=>x[0]===arg);if(!p){show("artists",null,true);return}
 titleBlock("ARTIST DNA",p[0],p[2]);const art=profileArtwork(p);if(art)content.append(art);const actions=create("div","sl-d-actions");actions.append(saveButton(p[0],"artists","Follow artist"),link("Source / artist background ↗",p[4]),link("Artist catalogue ↗",search(p[0])));content.append(actions);const research=D.research?.[p[0]];if(research){section("Career timeline");const t=create("div","sl-d-timeline");for(const [year,story] of research.timeline||[]){const row=create("article","sl-d-event");row.append(create("time",null,year),create("p",null,story));t.append(row)}content.append(t);if(research.listen){section("Listening guide");content.append(create("p",null,research.listen))}if(research.links?.length){const refs=create("div","sl-d-actions");for(const [name,url] of research.links)refs.append(link(name+" ↗",url));content.append(refs)}}section("Music connections");content.append(graph(p));const linked=p[3].filter(id=>connections.some(c=>c.from===id));if(linked.length){const group=create("div","sl-d-actions");linked.forEach(id=>group.append(button(byId(id).title+" — connections →",()=>show("samples",id))));content.append(group)}section("Essential and connected listening");content.append(listRecords(p[3].map(byId).filter(Boolean)));
 }else if(mode==="samples"){
 titleBlock("SAMPLE DETECTIVE","Trace the sound.","Follow documented samples and remixes between rock, hip hop, rave and drum & bass. Each connection links to its evidence.");
 const roots=[...new Set(connections.map(c=>c.from))].map(byId).filter(Boolean);
 const controls=create("div","sl-d-filters");const pick=create("select","sl-d-select");pick.setAttribute("aria-label","Choose a recording");
 roots.forEach(r=>{const o=create("option",null,r.title);o.value=r.id;pick.append(o)});
 const type=create("select","sl-d-select");type.setAttribute("aria-label","Relationship type");["All","Sample","Remix"].forEach(t=>{const o=create("option",null,t==="All"?"All connections":t==="Sample"?"Samples":"Remixes");o.value=t;type.append(o)});
 const result=create("div");function draw(){result.replaceChildren(connectionPanel(pick.value,type.value));if(!result.querySelector(".sl-d-edge"))result.append(create("p","sl-d-muted","No documented connections of this type for this recording."))}
 if(roots.some(r=>r.id===arg))pick.value=arg;
 controls.append(pick,type);content.append(controls,result);pick.addEventListener("change",draw);type.addEventListener("change",draw);draw();
 }else if(mode==="history"){
 titleBlock("SUBLEVEL / ARCHIVE","On This Day","A source-dated music history timeline. Only documented dates appear as anniversaries.");
 const now=new Date(),parts=new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/London",month:"2-digit",day:"2-digit"}).formatToParts(now),md=parts.find(x=>x.type==="month").value+"-"+parts.find(x=>x.type==="day").value;
 const anniversaries=D.events.filter(e=>e[0].slice(5)===md);
 section("Today's release anniversaries");
 function event(e){const [date,name,id,url]=e;const r=byId(id);const a=create("article","sl-d-event");a.append(create("time",null,date),create("h3",null,name));if(r)a.append(create("p","sl-d-muted",r.artist));const href=url||r?.url;if(href)a.append(link("Source / listen ↗",href));return a}
 if(anniversaries.length)anniversaries.forEach(e=>content.append(event(e)));else content.append(create("p","sl-d-muted","No verified anniversaries for this date in the current archive."));
 section("Explore the timeline");const controls=create("div","sl-d-actions");const select=create("select","sl-d-select");select.setAttribute("aria-label","Filter timeline by decade");["All decades","1990s","2000s","2010s","2020s"].forEach(s=>{const o=create("option",null,s);o.value=s;select.append(o)});controls.append(select);content.append(controls);const timeline=create("div","sl-d-timeline");content.append(timeline);
 function draw(){timeline.replaceChildren();const filtered=D.events.filter(e=>select.value==="All decades"||e[0].startsWith(select.value.slice(0,3))).sort((a,b)=>a[0].localeCompare(b[0]));filtered.forEach(e=>timeline.append(event(e)));if(!filtered.length)timeline.append(create("p","sl-d-muted","No dated entries in this decade yet."))}
 select.addEventListener("change",draw);draw();
 }else if(mode==="early"){
 titleBlock("EARLY CATALOGUES","Before They Were Famous","Explore early catalogue appearances and artists introduced by independent labels. These are not claims about an artist's current popularity.");
 const p=D.profiles[0];content.append(create("h2","sl-d-section","Camo & Krooked — early Hospital years"),create("p",null,"Hospital's Sick Music 2 compilation included a label debut by Camo & Krooked in 2010."),link("Explore Sick Music 2 ↗","https://www.hospitalrecords.com/products/various-artists-sick-music-2"),record(byId("between"),[byId("between"),byId("allnight")]));
 section("Independent catalogue introductions");content.append(listRecords([byId("spiders"),byId("cnc"),byId("owl")]));
 }else if(mode==="gems"){
 titleBlock("DEEP CUTS / INDEPENDENT MUSIC","Hidden Gems","A handpicked shelf of less obvious selections across bass music, jungle and beyond.");content.append(catalogue(records.filter(r=>r.tag==="Deep cut")));
 }else if(mode==="journey"){
 titleBlock("YOUR PERSONAL LIBRARY","My Music Journey","A collection stored on this browser. Listening history records opened listening-room entries, not verified streaming playback.");
 const controls=create("div","sl-d-actions");controls.append(button("Export collection",()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=create("a");a.href=url;a.download="sublevel-collection.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}));
const file=create("input");file.type="file";file.accept=".json,application/json";file.hidden=true;
file.addEventListener("change",async()=>{try{
 const selected=file.files?.[0];if(!selected)return;if(selected.size>1000000)throw Error("File too large");
 const incoming=JSON.parse(await selected.text());
 if(!incoming||typeof incoming!=="object"||!Array.isArray(incoming.saved))throw Error("Not a SUBLEVEL collection");
 const valid={saved:records.map(r=>r.id),history:records.map(r=>r.id),artists:D.profiles.map(p=>p[0]),labels:labelsData.map(l=>l[0])};
 for(const k of Object.keys(valid)){if(Array.isArray(incoming[k]))state[k]=[...new Set([...state[k],...incoming[k].filter(v=>typeof v==="string"&&valid[k].includes(v))])].slice(0,100)}
 persist();render("journey");announce("Collection merged successfully");
 }catch{announce("Could not import this collection. Choose a valid SUBLEVEL JSON export.")}});
 controls.append(button("Import collection",()=>file.click()),file);

 content.append(controls);
 if(!persistent)content.append(create("p","sl-d-muted","Browser storage unavailable; changes last only for this session."));
 content.append(collectionStats());section("Saved records ("+state.saved.length+")");const saved=state.saved.map(byId).filter(Boolean);if(saved.length){const views=create("div","sl-d-actions"),area=create("div");views.append(button("Record shelf",()=>area.replaceChildren(shelf(saved))),button("Search / list",()=>area.replaceChildren(catalogue(saved))));content.append(views,area);area.append(shelf(saved))}else content.append(create("p","sl-d-muted","Save a record from any discovery feature to start your shelf."),button("Explore the Daily Dig",()=>show("daily")));
 section("Followed artists");state.artists.forEach(name=>content.append(button(name+" →",()=>show("artist",name))));if(!state.artists.length)content.append(create("p","sl-d-muted","Follow artists from Artist DNA."));
 section("Record labels");labelsData.forEach(([name,url,ids])=>{const row=create("article","sl-d-profile");row.append(create("h3",null,name));const actions=create("div","sl-d-actions");actions.append(saveButton(name,"labels","Follow label"),button("Browse catalogue →",()=>show("label",name)),link("Official catalogue ↗",url));row.append(actions);content.append(row)});
 section("Recently explored");const history=state.history.map(byId).filter(Boolean);if(history.length)content.append(listRecords(history.slice(0,12)));else content.append(create("p","sl-d-muted","Your listening-room visits will appear here."));
 }else if(mode==="label"){
 const label=labelsData.find(l=>l[0]===arg);if(!label)return;titleBlock("LABEL ARCHIVE",label[0],"Explore selections from this label’s catalogue.");const actions=create("div","sl-d-actions");actions.append(saveButton(label[0],"labels","Follow label"),link("Official catalogue ↗",label[1]));content.append(actions,listRecords(label[2].map(byId).filter(Boolean)));
 }else if(mode==="listen"){
 const r=byId(arg);if(!r)return;remember(r.id);
 const hero=create("div","sl-d-listen-art");hero.append(artwork(r));content.append(hero);if(r.artSource)content.append(link("Artwork source ↗",r.artSource,"sl-d-art-credit"));
 titleBlock("LISTENING ROOM / "+r.tag,r.title,r.artist+" · "+r.genre+(r.date?" · "+r.date:""));content.append(create("p",null,r.note));
 const actions=create("div","sl-d-actions");actions.append(link(r.url.includes("bandcamp")?"Listen on Bandcamp ↗":"Open release / source ↗",r.url,"sl-d-button sl-d-primary"),link("Find on Spotify ↗",search(r.artist+" "+r.title)),saveButton(r.id));content.append(actions);
 content.append(create("p","sl-d-muted","Playback opens on the selected music service. No automatic audio playback is started here."));
 if(queue.length>1){const pager=create("div","sl-d-pager");const prev=button("← Previous",()=>move(-1)),next=button("Next →",()=>move(1));prev.disabled=position<=0;next.disabled=position>=queue.length-1;pager.append(prev,create("span",null,(position+1)+" / "+queue.length),next);content.append(pager)}
 const dossier=window.SUBLEVELResearch?.panel(r.title,r.artist,false);if(dossier)content.append(dossier);
 const edges=connections.filter(c=>c.from===r.id||c.to===r.id);if(edges.length){section("Sample & remix connections");content.append(connectionPanel(r.id))}const profiles=D.profiles.filter(p=>p[3].includes(r.id));if(profiles.length){section("Artist DNA");for(const profile of profiles)content.append(button(profile[0]+" →",()=>show("artist",profile[0])))}
 const related=records.filter(x=>x.id!==r.id&&x.genre===r.genre).slice(0,3);if(related.length){section("More to discover");content.append(listRecords(related))}
 }
 content.append(create("footer","sl-d-footer","SUBLEVEL / INDEPENDENT MUSIC DISCOVERY"));
}
function startListening(id,list){if(current)stack.push({...current,queue:[...queue],position,scroll:dialog.scrollTop});queue=list.filter(Boolean).map(r=>r.id);position=queue.indexOf(id);if(position<0){queue=[id];position=0}render("listen",id)}
function move(delta){const p=position+delta;if(p<0||p>=queue.length)return;position=p;render("listen",queue[p])}
function show(mode,arg,replace=false){if(current&&!replace)stack.push({...current,queue:[...queue],position,scroll:dialog.scrollTop});render(mode,arg)}
function open(mode="hub"){if(!dialog){dialog=create("dialog","sl-discovery-dialog");if(typeof dialog.showModal!=="function")return;const bar=create("header","sl-d-bar");back=button("← Close",()=>{if(stack.length){const p=stack.pop();queue=p.queue||[];position=p.position||0;render(p.mode,p.arg);dialog.scrollTop=p.scroll||0}else dialog.close()},"sl-d-back");heading=create("strong",null,"Discover more");const close=button("×",()=>dialog.close(),"sl-d-close");close.setAttribute("aria-label","Close discovery");bar.append(back,heading,close);content=create("main","sl-d-content");notice=create("div","sl-d-notice");notice.setAttribute("role","status");dialog.append(bar,content,notice);document.body.append(dialog);dialog.addEventListener("close",()=>{document.body.classList.remove("sl-discovery-lock");stack=[];current=null;lastFocus?.focus?.({preventScroll:true})})}
 if(!dialog.open){lastFocus=document.activeElement;stack=[];current=null;document.body.classList.add("sl-discovery-lock");dialog.showModal()}show(mode)}
function mount(){const home=app.querySelector(".night-home"),explore=app.querySelector(".xgrid");if(home&&!home.querySelector(".sl-d-entry")){const b=button("",()=>open("daily"),"sl-d-entry");b.append(create("span","sl-d-kicker","SUBLEVEL / DAILY DISCOVERY"),create("strong",null,"The Daily Dig"),create("small",null,"10 records to explore today →"));const lead=home.querySelector(".stream-listen");if(lead)lead.after(b);else home.append(b)}
 if(explore&&!app.querySelector(".sl-d-explore")){
 const panel=create("section","sl-d-explore");
 panel.append(create("span","sl-d-kicker","SUBLEVEL / DISCOVERY ROOMS"),create("h2",null,"Go deeper"),create("p","sl-d-muted","Choose a destination, or browse the complete catalogue."));
 const shortcuts=create("div","sl-d-shortcuts");
 const icons={daily:"01",artists:"02",samples:"03",history:"04",early:"05",gems:"06",journey:"07"};
 modes.forEach(([id,name,desc])=>{
  const b=button("",()=>open(id),"sl-d-shortcut");const copy=create("span","sl-d-shortcut-copy");copy.append(create("strong",null,name),create("small",null,desc));b.append(create("span","sl-d-shortcut-num",icons[id]),copy,create("span","sl-d-shortcut-arrow","↗"));shortcuts.append(b);
 });
 panel.append(shortcuts,button("Browse complete catalogue →",()=>open(),"sl-d-button sl-d-primary"));explore.before(panel);
}
 const active=document.querySelector(".bottom button.active");const savedActive=active?.dataset.navLabel==="Saved"||active?.textContent.trim().startsWith("Saved");if(!savedActive)app.querySelector(".sl-d-journey-entry")?.remove();
 if(savedActive&&!app.querySelector(".sl-d-journey-entry")){const b=button("My Music Journey →",()=>open("journey"),"sl-d-button sl-d-journey-entry");app.prepend(b)}
 app.querySelectorAll(".editorial-detail").forEach(d=>{if(d.querySelector(".sl-d-track-link"))return;const h=d.querySelector(".sl-dossier-hero");if(!h)return;const t=h.querySelector(".sl-dossier-artist")?.textContent||"";const p=D.profiles.find(x=>t.toLowerCase().includes(x[0].toLowerCase()));if(p){const b=button("Artist DNA →",()=>{open("artists");show("artist",p[0])},"sl-d-button sl-d-track-link");h.after(b)}})
}
let pending=false;const schedule=()=>{if(!pending){pending=true;requestAnimationFrame(()=>{pending=false;mount()})}};new MutationObserver(schedule).observe(app,{childList:true,subtree:true});const nav=document.querySelector(".bottom");if(nav)new MutationObserver(schedule).observe(nav,{attributes:true,subtree:true,attributeFilter:["class"]});schedule();
})()
