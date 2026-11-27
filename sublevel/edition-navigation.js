(()=>{
"use strict";
const app=document.getElementById("app");if(!app)return;
const make=(tag,cls,txt)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(txt)n.textContent=txt;return n};
const clean=n=>n?.textContent?.trim().replace(/\s+/g," ")||"";
const scroll=n=>n.scrollIntoView({block:"start",behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth"});
const departments=[
 [".ed-lead","Browse genres","THE MUSIC LIBRARY","Explore genres, charts and essential tracks."],
 [".stream-listen","Daily listening","ON ROTATION","Daily mix and record of the day."],
 [".sl-d-entry","The Daily Dig","NEW DISCOVERIES","Ten curated releases."],
 [".stream-moods","Listen by mood","SET THE ATMOSPHERE","Find the right music for the moment."],
 [".motion-news","Today in music","THE NEWS DESK","Independent music news and stories."],
 [".night-section:not(.stream-listen):not(.stream-moods)","Discovery tools","DIG DEEPER","Follow samples and discover unfamiliar sounds.","discover more|listening tools"],
 [".motion-section:not(.motion-news)","Beyond the charts","THE CULTURE DESK","Albums, scenes and documentaries."],
 [".night-section","Unsigned","THE NEXT WAVE","Discover emerging producers.","unsigned"]
];
const mounted=new WeakMap();
function homeIndex(home){
 const sections=departments.map(([selector,title,kicker,desc,match])=>{
  let nodes=Array.from(home.querySelectorAll(":scope > "+selector));
  if(match)nodes=nodes.filter(n=>new RegExp(match,"i").test(clean(n.querySelector(":scope > .night-heading")||n.querySelector(":scope > .motion-title"))));
  return {node:nodes[0],title,kicker,desc};
 }).filter(s=>s.node);
 const prior=mounted.get(home);
 if(prior&&prior.length===sections.length&&prior.every((n,i)=>n===sections[i].node)&&home.querySelector(".sl-home-index"))return;
 mounted.set(home,sections.map(s=>s.node));
 home.querySelector(":scope > .sl-home-index")?.remove();
 if(!sections.length)return;
 const nav=make("nav","sl-home-index");nav.setAttribute("aria-label","Today's edition contents");
 const header=make("div","sl-home-index-head");header.append(make("span","sl-home-kicker","SUBLEVEL / TODAY"),make("strong",null,"In this edition"));nav.append(header);
 const grid=make("div","sl-home-index-grid");
 sections.forEach((s,i)=>{
  const number=String(i+1).padStart(2,"0"),anchor=make("button","sl-home-index-link");anchor.type="button";
  anchor.append(make("span","sl-home-num",number),make("span",null,s.title),make("span","sl-home-arr","↘"));anchor.addEventListener("click",()=>scroll(s.node));grid.append(anchor);
  if(s.node.matches(".sl-d-entry")){s.node.classList.add("sl-home-dig");return}
  s.node.classList.add("sl-home-department");
  let dept=s.node.querySelector(":scope > .sl-home-dept-title");
  if(!dept){dept=make("header","sl-home-dept-title");s.node.prepend(dept)}
  const copy=make("div","sl-home-dept-copy");
  copy.append(make("span","sl-home-kicker",s.kicker),make("h2",null,s.title),make("small",null,s.desc));
  dept.replaceChildren(make("span","sl-home-dept-num",number),copy);
  // Retain interactive original headings; suppress only the redundant static heading.
  const old=s.node.querySelector(":scope > .night-heading,:scope > .motion-title");
  if(old&&!old.querySelector("button,a,select,input"))old.classList.add("sl-home-original-heading");
 });
 nav.append(grid);
 const issue=home.querySelector(":scope > .night-issue");if(issue)issue.after(nav);else home.prepend(nav);
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
