import crypto from "crypto";

// Generate RSA Key Pair (In a real production app, these would be in .env)
const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: "spki",
    format: "pem",
  },
  privateKeyEncoding: {
    type: "pkcs8",
    format: "pem",
  },
});

// Function to sign the receipt data
export const signReceipt = (data: string): string => {
  const sign = crypto.createSign("SHA256");
  sign.update(data);
  sign.end();
  // Return the signature as a hex string
  return sign.sign(privateKey, "hex");
};

// Function to verify the signature
export const verifyReceipt = (data: string, signature: string): boolean => {
  try {
    const verify = crypto.createVerify("SHA256");
    verify.update(data);
    verify.end();
    // Returns true if the signature matches the data, false otherwise
    return verify.verify(publicKey, signature, "hex");
  } catch (error) {
    console.error("Verification error:", error);
    return false;
  }
};
