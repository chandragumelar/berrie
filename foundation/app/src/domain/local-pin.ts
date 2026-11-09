/** Internal primitives only. A verifier is not authorization or an activation flow. */
export const PIN_ITERATIONS = 310_000;
export const MIN_ITERATIONS = 100_000;
export const MAX_ITERATIONS = 2_000_000;
export const LOCK_MS = 300_000;
export interface PinVerifier { version:1; algorithm:'PBKDF2-SHA256'; iterations:number; salt:string; hash:string }
const hex = (bytes:Uint8Array) => Array.from(bytes, b => b.toString(16).padStart(2,'0')).join('');
const unhex = (s:string) => new Uint8Array(s.match(/../g)!.map(x=>parseInt(x,16)));
export function validPin(pin:unknown):pin is string { return typeof pin==='string' && /^[0-9]{6}$/.test(pin); }
export function validateVerifier(value:unknown):asserts value is PinVerifier {
 if(!value || typeof value!=='object') throw new Error('Verifier tidak sah');
 const v=value as PinVerifier;
 if(v.version!==1 || v.algorithm!=='PBKDF2-SHA256' || !Number.isSafeInteger(v.iterations) || v.iterations<MIN_ITERATIONS || v.iterations>MAX_ITERATIONS || typeof v.salt!=='string' || !/^[0-9a-f]{32}$/.test(v.salt) || typeof v.hash!=='string' || !/^[0-9a-f]{64}$/.test(v.hash) || Object.keys(v).sort().join(',')!=='algorithm,hash,iterations,salt,version') throw new Error('Verifier tidak sah');
}
async function derive(pin:string,salt:string,iterations:number):Promise<Uint8Array> {
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(pin),'PBKDF2',false,['deriveBits']);
 return new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:unhex(salt),iterations},key,256));
}
export async function createPinVerifier(pin:string,iterations=PIN_ITERATIONS):Promise<PinVerifier> {
 if(!validPin(pin) || !Number.isSafeInteger(iterations) || iterations<MIN_ITERATIONS || iterations>MAX_ITERATIONS) throw new Error('PIN atau parameter tidak sah');
 const salt=hex(crypto.getRandomValues(new Uint8Array(16)));
 return {version:1,algorithm:'PBKDF2-SHA256',iterations,salt,hash:hex(await derive(pin,salt,iterations))};
}
export async function comparePin(pin:string,value:unknown):Promise<boolean> {
 if(!validPin(pin)) throw new Error('PIN tidak sah');
 validateVerifier(value);
 const actual=await derive(pin,value.salt,value.iterations), expected=unhex(value.hash);
 let diff=0; for(let i=0;i<actual.length;i++) diff |= actual[i]! ^ expected[i]!;
 return diff===0;
}
export function cooldownDuration(failures:number):number {
 if(!Number.isSafeInteger(failures) || failures<0) throw new Error('Counter tidak sah');
 return failures<5 ? 0 : Math.min(900_000,30_000 * 2 ** Math.min(5,Math.floor(failures/5)-1));
}
