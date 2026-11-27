"use strict";
const fs=require("node:fs"),vm=require("node:vm"),assert=require("node:assert/strict"),path=require("node:path");
class Node{
 constructor(tag){this.tagName=tag;this.children=[];this.className="";this.textContent="";this.hidden=false;this.classList={add:(name)=>{if(!this.className.split(" ").includes(name))this.className+=(this.className?" ":"")+name}}}
 append(...nodes){this.children.push(...nodes)}
 matches(selector){return selector.split(",").some(s=>s.startsWith(".")&&this.className.split(" ").includes(s.slice(1)))}
 querySelectorAll(selector){
  const direct=selector.startsWith(":scope > ");if(direct)selector=selector.slice(9);
  const children=this.children.filter(x=>x.matches(selector));
  return direct?children:[...children,...this.children.flatMap(x=>x.querySelectorAll(selector))];
 }
 querySelector(selector){return this.querySelectorAll(selector)[0]||null}
 prepend(n){this.children.unshift(n)}
}
const app=new Node("div"),home=new Node("div"),section=new Node("section"),heading=new Node("h2"),legacy=new Node("div"),other=new Node("section"),otherHead=new Node("h2"),explore=new Node("div");
home.className="night-home";section.className=other.className="night-section";heading.className=otherHead.className="night-heading";heading.textContent="Unsigned";otherHead.textContent="Discover more";explore.className="sl-d-explore";section.append(heading,legacy);other.append(otherHead);home.append(other,section);app.append(home,explore);
const document={getElementById:id=>id==="app"?app:null,createElement:tag=>new Node(tag),querySelector:()=>null};
let run;const ctx={document,URL,MutationObserver:class{constructor(fn){run=fn}observe(){}},requestAnimationFrame:fn=>fn()};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,"unsigned-entry.js"),"utf8"),ctx);
assert.ok(legacy.hidden);
assert.equal(other.hidden,false);
assert.equal(section.querySelectorAll(":scope > .sl-u-entry").length,1);
assert.equal(explore.querySelectorAll(".sl-u-entry").length,1);
run();run();
assert.equal(section.querySelectorAll(":scope > .sl-u-entry").length,1);
const anchors=section.querySelectorAll(".sl-u-link");
assert.deepEqual(anchors.map(a=>a.href),["https://sublevel-unsigned-xvpf.onrender.com/","https://sublevel-unsigned-xvpf.onrender.com/login","https://sublevel-unsigned-xvpf.onrender.com/join"]);
console.log("Unsigned navigation checks passed: correct destinations, preserved unrelated section, idempotent mount.");
