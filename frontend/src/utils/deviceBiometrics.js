/**
 * Device Biometric & Screen Lock Authentication Utility
 * Uses WebAuthn (PublicKeyCredential) for Device Fingerprint, Face ID, Touch ID, Windows Hello, and Screen Lock.
 */

// Helper to convert base64/strings to Uint8Array
const strToBuffer = (str) => {
  const enc = new TextEncoder();
  return enc.encode(str);
};

const getRandomBuffer = (length = 32) => {
  const buffer = new Uint8Array(length);
  window.crypto.getRandomValues(buffer);
  return buffer;
};

/**
 * Check if WebAuthn / Platform Authenticator (Fingerprint, TouchID, Windows Hello, Screen Lock) is available
 */
export const isBiometricSupported = async () => {
  try {
    if (window.PublicKeyCredential && typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
      const available = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      return !!available;
    }
    return false;
  } catch (err) {
    console.warn("Biometric availability check warning:", err);
    return false;
  }
};

/**
 * Prompt device biometric / screen lock authentication (Windows Hello / Touch ID / Fingerprint / Device PIN)
 */
export const promptDeviceScreenLock = async (user) => {
  try {
    const isSupported = await isBiometricSupported();
    if (!isSupported) {
      return { success: false, reason: "NOT_SUPPORTED", message: "Device biometric not supported on this browser/platform." };
    }

    const userId = user?.id || user?._id || user?.email || "user_default";
    const userEmail = user?.email || "user@multimarg.com";
    const userName = user?.name || user?.fullName || "Multi-Marg User";

    const challenge = getRandomBuffer(32);
    const userIdBuffer = strToBuffer(String(userId));

    // Try creating/verifying a local platform credential
    const publicKeyCredentialCreationOptions = {
      challenge,
      rp: {
        name: "Multi-Marg Logistics Software",
        id: window.location.hostname === "localhost" ? "localhost" : window.location.hostname
      },
      user: {
        id: userIdBuffer,
        name: userEmail,
        displayName: userName
      },
      pubKeyCredParams: [
        { alg: -7, type: "public-key" }, // ES256
        { alg: -257, type: "public-key" } // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform", // Forces direct device fingerprint / Touch ID / Windows Hello / local screen PIN
        userVerification: "required",        // Forces fingerprint or device screen lock PIN
        residentKey: "discouraged",          // Bypasses Google Passkey Cloud account sync
        requireResidentKey: false
      },
      timeout: 60000,
      attestation: "none"
    };

    // Trigger device biometric / screen lock
    const credential = await navigator.credentials.create({
      publicKey: publicKeyCredentialCreationOptions
    });

    if (credential) {
      return { success: true, credentialId: credential.id };
    }
    return { success: false, reason: "FAILED", message: "Device authentication did not complete." };
  } catch (error) {
    // Handle user cancellation or errors
    if (error.name === "NotAllowedError") {
      return { success: false, reason: "CANCELLED", message: "Device authentication was cancelled or timed out." };
    }
    console.warn("Device biometric prompt warning:", error);
    return { success: false, reason: "ERROR", message: error.message || "Device authentication error." };
  }
};
