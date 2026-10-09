// Date inputs represent the store's wall clock, independent of the browser zone.
export function dateInputValue(timestamp:number,zone:string):string {
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(timestamp);
 const part=(key:string)=>parts.find(x=>x.type===key)!.value;
 return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}`;
}
export function dateInputTimestamp(value:string,zone:string):number {
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))throw Error('Lengkapi tanggal dan jam.');
 const wall=Date.parse(value+'Z');if(!Number.isFinite(wall))throw Error('Tanggal atau jam tidak sah.');
 let timestamp=wall;
 for(let i=0;i<3;i++)timestamp+=wall-Date.parse(dateInputValue(timestamp,zone)+'Z');
 if(dateInputValue(timestamp,zone)!==value)throw Error('Tanggal atau jam tidak sah di zona toko.');
 return timestamp;
}
