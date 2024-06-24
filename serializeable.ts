class SerializableDOMException extends DOMException {
  constructor(message?: string, name?: string) {
    super(message, name);
  }

  toJSON() {
    return {
      name: this.name || "Error",
      message: this.message || "",
      code: this.code ?? DOMException.DATA_CLONE_ERR,
      stack: this.stack,
    };
  }

  static fromJSON(json: { name: string, message: string, code: number, stack: string }) {
    const { name, message, code, stack } = json;
    const error = new SerializableDOMException(message, name);
    // Setting code is not straightforward since it's read-only in the standard DOMException
    // You might need a workaround if you need to use the code property.
    Object.defineProperty(error, 'code', {
      value: code,
      enumerable: true,
      configurable: true,
      writable: true,
    });
    error.stack = stack;
    return error;
  }
}

// Example usage:
try {
  console.log(structuredClone({ x: new SerializableDOMException('This is a DataCloneError', 'DataCloneError') }))
  throw new SerializableDOMException("This is a test error", "DataCloneError");
} catch (error) {
  if (error instanceof SerializableDOMException) {
    const serialized = JSON.stringify(error);
    console.log(serialized);

    const deserialized = SerializableDOMException.fromJSON(JSON.parse(serialized));
    console.log(deserialized);
  }
}
