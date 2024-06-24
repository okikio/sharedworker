export function generateUniqueId(size = 16): string {
  // Ensure the size is a positive integer and convert it to a multiple of 4 (since we're using Uint32Array)
  const arraySize = Math.ceil(size / 4);

  // Generate cryptographically secure random values
  const arr = crypto.getRandomValues(new Uint8Array(arraySize * 4));

  // Convert the array to a Base64 string
  const base64Str = btoa(String.fromCharCode.apply(null, arr as unknown as number[]));

  // Trim the string to the desired size
  return base64Str.slice(0, size * 2); // Adjust length as needed
}

export function base64ToNumber(base64Str: string): number {
  const bytes = Uint8Array.from(atob(base64Str), char => char.charCodeAt(0));
  return bytes.reduce((num, byte) => (num << 8) | byte, 0);
}

export function compareIds(id1: string, id2: string): number {
  const num1 = base64ToNumber(id1);
  const num2 = base64ToNumber(id2);

  return num1 - num2;
}