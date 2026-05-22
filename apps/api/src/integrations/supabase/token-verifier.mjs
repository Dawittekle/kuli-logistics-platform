import { AppError } from '../../common/errors/app-error.mjs';
import { createRemoteJWKSet, decodeProtectedHeader, jwtVerify } from 'jose';

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
  constructor({ mode, issuer, audience, jwksUrl, supabaseUrl, anonKey, allowDevelopmentTokens = false, fetchImpl = fetch }) {
    this.mode = mode;
    this.issuer = issuer;
    this.audience = audience;
    this.jwksUrl = jwksUrl;
    this.supabaseUrl = supabaseUrl;
    this.anonKey = anonKey;
    this.allowDevelopmentTokens = allowDevelopmentTokens;
    this.fetchImpl = fetchImpl;
    this.jwks = null;
  }

  async verifyWithAuthServer(token) {
    if (!this.supabaseUrl || !this.anonKey || this.anonKey === 'replace-me') {
      throw new AppError(
        500,
        'SUPABASE_CONFIG_MISSING',
        'Supabase shared-secret verification requires SUPABASE_URL and SUPABASE_ANON_KEY.'
      );
    }

    const response = await this.fetchImpl(`${this.supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: this.anonKey,
        authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new AppError(401, 'INVALID_TOKEN', 'Supabase token verification failed.', {
        statusCode: response.status
      });
    }

    const user = await response.json();

    if (!user?.id) {
      throw new AppError(401, 'INVALID_TOKEN', 'Supabase token verification did not return a user.');
    }

    return {
      sub: user.id,
      email: user.email,
      phone: user.phone,
      app_metadata: user.app_metadata ?? {},
      raw: user
    };
  }

  async verifyAuthorizationHeader(authorizationHeader) {
    if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
      throw new AppError(401, 'UNAUTHENTICATED', 'Missing bearer token.');
    }

    const token = authorizationHeader.slice('Bearer '.length).trim();

    if (this.mode === 'development_stub' || (this.allowDevelopmentTokens && token.startsWith('dev:'))) {
      return parseDevelopmentToken(token);
    }

    let header;

    try {
      header = decodeProtectedHeader(token);
    } catch {
      throw new AppError(401, 'INVALID_TOKEN', 'Supabase token is not a valid JWT.');
    }

    if (header.alg === 'HS256') {
      return this.verifyWithAuthServer(token);
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
      return this.verifyWithAuthServer(token);
    }
  }
}
