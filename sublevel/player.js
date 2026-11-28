/* Official providers only. No audio extraction or simulated playback. */
(function(root){
"use strict";
function urlOf(value){try{const u=new URL(value);return u.protocol==="https:"&&!u.username&&!u.password&&!u.port?u:null}catch{return null}}
function fromURL(value){
 const u=urlOf(value);if(!u)return null;const h=u.hostname,p=u.pathname.replace(/\/$/,"");
 if(["soundcloud.com","www.soundcloud.com"].includes(h)&&/^\/[\w.-]+\/[\w.-]+$/.test(p))return {provider:"soundcloud",source:u.origin+p};
 if(["youtube.com","www.youtube.com","music.youtube.com","youtu.be"].includes(h)){
  const ids=u.searchParams.getAll("v");
  const id=h==="youtu.be"&&ids.length===0?p.slice(1):h!=="youtu.be"&&p==="/watch"&&ids.length===1?ids[0]:"";
  if(/^[A-Za-z0-9_-]{11}$/.test(id||""))return {provider:"youtube",id,source:"https://www.youtube.com/watch?v="+id};
 }
 if(h==="music.apple.com"){
  const m=p.match(/^\/[a-z]{2}\/album\/[A-Za-z0-9%._~-]+\/([1-9][0-9]{0,19})$/);
  const ids=u.searchParams.getAll("i"),track=ids[0];
  if(m&&!u.hash&&ids.length<=1&&(!ids.length||/^[1-9][0-9]{0,19}$/.test(track)))return {provider:"apple",kind:track?"track":"album",id:track||m[1],source:u.origin+p+(track?"?i="+track:"")};
 }
 if(h==="open.spotify.com"){const m=p.match(/^\/(track|album|playlist)\/([A-Za-z0-9]{22})$/);if(m)return {provider:"spotify",kind:m[1],id:m[2],source:u.origin+p}}
 return null
}
function frame(e){
 if(!e)return null;
 if(e.provider==="soundcloud"){const sc=fromURL(e.source);if(sc?.provider==="soundcloud")return {src:"https://w.soundcloud.com/player/?url="+encodeURIComponent(sc.source)+"&auto_play=false&visual=false",height:166,name:"SoundCloud"}}
 if(e.provider==="youtube"&&/^[A-Za-z0-9_-]{11}$/.test(e.id||""))return {src:"https://www.youtube-nocookie.com/embed/"+e.id+"?playsinline=1",height:210,name:"YouTube"};
 if(e.provider==="spotify"&&/^(track|album|playlist)$/.test(e.kind||"")&&/^[A-Za-z0-9]{22}$/.test(e.id||""))return {src:"https://open.spotify.com/embed/"+e.kind+"/"+e.id,height:e.kind==="track"?152:352,name:"Spotify"};
 if(e.provider==="apple"){
  const a=fromURL(e.source);
  if(a?.provider==="apple"&&a.kind===e.kind&&a.id===e.id)return {src:a.source.replace("https://music.apple.com/","https://embed.music.apple.com/"),height:a.kind==="track"?175:450,name:"Apple Music"};
 }
 if(e.provider==="bandcamp"&&/^(album|track)$/.test(e.kind||"")&&/^\d{1,12}$/.test(e.id||""))return {src:"https://bandcamp.com/EmbeddedPlayer/"+e.kind+"="+e.id+"/size=large/bgcol=101b1c/linkcol=79c9b7/tracklist=false/artwork=small/transparent=true/",height:120,name:"Bandcamp"};
 return null
}
function clean(items){const seen=new Set();return (Array.isArray(items)?items:[]).filter(r=>r&&typeof r.id==="string"&&typeof r.title==="string"&&typeof r.artist==="string"&&urlOf(r.url)&&!seen.has(r.id)&&seen.add(r.id)).slice(0,200)}
function editQueue(list,currentIndex,target,operation){
 const items=clean(list),current=items[currentIndex];
 const i=items.findIndex(r=>r.id===target);
 if(i<0||!current||i===currentIndex)return {items,index:currentIndex};
 if(operation==="remove")items.splice(i,1);
 else if(operation==="up"||operation==="down"){
  const j=i+(operation==="up"?-1:1);
  if(j>=0&&j<items.length&&j!==currentIndex)[items[i],items[j]]=[items[j],items[i]];
 }
 return {items,index:items.findIndex(r=>r.id===current.id)}
}
function playerChoices(r,reviewed){
 const choices=[reviewed,fromURL(r?.embedUrl),fromURL(r?.alternateEmbedUrl),r?.embedSpec?.provider==="bandcamp"&&/^https:\/\/[a-z0-9-]+\.bandcamp\.com\/track\/[\w.-]+\/?$/.test(r.embedSpec.source)&&r.embedSpec.kind==="track"?r.embedSpec:null,fromURL(r?.url)].filter(e=>e&&frame(e));
 const used=new Set();
 return choices.filter(e=>{const k=frame(e).src;if(used.has(k))return false;used.add(k);return true});
}
const api={fromURL,frame,clean,editQueue,playerChoices};
if(typeof module==="object"&&module.exports){module.exports=api;return}
if(!root.document)return;
const doc=root.document,embeds=root.__slEmbeds||{},data=root.__slDiscovery;
const records=(data?.items||[]).map(([id,title,artist,date,genre,tag,url])=>({id,title,artist,url,art:data.artwork?.[id]||""}));
const byId=id=>records.find(r=>r.id===id);
const make=(tag,cls,txt)=>{const n=doc.createElement(tag);if(cls)n.className=cls;if(txt!=null)n.textContent=txt;return n};
function button(txt,fn,cls="sl-p-button"){const b=make("button",cls,txt);b.type="button";b.addEventListener("click",fn);return b}
function choices(r){
 const direct=fromURL(r.url),v=data?.reviewedVideos?.[r.id];
 const video=v?.title===r.title&&v.artist===r.artist?fromURL(v.source):null;
 const entries=playerChoices({...r,url:direct?.kind==="album"||direct?.kind==="playlist"?"":r.url},embeds[r.id]);
 if(video?.provider!=="youtube"||!frame(video))return entries;
 return [video,...entries.filter(e=>frame(e).src!==frame(video).src)]
}
function source(r){return choices(r)[0]||null}
function available(r){return !!frame(source(r))}
let items=[],index=-1,panel,host,title,meta,previous,next,original,queueList,queueDetails,notice,compactButton,playableButton,providerButtons,providerLink,activeID=null,activeProvider=null,playableOnly=false,compact=false;
const key="sublevel.player.queue.v1";
function persist(){try{localStorage.setItem(key,JSON.stringify({items,index,playableOnly,compact}))}catch{}}
try{const saved=JSON.parse(localStorage.getItem(key)||"null");items=clean(saved?.items).map(r=>byId(r.id)||r);index=items.length?Math.max(0,Math.min(items.length-1,Number.isInteger(saved?.index)?saved.index:0)):-1;playableOnly=saved?.playableOnly===true||saved?.skipExternal===true;compact=saved?.compact===true}catch{}
function build(){
 if(panel)return;
 panel=make("section","sl-player");panel.hidden=true;panel.setAttribute("aria-label","SUBLEVEL music player");
 const head=make("div","sl-p-head"),copy=make("div","sl-p-copy");
 copy.append(make("span","sl-p-kicker","SUBLEVEL / LISTEN"),title=make("strong"),meta=make("small"));
 previous=button("‹",()=>step(-1));previous.setAttribute("aria-label","Previous selection");
 next=button("›",()=>step(1));next.setAttribute("aria-label","Next selection");
 const close=button("×",stop);close.setAttribute("aria-label","Stop and close player");
 compactButton=button("−",()=>{compact=!compact;applyCompact();persist()});head.append(copy,previous,next,compactButton,close);
 host=make("div","sl-p-frame");notice=make("p","sl-p-notice");notice.setAttribute("role","status");
 original=make("a","sl-p-link","Open original release ↗");original.target="_blank";original.rel="noopener noreferrer";
 queueDetails=make("details","sl-p-queue");queueDetails.open=false;playableButton=button("Skip external-only: off",()=>{playableOnly=!playableOnly;refreshControls();persist()});const options=make("div","sl-p-options");const shuffle=button("Shuffle upcoming",()=>{for(let i=items.length-1;i>index+1;i--){const j=index+1+Math.floor(Math.random()*(i-index));[items[i],items[j]]=[items[j],items[i]]}redrawQueue();refreshControls();persist()});options.append(shuffle,playableButton);queueDetails.append(make("summary",null,"Listening queue"),options,queueList=make("div","sl-p-list"));

 providerButtons=make("div","sl-p-providers");providerButtons.setAttribute("aria-label","Available music players");providerLink=make("a","sl-p-link sl-p-provider-link");providerLink.target="_blank";providerLink.rel="noopener noreferrer";providerLink.hidden=true;const links=make("div","sl-p-links");links.append(original,providerLink);panel.append(head,host,providerButtons,notice,links,queueDetails);doc.body.append(panel);applyCompact();
 if(typeof ResizeObserver==="function")new ResizeObserver(()=>doc.documentElement.style.setProperty("--sl-player-space",panel.hidden?"0px":Math.ceil(panel.getBoundingClientRect().height)+"px")).observe(panel)
}
function applyCompact(){panel.classList.toggle("sl-p-compact",compact);compactButton.textContent=compact?"+":"−";compactButton.setAttribute("aria-expanded",String(!compact));compactButton.setAttribute("aria-label",compact?"Expand player details":"Compact player details");if(compact)queueDetails.open=false}


function queueEdit(id,op){
 const updated=editQueue(items,index,id,op);items=updated.items;index=updated.index;
 refreshQueue();persist();
}
function refreshQueue(){
 if(!panel||panel.hidden||index<0)return;
 const r=items[index],spec=frame(activeID===r.id?activeProvider:source(r));
 meta.textContent=r.artist+" · "+(index+1)+"/"+items.length+(spec?" · "+spec.name:" · External only");
 redrawQueue();refreshControls();
}
function redrawQueue(){
 queueList.replaceChildren();
 items.forEach((r,i)=>{
  const row=make("div","sl-p-queue-row"),b=button((i+1)+". "+r.title+" — "+r.artist+(available(r)?"":" · external only"),()=>select(i),"sl-p-button sl-p-queue-select");
  if(i===index){b.setAttribute("aria-current","true");row.classList.add("sl-p-queue-current")}
  row.append(b);
  if(i!==index){
   const controls=make("div","sl-p-queue-tools");
   for(const [op,symbol,label,disabled] of [["up","↑","Move up",i===0||i-1===index],["down","↓","Move down",i===items.length-1||i+1===index],["remove","×","Remove",false]]){
    const btn=button(symbol,()=>queueEdit(r.id,op),"sl-p-button sl-p-queue-edit");btn.disabled=disabled;btn.setAttribute("aria-label",label+" "+r.title);btn.title=label;controls.append(btn)
   }
   row.append(controls)
  }
  queueList.append(row)
 });
 queueDetails.firstElementChild.textContent="Listening queue · "+items.length+" selections"
}
function adjacent(d){for(let i=index+d;i>=0&&i<items.length;i+=d)if(!playableOnly||available(items[i]))return i;return -1}
function refreshControls(){previous.disabled=adjacent(-1)<0;next.disabled=adjacent(1)<0;playableButton.textContent="Skip external-only: "+(playableOnly?"on":"off");playableButton.setAttribute("aria-pressed",String(playableOnly))}
function renderProvider(r,e){
 const spec=frame(e);host.replaceChildren();activeID=r.id;activeProvider=e;
 original.href=r.url;original.textContent=urlOf(r.url)?.hostname==="music.youtube.com"&&urlOf(r.url)?.pathname==="/search"?"Search YouTube Music ↗":"Open original release ↗";
 if(e?.source&&e.source!==r.url){providerLink.href=e.source;providerLink.textContent="Open "+(spec?.name||"provider")+" ↗";providerLink.hidden=false}else{providerLink.hidden=true;providerLink.removeAttribute("href")}
 if(spec){const f=make("iframe","sl-p-embed");f.src=spec.src;f.title=spec.name+" player — "+r.title;f.height=String(spec.height);f.allow="autoplay; encrypted-media; fullscreen; picture-in-picture";f.allowFullscreen=true;f.referrerPolicy="strict-origin-when-cross-origin";host.append(f);notice.textContent=spec.name==="Apple Music"?"Press play to preview. Full tracks require eligible Apple Music access. Availability depends on the provider.":"Press play in the "+spec.name+" player. Availability and playback length are controlled by the provider."}
 else notice.textContent="No verified in-site source yet. You can search for this recording using the link below, or choose the next record.";
 const options=choices(r);providerButtons.replaceChildren();providerButtons.hidden=options.length<2;
 for(const item of options){const selected=frame(item).src===spec?.src;const b=button(frame(item).name,()=>{if(!selected){renderProvider(r,item);refreshQueue()}},"sl-p-button sl-p-provider");b.setAttribute("aria-pressed",String(selected));providerButtons.append(b)}
}
function select(i){
 if(i<0||i>=items.length)return;build();index=i;const r=items[i];panel.hidden=false;doc.body.classList.add("sl-player-open");
 title.textContent=r.title;
 if(activeID!==r.id||!host.firstElementChild)renderProvider(r,source(r));
 refreshQueue();persist()
}
function play(r,list=[r]){if(!r)return;if(queueDetails)queueDetails.open=false;items=clean(list);if(!items.some(x=>x.id===r.id))items=clean([r,...items]);select(items.findIndex(x=>x.id===r.id))}
function step(d){const i=adjacent(d);if(i>=0)select(i)}
function stop(){if(!panel)return;queueDetails.open=false;host.replaceChildren();activeID=null;activeProvider=null;panel.hidden=true;doc.body.classList.remove("sl-player-open");doc.documentElement.style.setProperty("--sl-player-space","0px")}
function resume(){if(index>=0)select(index)}
function action(r,list){if(available(r))return button("▶ Play here",()=>play(r,list),"sl-d-button sl-p-launch");const a=make("a","sl-d-button sl-p-source","Open release ↗");a.href=r.url;a.target="_blank";a.rel="noopener noreferrer";return a}
function addNext(r){if(!r)return;const current=items[index];if(current?.id===r.id)return;items=clean(items.filter(x=>x.id!==r.id));index=current?items.findIndex(x=>x.id===current.id):-1;items.splice(index+1,0,r);if(index<0)index=0;items=clean(items);if(panel&&!panel.hidden)refreshQueue();persist()}
root.SUBLEVELPlayer=Object.freeze({play,action,available,resume,stop,addNext,hasSession:()=>index>=0,updateQueue(list,id){if(!panel||panel.hidden||!items.some(r=>r.id===id)||items.some(r=>r.id.startsWith("chart:")))return;const updated=clean(list);if(!updated.length)return;const current=items[index]?.id;items=updated;index=items.findIndex(r=>r.id===current);if(index<0){stop();index=0}else{refreshControls();meta.textContent=items[index].artist+" · "+(index+1)+"/"+items.length;redrawQueue();refreshControls()}persist()}});
// Integrate the original magazine's native track rows without replacing
// their artwork, saving, details, or original source URLs.
const identityText=v=>(v||"").normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]/gu,"");
function nativeRecord(row){
 const title=row.querySelector(".tracktitle strong,.tracktitle b")?.textContent.trim();
 const artistNode=row.querySelector(".tracktitle small");
 const artist=artistNode?Array.from(artistNode.childNodes).filter(n=>n.nodeType===3).map(n=>n.textContent).join("").trim()||artistNode.textContent.trim():"";
 const a=row.querySelector("a.play[href]");
 const url=a?.href;
 if(!title||!artist||!urlOf(url))return null;
 // The original search link identifies the exact editorial row even when
 // metadata chips share the artist container. Never embed the search itself.
 // Compare the same exact search query after URL serialization (apostrophes
 // can become %27 when an href is resolved by the browser).
 const searchIdentity=value=>{const u=urlOf(value);if(!u||u.hostname!=="music.youtube.com"||u.pathname!=="/search"||u.hash||[...u.searchParams.keys()].some(k=>k!=="q")||u.searchParams.getAll("q").length!==1)return null;return u.searchParams.get("q")};
 const query=searchIdentity(url);
 const matches=v=>v.title===title&&(v.originalUrl===url||(query!==null&&searchIdentity(v.originalUrl)===query))&&identityText(artist).startsWith(identityText(v.artist));
 const reviewed=(data?.reviewedNativeEmbeds||[]).find(matches);
 const apple=(data?.reviewedNativeApple||[]).find(v=>matches(v)&&fromURL(v.source)?.provider==="apple"&&fromURL(v.source)?.kind==="track");
 const preferred=reviewed||apple;
 if(preferred){
  const track={id:"native:"+preferred.title+":"+preferred.artist,title,artist:preferred.artist,url,embedUrl:preferred.source,alternateEmbedUrl:reviewed&&apple?apple.source:undefined};
  if(available(track))return track
 }
 const exact=r=>identityText(r.title)===identityText(title)&&identityText(r.artist)===identityText(artist);
 const catalogue=records.filter(exact);
 if(catalogue.length===1&&available(catalogue[0]))return {...catalogue[0],url};
 const direct=fromURL(url);
 if(direct&&direct.kind!=="album"&&direct.kind!=="playlist")return {id:"native:"+title+":"+artist,title,artist,url};
 const found=(root.__slCharts?.charts||[]).flatMap(c=>c.rows.filter(exact)).filter(r=>r.embedUrl||r.embedSpec);
 // Only use an exact matching chart identity if provider references agree.
 const unique=new Map(found.map(r=>[JSON.stringify([r.embedUrl||"",r.alternateEmbedUrl||"",r.embedSpec||null]),r]));
 if(unique.size===1){const r=[...unique.values()][0];const track={id:"native:"+title+":"+artist,title,artist,url,embedUrl:r.embedUrl,alternateEmbedUrl:r.alternateEmbedUrl,embedSpec:r.embedSpec};if(available(track))return track}
 return {id:"native:"+title+":"+artist,title,artist,url};
}
function nativeRows(app){return [...app.querySelectorAll(".tracks:not(.sl-chart-native-list) .track")].filter(row=>!row.closest(".sl-chart-inline")&&row.getClientRects().length)}
function enhanceNative(app){
 if(!app.querySelector(".roomhead"))return;
 for(const row of nativeRows(app)){
  const a=row.querySelector("a.play[href]");if(!a)continue;
  const r=nativeRecord(row),can=!!r&&available(r);
  if(can){a.dataset.slNativePlay="true";a.setAttribute("aria-label","Play "+r.title+" here");a.title="Play here"}else if(r){delete a.dataset.slNativePlay;a.setAttribute("aria-label","Find playback for "+r.title);a.title="No verified embed yet — open listening options"}
 }
}
doc.addEventListener("click",e=>{
 if(e.defaultPrevented||e.button!==0||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;
 const a=e.target.closest?.("#app .tracks:not(.sl-chart-native-list) a.play[href]");
 const app=doc.getElementById("app");if(!a||!app?.querySelector(".roomhead")||a.closest(".sl-chart-inline"))return;
 const row=a.closest(".track"),r=row&&nativeRecord(row);
 if(!r)return;
 // Keep the primary play action on-site, even when a verified source is missing.
 // The player explicitly presents the original search link as an optional fallback.
 e.preventDefault();e.stopImmediatePropagation();
 play(r,nativeRows(app).map(nativeRecord).filter(Boolean))
},true);
function mount(){
 const app=doc.getElementById("app");if(!app)return;
 enhanceNative(app);
 const norm=v=>(v||"").normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]/gu,"");
 for(const hero of app.querySelectorAll(".sl-dossier-hero")){if(hero.parentElement.querySelector(".sl-p-dossier"))continue;const t=norm(hero.querySelector("h2")?.textContent),a=norm(hero.querySelector(".sl-dossier-artist")?.textContent);if(!t||!a)continue;const m=records.filter(r=>norm(r.title)===t&&norm(r.artist)===a&&available(r));if(m.length===1){const b=action(m[0],records.filter(available));b.classList.add("sl-p-dossier");hero.after(b)}}
 if(index>=0&&!app.querySelector(".sl-p-resume")&&app.querySelector(".night-home")){const b=button("Resume music player →",resume,"sl-p-resume");app.querySelector(".night-home").prepend(b)}
}
let pending=false;const schedule=()=>{if(!pending){pending=true;requestAnimationFrame(()=>{pending=false;mount()})}};
const app=doc.getElementById("app");if(app)new MutationObserver(schedule).observe(app,{childList:true,subtree:true});schedule();
})(globalThis);
