const express=require('express');
const crypto=require('crypto');
const AdmZip=require('adm-zip');
const path=require('path');
const app=express();
const PORT=process.env.PORT||8080;
const KEY=Buffer.from('62357168683873614a38556c444a557a545a5864325467366d626f3857386e35','hex');
app.use(express.raw({type:'application/octet-stream',limit:'100mb'}));
app.post('/api/decrypt',(req,res)=>{
 try{
  let b=req.body;if(!Buffer.isBuffer(b)||!b.length) throw new Error('Empty upload');
  if(b.length%16!==0) throw new Error('Encrypted profile length is not a multiple of 16 bytes');
  const d=crypto.createDecipheriv('aes-256-ecb',KEY,null);d.setAutoPadding(false);
  let out=Buffer.concat([d.update(b),d.final()]);
  let end=out.length;while(end&&out[end-1]===0)end--;out=out.subarray(0,end);
  let text;
  if(out[0]===0x50&&out[1]===0x4b){
    const zip=new AdmZip(out);const entry=zip.getEntries().find(e=>!e.isDirectory&&(e.entryName==='profile'||e.entryName.endsWith('/profile')||e.entryName==='profile.json'||e.entryName.endsWith('/profile.json')))||zip.getEntries().find(e=>!e.isDirectory);
    if(!entry)throw new Error('No profile entry found in decrypted ZIP');text=entry.getData().toString('utf8');
  } else text=out.toString('utf8');
  const json=JSON.parse(text);res.json(json);
 }catch(e){res.status(400).json({error:e.message});}
});
app.use(express.static(path.join(__dirname,'public')));
app.listen(PORT,'0.0.0.0',()=>console.log(`Dreamlight Save Suite: http://localhost:${PORT}`));
