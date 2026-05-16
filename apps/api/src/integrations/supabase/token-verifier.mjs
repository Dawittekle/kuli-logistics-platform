import { AppError } from '../../common/errors/app-error.mjs';

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
  constructor({ mode }) {
    this.mode = mode;
  }

  async verifyAuthorizationHeader(authorizationHeader) {
    if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
      throw new AppError(401, 'UNAUTHENTICATED', 'Missing bearer token.');
    }

    const token = authorizationHeader.slice('Bearer '.length).trim();

    if (this.mode === 'development_stub') {
      return parseDevelopmentToken(token);
    }

    throw new AppError(
      501,
      'SUPABASE_VERIFIER_NOT_IMPLEMENTED',
      'Real Supabase JWT verification has not been wired into this scaffold yet.'
    );
  }
}

