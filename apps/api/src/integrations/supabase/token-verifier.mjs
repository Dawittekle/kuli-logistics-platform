import { AppError } from '../../common/errors/app-error.mjs';
import { createRemoteJWKSet, jwtVerify } from 'jose';

const parseDevelopmentToken = (token) => {
  if (!token.startsWith('dev:')) {
    throw new AppError(401, 'INVALID_TOKEN', 'Development tokens must use the dev:<supabaseUserId> format.');
  }

  const supabaseUserId = token.slice(4).trim();

  if (!supabaseUserId) {
    throw new AppError(401, 'INVALID_TOKEN', 'Development token is missing a Supabase user id.');
  }

  return {
    sub: supabaseUserId,
    email: undefined,
    phone: undefined,
    app_metadata: {}
  };
};

export class SupabaseTokenVerifier {
  constructor({ mode, issuer, audience, jwksUrl }) {
    this.mode = mode;
    this.issuer = issuer;
    this.audience = audience;
    this.jwksUrl = jwksUrl;
    this.jwks = null;
  }

  async verifyAuthorizationHeader(authorizationHeader) {
    if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
      throw new AppError(401, 'UNAUTHENTICATED', 'Missing bearer token.');
    }

    const token = authorizationHeader.slice('Bearer '.length).trim();

    if (this.mode === 'development_stub') {
      return parseDevelopmentToken(token);
    }

    if (!this.issuer || !this.jwksUrl) {
      throw new AppError(
        500,
        'SUPABASE_CONFIG_MISSING',
        'Supabase JWT verification is enabled but issuer or JWKS configuration is missing.'
      );
    }

    if (!this.jwks) {
      this.jwks = createRemoteJWKSet(new URL(this.jwksUrl));
    }

    try {
      const { payload } = await jwtVerify(token, this.jwks, {
        issuer: this.issuer,
        audience: this.audience || undefined
      });

      return {
        sub: payload.sub,
        email: payload.email,
        phone: payload.phone,
        app_metadata: payload.app_metadata ?? {},
        raw: payload
      };
    } catch (error) {
      throw new AppError(401, 'INVALID_TOKEN', 'Supabase token verification failed.', {
        reason: error instanceof Error ? error.message : String(error)
      });
    }
  }
}
