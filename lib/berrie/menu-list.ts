import {combinationLabel} from './menu-variables.ts';
import type {Channel} from './domain.ts';
import type {MenuRow} from './workshop.ts';

export type SaleStatus = 'Dijual'|'Tidak dijual'|'Sebagian dijual';
export interface MenuGroup {id:string; name:string; rows:MenuRow[]; category:string; status:SaleStatus; minPrice:number; maxPrice:number;}

export function menuGroups(rows:MenuRow[]):MenuGroup[] {
 const groups = new Map<string,MenuRow[]>();
 for (const row of rows) if (!row.archived) groups.set(row.group,[...(groups.get(row.group)??[]),row]);
 return [...groups].map(([id,members])=>{
  const categories=new Set(members.map(row=>row.category));
  const selling=members.filter(row=>row.available).length;
  const prices=members.map(row=>Number(row.price));
  return {id,name:members[0].name,rows:members,category:categories.size===1?members[0].category:'Beragam',status:selling===members.length?'Dijual':selling===0?'Tidak dijual':'Sebagian dijual',minPrice:Math.min(...prices),maxPrice:Math.max(...prices)};
 });
}

export function filterMenuGroups(groups:MenuGroup[],query:string,category:string,status:string):MenuGroup[] {
 const term=query.trim().toLocaleLowerCase('id');
 return groups.filter(group=>(!term||group.rows.some(row=>`${row.name} ${combinationLabel(row.variables??[],row.variableValues??{})}`.toLocaleLowerCase('id').includes(term)))&&(!category||group.rows.some(row=>row.category===category))&&(!status||group.status===status));
}

export type BulkMenuChange = {kind:'category';value:string}|{kind:'status';value:boolean}|{kind:'discount';channel:Channel;value:string};
export function replaceMenuDraft(rows:MenuRow[],group:string,replacement:MenuRow[]):MenuRow[] {
 if(replacement.some(row=>row.group!==group))throw Error('Grup menu tidak cocok.');
 const index=rows.findIndex(row=>row.group===group);
 const others=rows.filter(row=>row.group!==group);
 others.splice(index<0?0:index,0,...replacement);
 return others;
}
export function bulkMenuDraft(rows:MenuRow[],groups:string[],change:BulkMenuChange):MenuRow[] {
 const selected=new Set(groups);
 return rows.map(row=>{
  if(row.archived||!selected.has(row.group))return row;
  if(change.kind==='category')return {...row,category:change.value};
  if(change.kind==='status')return {...row,available:change.value};
  return {...row,discountAssignments:{...row.discountAssignments,[change.channel]:change.value}};
 });
}
