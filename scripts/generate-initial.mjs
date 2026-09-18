import {generateSQLiteDrizzleJson,generateSQLiteMigration} from 'drizzle-kit/api';
import * as schema from '../db/schema.ts';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
const folder=new URL('../drizzle/',import.meta.url);
try {const old=JSON.parse(await readFile(new URL('meta/_journal.json',folder),'utf8'));if(old.entries.length)throw Error('Initial migration already exists. Use drizzle-kit generate for subsequent changes.')} catch(e){if(e.code!=='ENOENT')throw e;}
const empty=await generateSQLiteDrizzleJson({});
const current=await generateSQLiteDrizzleJson(schema,empty.id);
current.prevId='00000000-0000-0000-0000-000000000000';
const statements=await generateSQLiteMigration(empty,current);
await mkdir(new URL('meta/',folder),{recursive:true});
await writeFile(new URL('0000_miguelitos.sql',folder),statements.join('\n--> statement-breakpoint\n')+'\n');
await writeFile(new URL('meta/0000_snapshot.json',folder),JSON.stringify(current,null,2));
await writeFile(new URL('meta/_journal.json',folder),JSON.stringify({version:'7',dialect:'sqlite',entries:[{idx:0,version:'6',when:Date.now(),tag:'0000_miguelitos',breakpoints:true}]},null,2));
console.log('Generated',statements.length,'schema statements.');

