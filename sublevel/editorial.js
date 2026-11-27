(()=>{
"use strict";
const index=window.__sublevelMagazineImages||{};
const sourceKey=u=>{try{const p=new URL(u,location.href);return p.host.toLowerCase()+p.pathname.replace(/\/$/,"")}catch{return ""}};
const photoKey=u=>{try{const p=new URL(u,location.href);return p.host+p.pathname.replace(/\/v1\/.*/,"")}catch{return u}};
const text=(tag,cls,value)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(value)n.textContent=value;return n};
let pending=false;
const app=document.getElementById("app");
if(!app)return;
function gallery(story,copy){
 const used=new Set(Array.from(story.querySelectorAll("img[src]"),i=>photoKey(i.currentSrc||i.src)));
 const photos=[];
 story.querySelectorAll("a[href]").forEach(a=>{
  for(const p of index[sourceKey(a.href)]||[]){
   if(photos.length>=3||!p.url||used.has(photoKey(p.url)))continue;
   used.add(photoKey(p.url));photos.push(p);
  }
 });
 if(!photos.length)return;
 const g=text("div","sl-weekly-gallery");
 g.setAttribute("aria-label","Related source photography");
 photos.forEach(p=>{
  const f=text("figure"),im=text("img"),caption=text("figcaption",null,p.caption||"Source artwork");
  im.src=p.url;im.alt=p.alt||"Artwork from the linked article or release";im.loading="lazy";im.decoding="async";im.referrerPolicy="no-referrer";
  if(p.source){const a=text("a",null,"View source");a.href=p.source;a.target="_blank";a.rel="noopener noreferrer";caption.append(" · ",a)}
  im.addEventListener("error",()=>{f.remove();if(!g.children.length)g.remove()},{once:true});
  f.append(im,caption);g.append(f);
 });
 const first=copy.querySelector("p");if(first)first.after(g);else copy.append(g);
}
function button(label,fn){const b=text("button",null,label);b.type="button";b.addEventListener("click",fn);return b}
function visibleScroll(node){node.scrollIntoView({behavior:matchMedia("(prefers-reduced-motion:reduce)").matches?"instant":"smooth",block:"start"})}
function enhance(){
 pending=false;
 const stories=Array.from(app.querySelectorAll(".weekly-story"));
 stories.forEach((story,i)=>{
  if(story.dataset.slEditorial==="1")return;
  const copy=story.querySelector(".weekly-copy");if(!copy)return;
  story.dataset.slEditorial="1";
  const title=copy.querySelector("h2");
  const words=Array.from(copy.querySelectorAll("p"),p=>p.textContent).join(" ").trim().split(/\s+/).filter(Boolean).length;
  if(title&&words){const t=text("span","sl-read-time",Math.max(1,Math.ceil(words/220))+" min read");title.after(t)}
  gallery(story,copy);
  const tools=text("div","sl-story-tools");
  if(i+1<stories.length)tools.append(button("Next article →",()=>visibleScroll(stories[i+1])));
  else tools.append(button("Back to magazine cover ↑",()=>{const cover=app.querySelector(".weekly-cover");if(cover)visibleScroll(cover)}));
  if(title&&navigator.share){
   tools.append(button("Share this story ↗",async()=>{try{await navigator.share({title:title.textContent.trim(),text:title.textContent.trim()+" — SUBLEVEL",url:location.origin+location.pathname+location.search+location.hash})}catch{}}));
  }
  copy.append(tools);
 });
 app.querySelectorAll(".weekly-story img, .news-art img, .trackline img, .genre-sleeve img").forEach(im=>{if(!im.hasAttribute("loading"))im.loading="lazy";if(!im.hasAttribute("decoding"))im.decoding="async"});
 document.querySelectorAll(".bottom button,.topnav button").forEach(b=>{
  if(b.classList.contains("active"))b.setAttribute("aria-current","page");else b.removeAttribute("aria-current");
 });
}
const schedule=()=>{if(!pending){pending=true;requestAnimationFrame(enhance)}};
new MutationObserver(schedule).observe(app,{childList:true,subtree:true});
const nav=document.querySelector(".bottom");
if(nav)new MutationObserver(schedule).observe(nav,{attributes:true,subtree:true,attributeFilter:["class"]});
const top=button("↑",()=>{
 const scroller=document.scrollingElement;
 if(scroller)scroller.scrollTo({top:0,behavior:matchMedia("(prefers-reduced-motion:reduce)").matches?"instant":"smooth"});
 let n=app;while(n&&n!==document.body){if(n.scrollTop>0)n.scrollTo({top:0,behavior:"smooth"});n=n.parentElement}
});
top.className="sl-top-jump";top.hidden=true;top.setAttribute("aria-label","Back to top");document.body.append(top);
function syncTop(){
 let y=window.scrollY;let n=app;while(n&&n!==document.body){y=Math.max(y,n.scrollTop||0);n=n.parentElement}
 top.hidden=y<650||!!document.querySelector("dialog[open]");
}
window.addEventListener("scroll",syncTop,{passive:true,capture:true});schedule();
})()
