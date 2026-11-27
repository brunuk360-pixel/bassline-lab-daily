(()=>{
"use strict";
const app=document.getElementById("app");if(!app)return;
const make=(tag,cls,txt)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(txt)n.textContent=txt;return n};
const clean=n=>n?.textContent?.trim().replace(/\s+/g," ")||"";
const scroll=n=>n.scrollIntoView({block:"start",behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth"});
function homeIndex(home){
 const defs=[
 [".ed-lead","Browse genres","The music library","Explore genres and charts"],
 [".stream-listen","Daily listening","On rotation","Daily mix & record of the day"],
 [".sl-d-entry","The Daily Dig","Fresh discoveries","Ten curated releases"],
 [".stream-moods","Listen by mood","Set the atmosphere","Warehouse, afterhours & more"],
 [".motion-news","Today in music","The news desk","Latest music stories"],
 [".night-section:not(.stream-listen):not(.stream-moods)","Discovery tools","Dig deeper","Samples, moods & surprise picks"],
 [".motion-section:not(.motion-news)","Beyond the charts","The culture desk","Records, scenes & documentaries"],
 [".night-section","Unsigned","The next wave","Producer community"]
 ];
 const sections=[];
 for(const [selector,title,kicker,desc] of defs){
  let candidates=Array.from(home.querySelectorAll(":scope > "+selector));
  if(title==="Unsigned")candidates=candidates.filter(n=>/unsigned/i.test(clean(n.querySelector("h2,.night-heading"))));
  if(title==="Discovery tools")candidates=candidates.filter(n=>/discover more|listening tools/i.test(clean(n.querySelector(".night-heading,h2"))));
  const node=candidates[0];if(node&&!sections.some(x=>x.node===node))sections.push({node,title,kicker,desc});
 }
 if(!sections.length)return;
 const signature=sections.map(s=>s.title).join("|");
 const old=home.querySelector(":scope > .sl-home-index");
 if(old?.dataset.signature===signature)return;
 old?.remove();
 const index=make("nav","sl-home-index");index.dataset.signature=signature;index.setAttribute("aria-label","Today's edition contents");
 const heading=make("div","sl-home-index-head");heading.append(make("span","sl-home-kicker","TODAY / CONTENTS"),make("strong",null,"Explore this edition"));index.append(heading);
 const grid=make("div","sl-home-index-grid");
 sections.forEach((s,i)=>{
  const number=String(i+1).padStart(2,"0");
  const anchor=make("button","sl-home-index-link");anchor.type="button";anchor.append(make("span","sl-home-num",number),make("span",null,s.title),make("span","sl-home-arr","↘"));anchor.addEventListener("click",()=>scroll(s.node));grid.append(anchor);
  if(s.node.matches(".sl-d-entry")){s.node.classList.add("sl-home-dig");return}
  s.node.classList.add("sl-home-department");
  let header=s.node.querySelector(":scope > .sl-home-dept-title");
  if(!header){header=make("div","sl-home-dept-title");s.node.prepend(header)}
  header.replaceChildren(make("span","sl-home-dept-num",number),make("div","sl-home-dept-copy"));
  header.lastChild.append(make("span","sl-home-kicker",s.kicker),make("h2",null,s.title),make("small",null,s.desc));
  // Keep original interactive heading controls; only conceal a duplicate non-interactive title.
  const existing=s.node.querySelector(":scope > .night-heading,:scope > .motion-title,:scope > .home-mood-label");
  if(existing&&!existing.querySelector("button,a,select,input"))existing.classList.add("sl-home-original-heading");
 });
 index.append(grid);
 const issue=home.querySelector(":scope > .night-issue");
 if(issue)issue.after(index);else home.prepend(index);
}
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&apos;"}[c]));
function masthead(cover){
 const h=cover.querySelector("h1");if(!h)return;
 const title=clean(h);const all=clean(cover);
 const date=all.match(/\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}\s*[–—-]\s*\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}/)?.[0]||clean(cover.querySelector("p,time"));
 const signature=title+"|"+date;if(cover.dataset.slStrip===signature)return;
 cover.querySelector(".sl-issue-art")?.remove();
 const words=title.split(/\s+/);let lines=[""];
 for(const word of words){const last=lines.length-1;if((lines[last]+" "+word).trim().length>23&&lines[last]&&lines.length<2)lines.push(word);else lines[last]=(lines[last]+" "+word).trim()}
 const f=Math.min(48,Math.floor(418/(Math.max(...lines.map(l=>l.length))*.53)));
 const y=lines.length===1?105:82;
 const logo='<path fill="#13201e" d="M8 40 57 15v13L19 48l31 16-13 7L8 55Zm53 24L12 89V76l37-19L18 40l13-7 30 16Z"/>';
 const svg='<svg xmlns="http://www.w3.org/2000/svg" width="720" height="202" viewBox="0 0 720 202"><defs><pattern id="grain" width="7" height="7" patternUnits="userSpaceOnUse"><path d="M0 0h7v7H0z" fill="#ecece3"/><path d="M0 3h7v.5H0z" fill="#d5d8ce" opacity=".5"/></pattern></defs><path d="M0 0H563L497 202H0Z" fill="url(#grain)"/><g transform="translate(15 52) scale(.9)">'+logo+'</g><path d="M85 35v132" stroke="#253c35" stroke-width="1.5"/><g font-family="Arial,Helvetica,sans-serif"><text x="105" y="35" fill="#236c62" font-size="15" font-weight="700" letter-spacing="1">SUBLEVEL / WEEKLY MAGAZINE</text>'+lines.map((l,i)=>'<text x="104" y="'+(y+i*(f+1))+'" fill="#101c1a" font-size="'+f+'" font-weight="800" letter-spacing="-1.6">'+esc(l)+'</text>').join("")+'<text x="106" y="157" fill="#152420" font-size="17" font-weight="600">'+esc(date)+'</text><text x="106" y="182" fill="#344942" font-size="12" font-weight="700" letter-spacing="1.1">DRUM &amp; BASS / MUSIC / CULTURE</text></g></svg>';
 const img=make("img","sl-issue-art");img.alt="";img.setAttribute("aria-hidden","true");img.src="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(svg);
 cover.append(img);cover.dataset.slStrip=signature;cover.classList.add("sl-issue-strip");
}
function update(){pending=false;const home=app.querySelector(".night-home");if(home)homeIndex(home);app.querySelectorAll(".weekly-cover").forEach(masthead)}
let pending=false;function schedule(){if(!pending){pending=true;requestAnimationFrame(update)}}new MutationObserver(schedule).observe(app,{childList:true,subtree:true});schedule();
})()
