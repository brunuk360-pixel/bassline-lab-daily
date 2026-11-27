(()=>{
"use strict";
const app=document.getElementById("app");if(!app)return;
const url="https://sublevel-unsigned-xvpf.onrender.com/";
const make=(tag,cls,txt)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(txt)n.textContent=txt;return n};
const label=n=>(n?.textContent||"").trim().replace(/\s+/g," ");
function destination(txt,pathname="",cls="sl-u-link"){const a=make("a",cls,txt);a.href=new URL(pathname,url).href;return a}
function entry(compact=false){
 const box=make("div",compact?"sl-u-entry sl-u-compact":"sl-u-entry");
 const kicker=make("div","sl-u-kicker","SUBLEVEL / UNSIGNED · INVITE-ONLY BETA");
 const title=make("h2",null,compact?"Your producer community":"Before the world hears it.");
 const copy=make("p",null,compact?"Sign in to your separate community account to manage your profile and tracks.":"Discover emerging producers, share tracks, give constructive feedback and rise through the rankings.");
 const controls=make("div","sl-u-actions");
 controls.append(destination("Open Unsigned →","","sl-u-link sl-u-primary"),destination("Sign in","login"),destination("Join beta","join"));
 box.append(kicker,title,copy,controls,make("small",null,"Public discovery · invitation required to participate · separate account"));
 return box
}
function mount(){
 const home=app.querySelector(".night-home");
 if(home){
  const sections=[...home.querySelectorAll(":scope > .night-section")];
  let section=sections.find(n=>/unsigned/i.test(label(n.querySelector(":scope > .night-heading")||n.querySelector(":scope > .sl-home-dept-title"))));
  if(!section){section=make("section","night-section sl-u-section");section.append(make("h2","night-heading","Unsigned"));home.append(section)}
  // Preserve old DOM and local data, but avoid misleading duplicate beta actions.
  section.classList.add("sl-u-section");
  for(const child of section.children){if(!child.matches(".sl-u-entry,.sl-home-dept-title,.night-heading")){child.hidden=true;child.classList.add("sl-u-legacy")}}
  if(!section.querySelector(":scope > .sl-u-entry"))section.append(entry())
 }
 const explore=app.querySelector(".sl-d-explore");
 if(explore&&!explore.querySelector(".sl-u-entry"))explore.append(entry(true));
 const active=document.querySelector(".bottom button.active");const activeText=(active?.dataset.navLabel||label(active)).toLowerCase();
 // Only target explicitly named unsigned views. Do not intercept unrelated navigation.
 if(activeText==="unsigned"){
  if(!app.querySelector(".sl-u-route")){const panel=make("section","sl-u-route");panel.append(entry());app.prepend(panel)}
 }else app.querySelector(".sl-u-route")?.remove();
}
let pending=false;function schedule(){if(!pending){pending=true;requestAnimationFrame(()=>{pending=false;mount()})}}
new MutationObserver(schedule).observe(app,{childList:true,subtree:true});
const nav=document.querySelector(".bottom");if(nav)new MutationObserver(schedule).observe(nav,{attributes:true,subtree:true,attributeFilter:["class"]});
schedule()
})()
