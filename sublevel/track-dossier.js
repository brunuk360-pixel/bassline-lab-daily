(()=>{
"use strict";
const app=document.getElementById("app");if(!app)return;
const clean=n=>n?.textContent?.trim().replace(/\s+/g," ")||"";
function el(tag,cls,txt){const n=document.createElement(tag);if(cls)n.className=cls;if(txt)n.textContent=txt;return n}
function facts(detail){
 const out=new Map();
 detail.querySelectorAll(".metadata-grid > div").forEach(cell=>{const k=clean(cell.querySelector("small")),v=clean(cell.querySelector("b,strong"));if(k&&v&&!/^(unknown|unverified|not verified|n\/a|—|–)$/i.test(v))out.set(k.toLowerCase(),v)});
 return out;
}
function build(detail){
 if(detail.querySelector(".sl-dossier-hero"))return;
 const track=detail.closest(".track");if(!track)return;
 const title=clean(track.querySelector(".tracktitle strong,.tracktitle b"));if(!title)return;
 const rawArtist=clean(track.querySelector(".tracktitle small"));
 const artist=rawArtist.replace(/\s*(?:19|20)\d{2}\s*$/,"").replace(/\s*[·|•]\s*$/,"").trim();
 const metadata=facts(detail);
 const year=metadata.get("original year")||metadata.get("year")||metadata.get("release year")||"";
 const album=metadata.get("album")||"";
 const label=metadata.get("label")||"";
 const art=track.querySelector(".trackline .cover img");
 const src=art&&(art.currentSrc||art.getAttribute("src"));
 const hero=el("div","sl-dossier-hero");
 if(src){const bg=el("img","sl-dossier-bg");bg.src=src;bg.alt="";bg.setAttribute("aria-hidden","true");hero.append(bg);const cover=el("img","sl-dossier-art");cover.src=src;cover.alt=title+" release artwork";hero.append(cover)}else{hero.style.gridTemplateColumns="minmax(0,1fr)"}
 const copy=el("div","sl-dossier-copy");copy.append(el("span","sl-dossier-eyebrow","SUBLEVEL / TRACK DOSSIER"),el("h2",null,title));if(artist)copy.append(el("p","sl-dossier-artist",artist));
 const row=el("div","sl-dossier-facts");[year,label].filter(Boolean).forEach(v=>row.append(el("span",null,v)));if(row.children.length)copy.append(row);hero.append(copy);
 const heading=detail.querySelector(".record-heading");if(heading)heading.before(hero);else detail.prepend(hero);
 const story=Array.from(detail.querySelectorAll(".record-panel")).find(n=>n.querySelector(".story-copy"));
 if(story){
   const grid=story.querySelector(".metadata-grid");if(grid&&!grid.previousElementSibling?.classList.contains("sl-dossier-section"))grid.before(el("h3","sl-dossier-section","Release at a glance"));
   const links=el("div","sl-dossier-discovery");links.append(el("h3",null,"Explore the catalogue"));
   function add(label,q){const a=el("a",null,label);a.href="https://open.spotify.com/search/"+encodeURIComponent(q);a.target="_blank";a.rel="noopener noreferrer";a.append(el("span",null,"↗"));links.append(a)}
   if(artist)add("More from "+artist,artist);
   if(album&&album!==title)add("Discover the album: "+album,[artist,album].filter(Boolean).join(" "));
   if(label)add("Explore "+label,label);
   if(links.children.length>1)story.append(links);
 }
}
let pending=false;
function update(){pending=false;app.querySelectorAll(".editorial-detail:not([hidden])").forEach(n=>{if(n.getClientRects().length)build(n)})}
function schedule(){if(!pending){pending=true;requestAnimationFrame(update)}}
new MutationObserver(schedule).observe(app,{childList:true,subtree:true,attributes:true,attributeFilter:["hidden","class"]});schedule();
})()
