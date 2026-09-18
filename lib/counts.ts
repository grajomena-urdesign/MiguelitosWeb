export type SoldItem = {name:string;category:string;size:string;quantity:number};
export function serving(value:string){
 const options=[/\bcones?\b/i.test(value)?'Cone':'',/(?<!\d)8\s*(?:oz|0z|ounces?)\b/i.test(value)?'8oz':'',/(?<!\d)12\s*(?:oz|0z|ounces?)\b/i.test(value)?'12oz':''].filter(Boolean);
 return options.length===1?options[0]:'';
}
export function servingCounts(items:SoldItem[]){
 const counts=[{flavor:"Hershey's",Cone:0,'8oz':0,'12oz':0,total:0},{flavor:'Vanilla',Cone:0,'8oz':0,'12oz':0,total:0}];
 const other:SoldItem[]=[];
 for(const i of items){const text=i.name+' '+i.category;const h=/\bhershey(?:['’]?s)?\b/i.test(text),v=/\bvanilla\b|\bcrunchies\b/i.test(text);let size=serving(i.size);if(!size&&/^(|regular|cups?)$/i.test(i.size.trim()))size=serving(i.name);if(h===v||!size){other.push(i);continue}const row=counts[h?0:1];row[size as 'Cone'|'8oz'|'12oz']+=i.quantity;row.total+=i.quantity;}
 return {counts,other,total:counts.reduce((s,r)=>s+r.total,0)};
}
