import crypto from "crypto"

const ALGORITHM = "aes-256-cbc"

function getEncryptionKey(): Buffer {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || "fallback-gym-powerhouse-secret-key"
  return crypto.createHash("sha256").update(secret).digest()
}

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16)
  const key = getEncryptionKey()
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  let encrypted = cipher.update(text, "utf8", "hex")
  encrypted += cipher.final("hex")
  return `${iv.toString("hex")}:${encrypted}`
}

export function decrypt(encryptedText: string): string {
  const [ivHex, encrypted] = encryptedText.split(":")
  if (!ivHex || !encrypted) {
    throw new Error("Invalid encrypted format")
  }
  const iv = Buffer.from(ivHex, "hex")
  const key = getEncryptionKey()
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  let decrypted = decipher.update(encrypted, "hex", "utf8")
  decrypted += decipher.final("utf8")
  return decrypted
}
