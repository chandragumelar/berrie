export type Cell=string|number|null;
function cell(value:Cell):string {
 if(value===null) return '';
 if(typeof value==='number') {if(!Number.isSafeInteger(value)) throw new Error('Angka CSV tidak aman');return String(value);}
 // Spreadsheet programs may ignore whitespace/control characters before a formula.
 const first=[...value].find(ch=>ch.charCodeAt(0)>31 && !/\s/u.test(ch));
 const protectedText=first && '=+-@'.includes(first)?`'${value}`:value;
 return `"${protectedText.replaceAll('"','""')}"`;
}
export function csv(rows:Cell[][]):string {return '\ufeff'+rows.map(row=>row.map(cell).join(',')).join('\r\n')+'\r\n';}
