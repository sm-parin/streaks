import bcrypt from "bcryptjs";

const ROUNDS = 12;

export async function hashValue(value: string): Promise<string> {
  return bcrypt.hash(value, ROUNDS);
}

export async function verifyValue(value: string, hash: string): Promise<boolean> {
  return bcrypt.compare(value, hash);
}
