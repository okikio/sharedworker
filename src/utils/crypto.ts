  // Private method to initialize the secret key
export async function initializeSecretKey() {
  return await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

// Private method to generate a validation hash
export async function generateValidationHash(secretKey: CryptoKey, uniqueId: string, timestamp: number): Promise <string> {
  const key = await exportKey(secretKey);
  const validationString = `${uniqueId}:${timestamp}:${key}`;

  const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(validationString));
  const hashArray = Array.from(new Uint8Array(hashBuffer), b => {
    return b.toString(16).padStart(2, '0')
  });

  return hashArray.join('');
}

  // Private method to export the key as a string
export async function exportKey(secretKey: CryptoKey): Promise <string> {
  const exported = await crypto.subtle.exportKey('raw', secretKey);
  return btoa(String.fromCharCode(...new Uint8Array(exported)));
}

  // Private method to encrypt a message
export async function encryptMessage(message: string, secretKey: CryptoKey): Promise < string > {
  const encodedMessage = new TextEncoder().encode(message);
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: new Uint8Array(12) },
    secretKey,
    encodedMessage
  );

  return btoa(String.fromCharCode(...new Uint8Array(encryptedBuffer)));
}

  // Private method to decrypt a message
export async function decryptMessage(encryptedMessage: string, secretKey: CryptoKey): Promise < string > {
  const encryptedBuffer = Uint8Array.from(atob(encryptedMessage), c => c.charCodeAt(0));
  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(12) },
    secretKey,
    encryptedBuffer
  );

  return new TextDecoder().decode(decryptedBuffer);
}

  // Public method to send a message
export async function createMessage(message: string | null, secretKey: CryptoKey) {
  const uniqueId = crypto.randomUUID();
  const timestamp = Date.now();

  const validationHash = await generateValidationHash(secretKey, uniqueId, timestamp);
  const encryptedMessage = await encryptMessage(message ?? "", secretKey);

  return {
    uniqueId, // Unique identifier for verification
    timestamp, // Timestamp for additional validation
    validationHash, // Validation hash for integrity check
    encryptedMessage, // Encrypted Message
  };
}