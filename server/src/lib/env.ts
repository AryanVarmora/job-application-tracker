import { HttpError } from "../middleware/errorHandler";

export function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new HttpError(500, `${name} is not configured on the server`);
  }
  return value;
}
