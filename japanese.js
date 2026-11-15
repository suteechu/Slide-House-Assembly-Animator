// Optional presentation skin. Original draw routines and image pixels stay intact.
export function installJapanese(app){
 if(app._japaneseInstalled)return;app._japaneseInstalled=true;app.japaneseTheme=true;
 const palette={'#f4f8f5':'#f7f5ef','#e0eee6':'#e8e6de','#2b8a6e':'#627d6b','#df7d4b':'#b95c45','#dc8454':'#b95c45','#203d32':'#233c4e','#243c34':'#233c4e','#60756b':'#707970','#d1e0d7':'#dedbd2','#b7d6c6':'#dad9cb','#cbded2':'#dedbd2'};
 const original=app.ctx,methods=new Map();
 app.ctx=new Proxy(original,{
  get(target,key){const val=Reflect.get(target,key,target);if(typeof val!=='function')return val;if(!methods.has(key))methods.set(key,val.bind(target));return methods.get(key);},
  set(target,key,value){if(app.japaneseTheme){if((key==='fillStyle'||key==='strokeStyle')&&typeof value==='string')value=palette[value.toLowerCase()]||value;if(key==='lineCap')value='round';if(key==='lineJoin')value='round';if(key==='shadowBlur')value=Math.min(Number(value),10);}return Reflect.set(target,key,value,target);}
 });
 const round=app.roundRect;
 app.roundRect=function(ctx,x,y,w,h,r){return round.call(this,ctx,x,y,w,h,this.japaneseTheme?Math.min(14,Math.max(5,r||0),w/2,h/2):r);};
 original.lineCap='round';original.lineJoin='round';
}
