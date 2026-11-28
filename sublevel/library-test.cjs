"use strict";
const fs=require("node:fs"),vm=require("node:vm"),assert=require("node:assert/strict"),path=require("node:path");
const src=fs.readFileSync(path.join(__dirname,"discovery.js"),"utf8");
const start=src.indexOf('}else if(mode==="journey"){'),end=src.indexOf('}else if(mode==="playlist"){',start);
assert.ok(start>=0&&end>start);
class Node{
 constructor(tag,cls,text){this.tag=tag;this.cls=cls;this.text=text||"";this.children=[];this.attrs={};this.events={}}
 append(...nodes){this.children.push(...nodes)}
 replaceChildren(...nodes){this.children=nodes}
 setAttribute(k,v){this.attrs[k]=v}
 addEventListener(k,v){this.events[k]=v}
}
const create=(...args)=>new Node(...args),button=(text,fn,cls)=>{const n=create("button",cls,text);n.click=fn;return n},link=(text,url,cls)=>{const n=create("a",cls,text);n.href=url;return n};
const content=create("main"),record={id:"test",title:"Test release"},state={saved:["test"],history:["test"],artists:["Test artist"],labels:["Test label"],wishlist:[]};
const listening={playlists:[{name:"Test playlist",ids:["test"]}]};
let selected,launched;
const context={create,button,link,content,state,listening,persistent:true,byId:id=>id==="test"?record:null,
 D:{profiles:[["Test artist","Test biography",null,["test"]]]},labelsData:[["Test label","https://example.org",["test"]]],
 titleBlock:(...args)=>content.append(create("h1",null,args[1])),section:text=>content.append(create("h2",null,text)),
 wishlistPanel:()=>create("section","sl-wishlist","Release Wishlist"),collectionStats:()=>create("div",null,"stats"),resumePanel:()=>null,personalized:()=>create("div",null,"recommendations"),
 playlistLibrary:()=>create("div",null,"playlist library"),shelf:()=>create("div",null,"record shelf"),catalogue:()=>create("div",null,"catalogue"),saveButton:()=>create("button",null,"save"),show:(mode,arg)=>{selected=[mode,arg]},render:(mode,arg)=>{selected=[mode,arg]},startListening:(id,list)=>{launched=[id,list]},confirm:()=>true,persist:()=>{}};
const run=vm.runInNewContext("(function(arg){"+src.slice(start+'}else if(mode==="journey"){'.length,end)+"})",context);
const all=(node)=>[node,...node.children.flatMap(all)];
for(const tab of ["overview","collection","wishlist","playlists","following","history","settings"]){
 content.replaceChildren();run(tab);const nodes=all(content);
 const active=nodes.filter(n=>n.cls==="sl-library-tab"&&n.attrs["aria-current"]==="page");
 assert.equal(active.length,1);
 assert.equal(nodes.filter(n=>n.cls==="sl-library-tab").length,7);
 if(tab==="overview"){assert.equal(nodes.filter(n=>n.cls==="sl-library-shortcut").length,5);nodes.find(n=>n.cls==="sl-library-shortcut").click();assert.deepEqual(selected,["journey","collection"])}
 if(tab==="wishlist"){assert.ok(nodes.some(n=>n.cls==="sl-wishlist"))}
 if(tab==="collection"){nodes.find(n=>n.text==="Start listening").click();assert.equal(launched[0],"test")}
 if(tab==="settings"){assert.ok(nodes.some(n=>n.text==="Export collection"));assert.ok(nodes.some(n=>n.text==="Import collection"));assert.ok(nodes.some(n=>n.href==="https://sublevel-unsigned-xvpf.onrender.com/login"))}
}
assert.deepEqual(state.saved,["test"]);assert.deepEqual(listening.playlists[0].ids,["test"]);
console.log("Personal library dashboard checks passed: all seven tabs, navigation shortcuts, saved queue, producer login and backup controls; existing state unchanged.");
