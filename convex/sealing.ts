const nonceLength = 12;

async function readKey(): Promise<CryptoKey> {
  const encodedKey = process.env.CREDENTIAL_KEY;
  if (!encodedKey) throw new Error('CREDENTIAL_KEY is not set');
  const rawKey = Uint8Array.from(atob(encodedKey), (character) => character.charCodeAt(0));
  return crypto.subtle.importKey('raw', rawKey, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function fromBase64(text: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(text), (character) => character.charCodeAt(0));
}

export async function seal(plainText: string): Promise<string> {
  const key = await readKey();
  const nonce = crypto.getRandomValues(new Uint8Array(nonceLength));
  const cipherText = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce },
    key,
    new TextEncoder().encode(plainText)
  );
  const sealed = new Uint8Array(nonceLength + cipherText.byteLength);
  sealed.set(nonce);
  sealed.set(new Uint8Array(cipherText), nonceLength);
  return toBase64(sealed);
}

export async function unseal(sealedText: string): Promise<string> {
  const key = await readKey();
  const sealed = fromBase64(sealedText);
  const plainText = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: sealed.slice(0, nonceLength) },
    key,
    sealed.slice(nonceLength)
  );
  return new TextDecoder().decode(plainText);
}
