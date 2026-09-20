import {env} from 'cloudflare:workers';
import {getPosUser} from '@/app/pos-auth';
export function db(){if(!env.DB)throw validation('Database is unavailable. Please try again.');return env.DB}
export function bucket(){if(!env.BUCKET)throw validation('Picture storage is unavailable.');return env.BUCKET}
export const q=(sql:string,...args:any[])=>db().prepare(sql).bind(...args);
export async function actor(){
 const user=await getPosUser();if(!user)throw validation('Sign in to continue.');
 const email=user.email.toLowerCase();
 // Bootstrap only the verified Site owner, never an arbitrary first visitor.
 if(user.userId==='pos_admin'){
  await q("INSERT INTO members(email,user_id,name,role,active) SELECT ?,?,?,'Admin',1 WHERE NOT EXISTS(SELECT 1 FROM members)",email,user.userId,user.displayName).run();
 }
 let member=await q('SELECT * FROM members WHERE user_id=?',user.userId).first<any>();
 if(!member){await q('UPDATE members SET user_id=? WHERE email=? AND user_id IS NULL AND active=1',user.userId,email).run();member=await q('SELECT * FROM members WHERE user_id=?',user.userId).first<any>();}
 if(!member?.active)throw validation('Your account has not been granted access. Contact the administrator.');
 return {...member,email:member.email};
}
export function admin(user:any){if(user.role!=='Admin')throw validation('Administrator access is required.')}
export function num(v:any,min=0,max=100000000){if(typeof v!=='number'||!Number.isSafeInteger(v)||v<min||v>max)throw validation('Enter a valid number.');return v}
export function str(v:any,max=180){if(typeof v!=='string'||v.length>max)throw validation('Invalid text.');return v.trim()}
export const now=()=>new Date().toISOString();
export const money=(c:number)=>new Intl.NumberFormat('en-PH',{style:'currency',currency:'PHP'}).format(c/100);
export async function setup(){await q("INSERT OR IGNORE INTO settings(id,name,address,contact,tax,footer) VALUES(1,'Miguelitos Ice Cream','','',0,'Thank you for buying at Miguelitos Ice Cream!')").run()}
export async function state(user:any){await setup();const [p,s]=await Promise.all([q(user.role==='Admin'?'SELECT * FROM products ORDER BY name':'SELECT * FROM products WHERE active=1 ORDER BY name').all(),q('SELECT * FROM settings WHERE id=1').first()]);return {user,products:p.results,settings:s}}
function validation(message:string){return Object.assign(new Error(message),{status:400})}
export async function checkout(user:any,b:any){
 try{return await checkoutInner(user,b)}catch(e:any){
  if(e.status===400)throw e;
  throw Object.assign(new Error('Could not confirm the sale. Retry this same order to check its saved status.'),{status:503});
 }
}
async function checkoutInner(user:any,b:any){
 const id=str(b.id,60);if(!/^[a-f0-9-]{36}$/.test(id))throw validation('Invalid order identifier.');
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify({...b,id:undefined}))))).map(n=>n.toString(16).padStart(2,'0')).join('');
 const old=await q('SELECT * FROM sales WHERE id=?',id).first<any>();if(old){if(old.request_hash!==hash||old.cashier_email!==user.email)throw validation('Order ID already used. Start a new order.');return old}
 if(!Array.isArray(b.items)||!b.items.length||b.items.length>100)throw validation('Add 1–100 products to the cart.');
 const seen=new Set();const lines:any[]=[];
 for(const item of b.items){const pid=str(item.id,100);if(seen.has(pid))throw validation('Duplicate cart item.');seen.add(pid);const p=await q('SELECT * FROM products WHERE id=?',pid).first<any>();const qty=num(item.quantity,1,100000),percent=num(item.percent,0,10000);if(!p?.active||p.stock<qty)throw validation(`Insufficient stock: ${p?.name||pid}`);if(p.price!==item.price)throw validation(`Price changed for ${p.name}. Remove and add it again.`);const gross=p.price*qty;const discount=Math.round(gross*percent/10000);lines.push({...p,quantity:qty,percent,discount,gross,net:gross-discount})}
 const setting:any=await q('SELECT * FROM settings WHERE id=1').first();
 const subtotal=lines.reduce((s,i)=>s+i.gross,0),itemDiscount=lines.reduce((s,i)=>s+i.discount,0),extra=num(b.discount,0,subtotal-itemDiscount),discount=extra+itemDiscount,tax=Math.round((subtotal-discount)*setting.tax/10000),total=subtotal-discount+tax;
 if(!['Cash','GCash','Card'].includes(b.payment))throw validation('Choose a payment method.');const received=b.payment==='Cash'?num(b.received,0,1000000000000):total;if(received<total)throw validation('Cash received is insufficient.');
 const type=str(b.discountType||'',30),customerName=str(b.customerName||''),customerId=str(b.customerId||'',80);if(lines.some(i=>i.percent>0)||type){if(!['PWD','Senior Citizen'].includes(type)||!customerName||!customerId)throw validation('Select PWD or Senior Citizen and enter the name and ID number.')}else if(customerName||customerId)throw validation('Select the discount type or clear customer details.');
 const date=now(),receipt='MIG-'+date.slice(0,10).replaceAll('-','')+'-'+id.slice(0,8).toUpperCase();
 const text=[setting.name.toUpperCase(),setting.address,setting.contact,...(setting.tin?[`TIN: ${setting.tin}`]:[]),`Receipt: ${receipt}`,new Date(date).toLocaleString('en-PH',{timeZone:'Asia/Manila'}),`Cashier: ${user.name}`,'--------------------------------',...lines.flatMap(i=>[`${i.name} / ${i.size}`,`${i.quantity} × ${money(i.price)} = ${money(i.gross)}`,...(i.percent?[`Discount ${i.percent/100}%: -${money(i.discount)} · Net ${money(i.net)}`]:[])]),'--------------------------------',`Subtotal: ${money(subtotal)}`,`Discount: ${money(discount)}`,`Tax: ${money(tax)}`,`TOTAL: ${money(total)}`,`Payment: ${b.payment}`,...(b.payment==='Cash'?[`Cash: ${money(received)}`,`Change: ${money(received-total)}`]:[]),...(type?['',`Discount type: ${type}`,`Name: ${customerName}`,`ID number: ${customerId}`]:[]),'',setting.footer].join('\n');
 const statements:any[]=[];for(const i of lines)statements.push(q('INSERT INTO guards(id,ok) SELECT ?,CASE WHEN EXISTS(SELECT 1 FROM products WHERE id=? AND active=1 AND stock>=? AND price=? AND version=?) THEN 1 ELSE 0 END',id+'-'+i.id,i.id,i.quantity,i.price,i.version));
 statements.push(q('INSERT INTO guards(id,ok) SELECT ?,CASE WHEN EXISTS(SELECT 1 FROM settings WHERE id=1 AND tax=?) AND EXISTS(SELECT 1 FROM members WHERE email=? AND active=1) THEN 1 ELSE 0 END',id+'-settings',setting.tax,user.email));
 statements.push(q('INSERT INTO sales(id,receipt,date,cashier,cashier_email,subtotal,discount,tax,total,payment,received,change_amount,discount_type,customer_name,customer_id,receipt_text,request_hash) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',id,receipt,date,user.name,user.email,subtotal,discount,tax,total,b.payment,received,received-total,type,customerName,customerId,text,hash));
 for(const i of lines){statements.push(q('INSERT INTO items(id,sale_id,product_id,name,category,size,quantity,price,percent,discount,net) VALUES(?,?,?,?,?,?,?,?,?,?,?)',crypto.randomUUID(),id,i.id,i.name,i.category,i.size,i.quantity,i.price,i.percent,i.discount,i.net));statements.push(q('UPDATE products SET stock=stock-?,version=version+1 WHERE id=?',i.quantity,i.id));statements.push(q('INSERT INTO movements VALUES(?,?,?,?,?,?,?)',crypto.randomUUID(),i.id,'Sale',-i.quantity,date,user.name,receipt))}
 statements.push(q("DELETE FROM guards WHERE id LIKE ?",id+'%'));
 try{await db().batch(statements)}catch(error){let retry:any;try{retry=await q('SELECT * FROM sales WHERE id=?',id).first<any>()}catch{throw Object.assign(Error('Sale status is uncertain. Retry this same order.'),{status:503})}if(retry?.request_hash===hash&&retry.cashier_email===user.email)return retry;if(!/CHECK|constraint|UNIQUE/i.test(String(error)))throw Object.assign(new Error('Sale status is uncertain. Retry this same order.'),{status:503});throw validation('Stock or settings changed, or the sale could not be saved. Refresh and try again. Nothing was charged by this app.')}
 try{return await q('SELECT * FROM sales WHERE id=?',id).first()}catch{throw Object.assign(Error('Sale status is uncertain. Retry this same order to recover its receipt.'),{status:503})}
}






