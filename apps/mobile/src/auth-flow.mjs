export const registrationSessionActions = Object.freeze({
  requireVerification: 'require_verification',
  completeAuthenticatedSignup: 'complete_authenticated_signup'
});

const normalizeEmail = (email) => (typeof email === 'string' ? email.trim().toLowerCase() : '');

export const decidePostSignUpAction = ({ hasSession = false, requireEmailConfirmation = true } = {}) => {
  if (!hasSession || requireEmailConfirmation) {
    return registrationSessionActions.requireVerification;
  }

  return registrationSessionActions.completeAuthenticatedSignup;
};

export const shouldSuppressRegistrationSessionEvent = ({
  event,
  sessionEmail,
  pendingVerificationEmail,
  verificationAllowedEmail
} = {}) => {
  if (event !== 'SIGNED_IN') {
    return false;
  }

  const normalizedSessionEmail = normalizeEmail(sessionEmail);
  const normalizedPendingEmail = normalizeEmail(pendingVerificationEmail);
  const normalizedAllowedEmail = normalizeEmail(verificationAllowedEmail);

  return Boolean(
    normalizedSessionEmail &&
      normalizedPendingEmail &&
      normalizedSessionEmail === normalizedPendingEmail &&
      normalizedAllowedEmail !== normalizedSessionEmail
  );
};
