import { postJSON } from "./client";

export interface PasswordResetMessage {
  message: string;
}

export function requestPasswordReset(usernameOrEmail: string): Promise<PasswordResetMessage> {
  return postJSON<PasswordResetMessage>("/password-reset/request", { username_or_email: usernameOrEmail });
}

export function confirmPasswordReset(token: string, newPassword: string): Promise<PasswordResetMessage> {
  return postJSON<PasswordResetMessage>("/password-reset/confirm", { token, new_password: newPassword });
}
