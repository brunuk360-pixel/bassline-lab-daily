(()=> {
"use strict";
const imageIndex=window.__sublevelMagazineImages||{};
const key=u=>{try{const p=new URL(u);return p.host.toLowerCase()+p.pathname.replace(/\/$/,"")}catch{return ""}};
let dialog,lastSummary;
function element(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text)n.textContent=text;return n}
function figure(item,hero=false){
 const f=element("figure","sl-mag-photo"+(hero?" sl-mag-hero":""));
 const im=element("img");im.alt=item.alt||"Article artwork";im.loading=hero?"eager":"lazy";im.decoding="async";im.referrerPolicy="no-referrer";im.src=item.url;
 const cap=element("figcaption",null,item.caption||"Editorial artwork");
 if(item.source){const a=element("a",null,"Source ↗");a.href=item.source;a.target="_blank";a.rel="noopener noreferrer";cap.append(" · ",a)}
 im.addEventListener("error",()=>f.remove(),{once:true});
 f.append(im,cap);return f;
}
function openArticle(item,summary){
 const copy=summary.querySelector(".news-copy");
 const body=item.querySelector(".news-body");if(!copy||!body)return false;
 if(!dialog){dialog=element("dialog","sl-mag-reader");if(typeof dialog.showModal!=="function")return false;
 document.body.append(dialog);
 dialog.addEventListener("close",()=>{document.body.classList.remove("sl-mag-lock");if(lastSummary?.isConnected)lastSummary.focus({preventScroll:true})});
 }
 const headline=copy.querySelector("b,strong,h2,h3")?.textContent.trim()||copy.textContent.trim();
 const category=copy.querySelector("small")?.textContent.trim()||"Music news";
 const date=copy.querySelector("time")?.textContent.trim()||"";
 const images=[],seen=new Set();
 const add=x=>{if(x?.url&&!seen.has(x.url)){seen.add(x.url);images.push(x)}};
 body.querySelectorAll("a[href]").forEach(a=>(imageIndex[key(a.href)]||[]).forEach(add));
 summary.querySelectorAll("img[src]").forEach(i=>add({url:i.currentSrc||i.src,alt:i.alt||headline,caption:"Article artwork"}));
 const scene=summary.style.getPropertyValue("--news-scene").trim();
 if(images.length===0&&scene.startsWith("url(")){
   const src=scene.slice(4,-1).replace(/^["']|["']$/g,"");
   if(/^data:image\/|^https:\/\//.test(src))add({url:src,caption:"Illustrative scene image",alt:"Music scene illustration"});
 }
 const bar=element("header","sl-mag-bar");
 const close=element("button","sl-mag-close","← Back to magazine");close.type="button";close.onclick=()=>dialog.close();
 const brand=element("span","sl-mag-brand","SUBLEVEL / PRESS");bar.append(close,brand);
 const article=element("article","sl-mag-page");
 const mast=element("div","sl-mag-mast");
 const kicker=element("div","sl-mag-kicker",category);
 const title=element("h1",null,headline);
 const meta=element("div","sl-mag-meta",[date,"SUBLEVEL · Music desk"].filter(Boolean).join("  /  "));
 mast.append(kicker,title,meta);article.append(mast);
 if(images.length)article.append(figure(images[0],true));
 const prose=element("div","sl-mag-prose");
 const cloned=body.cloneNode(true);
 const actions=cloned.querySelector(".news-actions");if(actions)actions.remove();
 const paragraphs=Array.from(cloned.children);
 paragraphs.forEach((p,i)=>{
   if(i===0&&p.tagName==="P")p.classList.add("sl-mag-intro");
   prose.append(p);
   if(i===0&&images.length>1){
     const gallery=element("div","sl-mag-gallery");
     images.slice(1,4).forEach(x=>gallery.append(figure(x)));prose.append(gallery);
   }
 });
 if(!paragraphs.length)prose.textContent=body.textContent;
 article.append(prose);
 if(actions){actions.classList.add("sl-mag-links");article.append(actions)}
 article.append(element("footer","sl-mag-end","SUBLEVEL  /  INDEPENDENT MUSIC DISCOVERY"));
 dialog.replaceChildren(bar,article);lastSummary=summary;
 dialog.setAttribute("aria-label",headline);
 document.body.classList.add("sl-mag-lock");dialog.showModal();dialog.scrollTop=0;close.focus({preventScroll:true});return true;
}
document.addEventListener("click",e=>{
 if(e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
 const summary=e.target.closest?.("details.news-item > summary");
 if(!summary||!summary.closest("#app")||e.target.closest("a,button"))return;
 try{if(openArticle(summary.parentElement,summary)){e.preventDefault();e.stopPropagation()}}catch(err){console.warn("Magazine reader fallback",err)}
},true);
})()
