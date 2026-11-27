/* Pure listening session helpers shared by the UI and regression tests. */
(function(root){
"use strict";
const unique=(ids,valid)=>Array.isArray(ids)?[...new Set(ids.filter(id=>typeof id==="string"&&valid.has(id)))].slice(0,200):[];
function session(raw,valid){
 const ids=unique(raw?.ids,valid);
 return {ids,current:ids.includes(raw?.current)?raw.current:ids[0]||null};
}
function sanitize(raw,valid){
 const seen=new Set(),playlists=[];
 for(const p of (Array.isArray(raw?.playlists)?raw.playlists:[])){
  if(!p||typeof p.name!=="string")continue;
  const name=p.name.trim().slice(0,60),key=name.toLowerCase();
  if(!name||seen.has(key))continue;
  seen.add(key);playlists.push({name,ids:unique(p.ids,valid)});if(playlists.length>=50)break;
 }
 return {session:session(raw?.session,valid),playlists};
}
function addNext(s,id,valid){
 if(!valid.has(id)||id===s.current)return session(s,valid);
 const ids=s.ids.filter(x=>x!==id),at=ids.indexOf(s.current);
 ids.splice(at<0?ids.length:at+1,0,id);return session({ids,current:s.current||id},valid)
}
function remove(s,id,valid){
 const at=s.ids.indexOf(id),ids=s.ids.filter(x=>x!==id);
 return session({ids,current:s.current===id?ids[Math.min(at,ids.length-1)]:s.current},valid)
}
function reorder(s,id,delta,valid){
 const ids=[...s.ids],at=ids.indexOf(id),to=at+delta;
 if(at>=0&&to>=0&&to<ids.length)[ids[at],ids[to]]=[ids[to],ids[at]];
 return session({ids,current:s.current},valid)
}
function shuffleRemaining(s,valid,random=Math.random){
 const at=s.ids.indexOf(s.current);if(at<0)return session(s,valid);
 const tail=s.ids.slice(at+1);for(let i=tail.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[tail[i],tail[j]]=[tail[j],tail[i]]}
 return session({ids:[...s.ids.slice(0,at+1),...tail],current:s.current},valid)
}
function merge(a,b,valid){
 const result=sanitize(a,valid),incoming=sanitize(b,valid);
 for(const p of incoming.playlists){const old=result.playlists.find(x=>x.name.toLowerCase()===p.name.toLowerCase());if(old)old.ids=unique([...old.ids,...p.ids],valid);else if(result.playlists.length<50)result.playlists.push(p)}
 if(!result.session.ids.length)result.session=incoming.session;
 return result
}
const api={session,sanitize,addNext,remove,reorder,shuffleRemaining,merge};
 if(typeof module==="object"&&module.exports)module.exports=api;else root.SUBLEVELListening=Object.freeze(api);
})(globalThis);
