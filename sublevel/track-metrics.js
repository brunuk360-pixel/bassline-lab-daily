/* Shared recording metadata. No genre-based guesses or album-wide BPM. */
(()=>{
"use strict";
const D=window.__slDiscovery||{},app=document.getElementById("app");if(!app)return;
const identity=s=>String(s||"").normalize("NFC").trim().toLowerCase().replace(/\s+/g," ");
const find=(title,artist)=>{const rows=(D.trackMetrics||[]).filter(r=>identity(r.title)===identity(title)&&identity(r.artist)===identity(artist));return rows.length===1?rows[0]:null};
const chip=(text,cls,source)=>{const n=document.createElement(source?"a":"span");n.className="sl-metric "+cls;n.textContent=text;if(source){n.href=source;n.target="_blank";n.rel="noopener noreferrer";n.title="Catalogue estimate — open source";n.addEventListener("click",e=>e.stopPropagation())}return n};
function append(host,title,artist,{bpm=false,key=false,album=false}={}){
 if(!host||host.querySelector(".sl-metrics")||album)return;
 const m=find(title,artist),wrap=document.createElement("span");wrap.className="sl-metrics";
 if(!bpm)wrap.append(chip(m?.bpm?m.bpm+" BPM":"BPM —","sl-metric-bpm"+(!m?.bpm?" sl-metric-pending":""),null));
 if(!key)wrap.append(chip(m?.key||"Key —","sl-metric-key"+(!m?.key?" sl-metric-pending":""),null));
 if(!wrap.children.length)return;
 wrap.title=m?["Catalogue estimate",m.note,m.source].filter(Boolean).join(" · "):"Recording metadata not verified yet";
 if(m?.source){wrap.dataset.source=m.source;wrap.setAttribute("aria-label",wrap.textContent+"; catalogue estimate");}
 host.append(wrap)
}
window.SUBLEVELMetrics=Object.freeze({append,find});
function native(){
 for(const row of app.querySelectorAll(".tracks:not(.sl-chart-native-list) .track")){
 const host=row.querySelector(".tracktitle"),title=host?.querySelector("strong,b")?.textContent.trim(),small=host?.querySelector("small"),url=row.querySelector("a.play[href]")?.href;
 if(!host||!small||!title||host.querySelector(".sl-metrics"))continue;
 let artist="";try{const u=new URL(url),q=u.searchParams.get("q");if(u.hostname==="music.youtube.com"&&u.pathname==="/search"&&q?.endsWith(" "+title))artist=q.slice(0,-title.length-1)}catch{}
 if(!artist)artist=[...small.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join("").trim()||small.textContent.trim();
 const text=small.textContent;
 append(host,title,artist,{bpm:/\d+(?:\.\d+)?\s*BPM\b/i.test(text),key:/\b[A-G][♯♭#b]?\s*(?:major|minor)\b/i.test(text)});
 }
}
let pending=false;function schedule(){if(!pending){pending=true;requestAnimationFrame(()=>{pending=false;native()})}}
new MutationObserver(schedule).observe(app,{childList:true,subtree:true});schedule();
})();
