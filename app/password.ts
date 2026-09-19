const encoder = new TextEncoder();

function toBase64(bytes: Uint8Array) {
  let value = "";
  for (const byte of bytes) value += String.fromCharCode(byte);
  return btoa(value);
}

function fromBase64(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}

async function derive(password: string, salt: Uint8Array, iterations: number) {
  const material = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt,
      iterations,
    },
    material,
    256,
  );

  return new Uint8Array(bits);
}

export async function hashPassword(password: string) {
  if (password.length < 8 || password.length > 128) {
    throw new Error("Password must be 8 to 128 characters.");
  }

  const iterations = 210000;
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(password, salt, iterations);

  return `pbkdf2-sha256$${iterations}$${toBase64(salt)}$${toBase64(hash)}`;
}

export async function verifyPassword(password: string, stored: string) {
  try {
    const [algorithm, count, saltText, hashText] = stored.split("$");
    if (algorithm !== "pbkdf2-sha256") return false;

    const iterations = Number(count);
    if (!Number.isSafeInteger(iterations) || iterations < 100000) return false;

    const expected = fromBase64(hashText);
    const actual = await derive(password, fromBase64(saltText), iterations);

    if (actual.length !== expected.length) return false;

    let difference = 0;
    for (let i = 0; i < actual.length; i++) {
      difference |= actual[i] ^ expected[i];
    }

    return difference === 0;
  } catch {
    return false;
  }
}
