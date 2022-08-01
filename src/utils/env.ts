export function requireEnv(key: string): string {
  const value = process.env[key];
  if (!!value) {
    return value;
  }
  throw new Error(`Requires env variable "${key}"`);
}
