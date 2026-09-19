import {servingCounts} from '@/lib/counts';
import {NextRequest,NextResponse} from 'next/server';
import {actor,admin,q,db,state,checkout,num,str,now} from '@/lib/store';
import {hashPassword} from '@/app/password';
export const dynamic='force-dynamic';
export async function GET(request:NextRequest){try{const user=await actor();return NextResponse.json(await state(user),{headers:{'Cache-Control':'no-store'}})}catch(e){return NextResponse.json({error:(e as Error).message},{status:403})}}
export async function POST(request:NextRequest){try{
 if(request.headers.get('origin')!==new URL(request.url).origin)throw Error('Reload this page before saving.');
 const user=await actor();const b:any=await request.json();if(!b||typeof b!=="object")throw Error("Invalid request.");
 if(b.action==='checkout')return NextResponse.json({sale:await checkout(user,b)});
 if(b.action==='receipt'){const sale=await q('SELECT * FROM sales WHERE id=?',str(b.id)).first<any>();if(!sale||(user.role!=='Admin'&&sale.cashier_email!==user.email))throw Error('Receipt unavailable.');return NextResponse.json({sale})}
 admin(user);
 if(b.action==='product'){
  const p=b.product,id=p.id?str(p.id):crypto.randomUUID(),sku=str(p.sku).toUpperCase(),name=str(p.name);if(!sku||!name)throw Error('SKU and product name are required.');
  const price=num(p.price),stock=num(p.stock,0,1000000),reorder=num(p.reorder,0,1000000),category=str(p.category||''),size=str(p.size||''),active=p.active?1:0;const date=now();
  const statements:any[]=[];
  if(p.id){const old=await q('SELECT * FROM products WHERE id=?',id).first<any>();if(!old)throw Error('Product not found.');statements.push(q('INSERT INTO guards(id,ok) SELECT ?,CASE WHEN EXISTS(SELECT 1 FROM products WHERE id=? AND version=?) THEN 1 ELSE 0 END',id+'-edit',id,num(p.version,1)));statements.push(q('UPDATE products SET sku=?,name=?,category=?,size=?,price=?,stock=?,reorder=?,active=?,version=version+1 WHERE id=?',sku,name,category,size,price,stock,reorder,active,id));if(old.stock!==stock)statements.push(q('INSERT INTO movements VALUES(?,?,?,?,?,?,?)',crypto.randomUUID(),id,'Product edit',stock-old.stock,date,user.name,'Stock set in Products'));statements.push(q('DELETE FROM guards WHERE id=?',id+'-edit'));
  }else{statements.push(q('INSERT INTO products(id,sku,name,category,size,price,stock,reorder,active) VALUES(?,?,?,?,?,?,?,?,?)',id,sku,name,category,size,price,stock,reorder,active));if(stock)statements.push(q('INSERT INTO movements VALUES(?,?,?,?,?,?,?)',crypto.randomUUID(),id,'Opening',stock,date,user.name,'Opening stock'))}
  await db().batch(statements);return NextResponse.json({id});
 }
 if(b.action==='delete'){const id=str(b.id);const n:any=await q('SELECT (SELECT COUNT(*) FROM items WHERE product_id=?)+(SELECT COUNT(*) FROM movements WHERE product_id=?) AS n',id,id).first();if(n.n){await q('UPDATE products SET active=0,version=version+1 WHERE id=?',id).run();return NextResponse.json({message:'Product deactivated. Its history is preserved.'})}await q('DELETE FROM products WHERE id=?',id).run();return NextResponse.json({message:'Product deleted.'})}
 if(b.action==='stock'){const id=str(b.id),quantity=num(Math.abs(b.quantity),1,1000000)*Math.sign(b.quantity),remarks=str(b.remarks);if(!remarks)throw Error('Remarks are required.');await db().batch([q('INSERT INTO guards(id,ok) SELECT ?,CASE WHEN EXISTS(SELECT 1 FROM products WHERE id=? AND stock+?>=0) THEN 1 ELSE 0 END',id+'-stock',id,quantity),q('UPDATE products SET stock=stock+?,version=version+1 WHERE id=?',quantity,id),q('INSERT INTO movements VALUES(?,?,?,?,?,?,?)',crypto.randomUUID(),id,quantity>0?'Stock In':'Stock Out',quantity,now(),user.name,remarks),q('DELETE FROM guards WHERE id=?',id+'-stock')]);return NextResponse.json({ok:true})}
 if(b.action==='history')return NextResponse.json({rows:(await q('SELECT m.*,p.name FROM movements m JOIN products p ON p.id=m.product_id WHERE product_id=? ORDER BY date DESC LIMIT 500',str(b.id)).all()).results});
 if(b.action==='reports'){const a=str(b.from,30),z=str(b.to,30);if(!/^\d{4}-\d{2}-\d{2}$/.test(a)||!/^\d{4}-\d{2}-\d{2}$/.test(z)||a>z)throw Error('Choose a valid date range.');const from=a+'T00:00:00+08:00',to=z+'T23:59:59.999+08:00';const rows=(await q('SELECT id,receipt,date,cashier,payment,total FROM sales WHERE julianday(date)>=julianday(?) AND julianday(date)<=julianday(?) ORDER BY date DESC',from,to).all()).results;const best=(await q('SELECT i.name,SUM(i.quantity) quantity,SUM(i.net) revenue FROM items i JOIN sales s ON s.id=i.sale_id WHERE julianday(s.date)>=julianday(?) AND julianday(s.date)<=julianday(?) GROUP BY i.product_id,i.name ORDER BY quantity DESC',from,to).all()).results;const sold=(await q('SELECT i.name,i.category,i.size,SUM(i.quantity) quantity FROM items i JOIN sales s ON s.id=i.sale_id WHERE julianday(s.date)>=julianday(?) AND julianday(s.date)<=julianday(?) GROUP BY i.name,i.category,i.size',from,to).all()).results;return NextResponse.json({rows,best,...servingCounts(sold as any)})}
 if(b.action==='members'){return NextResponse.json({rows:(await q("SELECT user_id,username,name,role,active,CASE WHEN password_hash IS NOT NULL THEN 1 ELSE 0 END AS has_password FROM members ORDER BY name").all()).results})}
 if(b.action==='member'){
  const username=str(b.username,32).toLowerCase(),name=str(b.name),role=str(b.role),password=typeof b.password==='string'?b.password:'',active=b.active?1:0;
  if(!/^[a-z0-9][a-z0-9._-]{2,31}$/.test(username))throw Error('Username must be 3 to 32 characters using letters, numbers, dot, dash or underscore.');
  if(!name||!['Admin','Cashier'].includes(role))throw Error('Enter a name and valid role.');
  const duplicate=await q('SELECT user_id FROM members WHERE username=? COLLATE NOCASE AND (user_id IS NULL OR user_id<>?)',username,typeof b.user_id==='string'?b.user_id:'').first<any>();
  if(duplicate)throw Error('That username is already in use.');
  if(b.user_id){
   const id=str(b.user_id);
   const target=await q('SELECT * FROM members WHERE user_id=?',id).first<any>();
   if(!target)throw Error('User not found.');
   if(id===user.user_id&&(!active||role!=='Admin'))throw Error('You cannot deactivate or demote your signed-in account.');
   if(password){const passwordHash=await hashPassword(password);await q('UPDATE members SET username=?,name=?,role=?,active=?,password_hash=? WHERE user_id=?',username,name,role,active,passwordHash,id).run();}
   else{await q('UPDATE members SET username=?,name=?,role=?,active=? WHERE user_id=?',username,name,role,active,id).run();}
  }else{
   if(!password)throw Error('Enter a password for the new user.');
   const id=crypto.randomUUID(),email=`pos-${id}@local.invalid`,passwordHash=await hashPassword(password);
   await q('INSERT INTO members(email,user_id,name,role,active,username,password_hash) VALUES(?,?,?,?,?,?,?)',email,id,name,role,active,username,passwordHash).run();
  }
  return NextResponse.json({ok:true});
 }
 if(b.action==='settings'){const s=b.settings,name=str(s.name);if(!name)throw Error('Store name is required.');await q('UPDATE settings SET name=?,address=?,contact=?,tax=?,footer=? WHERE id=1',name,str(s.address,500),str(s.contact),num(s.tax,0,10000),str(s.footer,500)).run();return NextResponse.json({ok:true})}
 throw Error('Unknown action.');
}catch(e){console.error('POS request failed',e);const msg=(e as Error).message;return NextResponse.json({error:/UNIQUE/.test(msg)?'That SKU or record already exists.':/CHECK|constraint/.test(msg)?'The record changed or stock is insufficient. Refresh and try again.':msg},{status:(e as any).status===503?503:400})}}






