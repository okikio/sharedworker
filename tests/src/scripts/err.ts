const isMainThread = 'SharedWorker' in globalThis;
console.log({ isMainThread })

class PrivateDataCloneError extends DOMException {
  constructor(...args) {
    super(...args);
  }
}

// Function to generate a unique identifier using the Crypto API
function generateUniqueId() {
  return crypto.randomUUID(); // Generates a UUID
}

// Function to generate a validation hash using the Crypto API
async function generateValidationHash(uniqueId, timestamp, secretKey) {
  const validationString = `${uniqueId}:${timestamp}:${secretKey}`;
  const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(validationString));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Retrieve the secret key from environment variable or generate a new one
const secretKey = "780bd0d1c87916f43c687a28c6bb6c210" ?? generateUniqueId();

// Create a BroadcastChannel
let bc = new BroadcastChannel('hello');

if (isMainThread) {
  new Worker(new URL(import.meta.url), { type: "module" });

  bc.onmessage = async (event) => {
    console.log(event.data, {
      instOf: event.data.privateErr instanceof DOMException
    });
    if (event.data.uniqueId && event.data.validationHash) {
      const validationHash = await generateValidationHash(event.data.uniqueId, event.data.timestamp, secretKey);
      if (validationHash === event.data.validationHash) {
        // Check if the message contains 'eval' or 'Function'
        if (event.data.stack && (/anonymous\@|eval|Function/.test(event.data.stack))) {
          console.log("Detected eval or Function usage");
        } else {
          console.log("No eval or Function usage detected");
        }
      } else {
        console.log("Message validation failed");
      }
    } else {
      console.log("Unrecognized message structure");
    }
  };
} else {
  // Use a self-invoking async function to handle the async nature within the Function context
  const code = `
    (async () => {
      bc = new BroadcastChannel('hello'); 
      const circularObj = { x() { return true; } }; 
      try {
        bc.postMessage(circularObj);

        // DOMException
      } catch (e) {
        const uniqueId = '${generateUniqueId()}';
        const timestamp = Date.now();
        const validationHash = await (async () => {
          const validationString = \`\${uniqueId}:\${timestamp}:${secretKey}\`;
          const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(validationString));
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        })();
        bc.postMessage({
          uniqueId: uniqueId, // Unique identifier for verification
          stack: e.stack,
          name: e.name,
          message: e.message,
          privateErr: new PrivateDataCloneError(e.message, e.name),
          location: 'Worker', // Additional context information
          timestamp: timestamp, // Timestamp for additional validation
          validationHash: validationHash // Validation hash for integrity check
        });
      }
    })();
  `;

  eval(code);
  new Function(code)();

  (async () => {
    bc = new BroadcastChannel('hello');
    const circularObj = { x() { return true; } };
    try {
      bc.postMessage(circularObj);
    } catch (e) {
      const uniqueId = `${generateUniqueId()}`;
      const timestamp = Date.now();

      const validationHash = await (async () => {
        const validationString = `${uniqueId}:${timestamp}:${secretKey}`;
        const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(validationString));
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      })();

      bc.postMessage({
        uniqueId: uniqueId, // Unique identifier for verification
        stack: e.stack,
        name: e.name,
        message: e.message,
        privateErr: new PrivateDataCloneError(e.message, e.name),
        location: 'Worker', // Additional context information
        timestamp: timestamp, // Timestamp for additional validation
        validationHash: validationHash // Validation hash for integrity check
      });
    }
  })();
}
