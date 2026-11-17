import { generateKeyPairSync } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const {privateKey,publicKey}=generateKeyPairSync('ec',{namedCurve:'prime256v1'});
const privateJwk=privateKey.export({format:'jwk'}), publicJwk=publicKey.export({format:'jwk'});
// Refuse overwrite so a previously issued permit is never silently invalidated.
writeFileSync(resolve(root,'.env.local'),`BERRIE_PERMIT_KEY_ID=local-dev\nBERRIE_PERMIT_PRIVATE_JWK=${JSON.stringify(privateJwk)}\nBERRIE_ALLOWED_ORIGINS=http://127.0.0.1:5173,http://localhost:5173\n`,{flag:'wx',mode:0o600});
writeFileSync(resolve(root,'permit-public.local.json'),JSON.stringify({'local-dev':publicJwk}),{flag:'wx',mode:0o600});
console.log('Kunci tersimpan di supabase/.env.local dan supabase/permit-public.local.json.');
