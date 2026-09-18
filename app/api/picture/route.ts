import {NextRequest,NextResponse} from 'next/server';
import {actor,admin,q,bucket} from '@/lib/store';
export const dynamic='force-dynamic';
export async function GET(request:NextRequest){try{await actor();const id=request.nextUrl.searchParams.get('id')||'';const p=await q('SELECT image FROM products WHERE id=?',id).first<any>();if(!p?.image)return new Response(null,{status:404});const file=await bucket().get(p.image);if(!file)return new Response(null,{status:404});return new Response(file.body,{headers:{'Content-Type':file.httpMetadata?.contentType||'image/png','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}})}catch{return new Response(null,{status:403})}}
export async function POST(request:NextRequest){try{
 if(request.headers.get('origin')!==new URL(request.url).origin)throw Error('Reload before uploading.');admin(await actor());
 const id=request.nextUrl.searchParams.get('id')||'';const p=await q('SELECT image FROM products WHERE id=?',id).first<any>();if(!p)throw Error('Save the product first.');
 const reader=request.body?.getReader();if(!reader)throw Error('Choose a picture.');let length=0;const chunks:Uint8Array[]=[];
 while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>5*1024*1024){await reader.cancel();throw Error('Picture must be under 5 MB.')}chunks.push(value)}
 const bytes=new Uint8Array(length);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length}
 const png=bytes.length>8&&[137,80,78,71,13,10,26,10].every((n,i)=>bytes[i]===n),jpg=bytes.length>3&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
 if(!png&&!jpg)throw Error('Choose a PNG or JPG picture.');const key='products/'+crypto.randomUUID();await bucket().put(key,bytes,{httpMetadata:{contentType:png?'image/png':'image/jpeg'}});
 try{await q('UPDATE products SET image=?,version=version+1 WHERE id=?',key,id).run()}catch(e){await bucket().delete(key);throw e}
 if(p.image)await bucket().delete(p.image).catch(()=>{});return NextResponse.json({ok:true});
 }catch(e){return NextResponse.json({error:(e as Error).message},{status:400})}}
