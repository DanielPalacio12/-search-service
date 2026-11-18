export interface TokenClaims {
  subject?: string;
  roles: string[];
}

export interface TokenVerifierPort {
  /** Lanza si el token es inválido o está vencido. */
  verify(token: string): Promise<TokenClaims>;
}
