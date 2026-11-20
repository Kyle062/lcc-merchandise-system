import crypto from "crypto";
import fs from "fs";
import path from "path";

/* =========================================================================
   STEP 1: PERSISTED RSA KEY PAIR
   -------------------------------------------------------------------------
   Keys are generated ONCE and saved to disk (./keys/private.pem and
   ./keys/public.pem). On every server start we try to LOAD them first.
   This ensures old receipts can still be verified after a restart.
   ========================================================================= */

const KEYS_DIR = path.join(process.cwd(), "keys");
const PRIVATE_KEY_PATH = path.join(KEYS_DIR, "private.pem");
const PUBLIC_KEY_PATH = path.join(KEYS_DIR, "public.pem");

const ensureKeysExist = (): { privateKey: string; publicKey: string } => {
  if (!fs.existsSync(KEYS_DIR)) {
    fs.mkdirSync(KEYS_DIR, { recursive: true });
  }

  if (fs.existsSync(PRIVATE_KEY_PATH) && fs.existsSync(PUBLIC_KEY_PATH)) {
    return {
      privateKey: fs.readFileSync(PRIVATE_KEY_PATH, "utf8"),
      publicKey: fs.readFileSync(PUBLIC_KEY_PATH, "utf8"),
    };
  }

  console.log("🔑 Generating new RSA key pair (first run only)...");
  const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });

  fs.writeFileSync(PRIVATE_KEY_PATH, privateKey, { mode: 0o600 });
  fs.writeFileSync(PUBLIC_KEY_PATH, publicKey);
  console.log("🔑 RSA keys saved to ./keys/");

  return { privateKey, publicKey };
};

const { privateKey, publicKey } = ensureKeysExist();

/* =========================================================================
   STEP 2: CANONICAL STRINGIFICATION
   -------------------------------------------------------------------------
   Recursively sorts object keys and removes whitespace, so the same object
   ALWAYS produces the same string. Critical for signing.
   ========================================================================= */

const sortValue = (value: any): any => {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === "object" && !(value instanceof Date)) {
    return Object.keys(value)
      .sort()
      .reduce((acc: any, key) => {
        acc[key] = sortValue(value[key]);
        return acc;
      }, {});
  }
  return value;
};

export const buildCanonicalString = (payload: any): string => {
  return JSON.stringify(sortValue(payload));
};

/* =========================================================================
   STEP 3: ORDER SNAPSHOT BUILDER
   -------------------------------------------------------------------------
   Single source of truth for what gets signed. Used by:
     - placeOrder()           → to sign at checkout
     - verifyReceiptSignature → to recompute + compare
   Any field added here will automatically be protected.
   ========================================================================= */

export interface OrderSnapshotItem {
  product_id: number;
  name: string;
  size: string | null;
  course: string | null;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface OrderSnapshot {
  group_id: number;
  group_code: string;
  user_id: number;
  username: string;
  full_name: string | null;
  email: string;
  course: string | null;
  timestamp: string;
  total: number;
  items: OrderSnapshotItem[];
}

export const buildOrderSnapshot = (input: {
  group_id: number;
  group_code: string;
  user: {
    id: number;
    username: string;
    full_name: string | null;
    email: string;
    course: string | null;
  };
  items: Array<{
    product_id: number;
    name: string;
    size: string | null;
    course: string | null;
    quantity: number;
    unit_price: number;
  }>;
  timestamp: string;
}): OrderSnapshot => {
  const items: OrderSnapshotItem[] = input.items
    .map((i) => ({
      product_id: i.product_id,
      name: i.name,
      size: i.size,
      course: i.course,
      quantity: i.quantity,
      unit_price: Number(i.unit_price),
      subtotal: Number((i.unit_price * i.quantity).toFixed(2)),
    }))
    // stable order so two runs produce the same array order
    .sort((a, b) => a.product_id - b.product_id);

  const total = Number(
    items.reduce((sum, i) => sum + i.subtotal, 0).toFixed(2),
  );

  return {
    group_id: input.group_id,
    group_code: input.group_code,
    user_id: input.user.id,
    username: input.user.username,
    full_name: input.user.full_name,
    email: input.user.email,
    course: input.user.course,
    timestamp: input.timestamp,
    total,
    items,
  };
};

/* =========================================================================
   STEP 4: SIGN / VERIFY (existing public API preserved)
   ========================================================================= */

export const signReceipt = (data: string): string => {
  const sign = crypto.createSign("SHA256");
  sign.update(data);
  sign.end();
  return sign.sign(privateKey, "hex");
};

export const verifyReceipt = (data: string, signature: string): boolean => {
  try {
    const verify = crypto.createVerify("SHA256");
    verify.update(data);
    verify.end();
    return verify.verify(publicKey, signature, "hex");
  } catch (error) {
    console.error("Verification error:", error);
    return false;
  }
};

/* =========================================================================
   STEP 5: FIELD-LEVEL DIFF
   -------------------------------------------------------------------------
   Compares the stored snapshot (what was signed at checkout) against the
   live snapshot (rebuilt from the DB right now). Returns a flat list of
   every field that changed — which the frontend renders as a table.
   ========================================================================= */

export interface SnapshotDiff {
  field: string;
  signed: any;
  current: any;
}

const compareValues = (
  pathStr: string,
  a: any,
  b: any,
  diffs: SnapshotDiff[],
) => {
  // Treat null/undefined as equivalent
  const aNorm = a === undefined ? null : a;
  const bNorm = b === undefined ? null : b;

  if (
    aNorm !== null &&
    bNorm !== null &&
    typeof aNorm === "object" &&
    typeof bNorm === "object"
  ) {
    const allKeys = new Set([
      ...Object.keys(aNorm || {}),
      ...Object.keys(bNorm || {}),
    ]);
    for (const key of allKeys) {
      compareValues(`${pathStr}.${key}`, aNorm?.[key], bNorm?.[key], diffs);
    }
    return;
  }

  if (Array.isArray(aNorm) && Array.isArray(bNorm)) {
    const max = Math.max(aNorm.length, bNorm.length);
    for (let i = 0; i < max; i++) {
      compareValues(`${pathStr}[${i}]`, aNorm[i], bNorm[i], diffs);
    }
    return;
  }

  // Numeric compare (avoid "300" vs 300 false positives)
  const aNum = typeof aNorm === "number" ? aNorm : Number(aNorm);
  const bNum = typeof bNorm === "number" ? bNorm : Number(bNorm);
  const bothNumeric =
    !isNaN(aNum) &&
    !isNaN(bNum) &&
    aNorm !== null &&
    bNorm !== null &&
    aNorm !== "" &&
    bNorm !== "";

  const equal = bothNumeric ? Number(aNum) === Number(bNum) : aNorm === bNorm;

  if (!equal) {
    diffs.push({ field: pathStr, signed: aNorm, current: bNorm });
  }
};

export const diffSnapshots = (
  signedSnapshot: OrderSnapshot | null,
  liveSnapshot: OrderSnapshot,
): SnapshotDiff[] => {
  const diffs: SnapshotDiff[] = [];

  if (!signedSnapshot) {
    diffs.push({
      field: "snapshot",
      signed: "(missing — no snapshot was recorded at checkout)",
      current: "(present)",
    });
    return diffs;
  }

  compareValues("snapshot", signedSnapshot, liveSnapshot, diffs);

  // Cleaner field names for display
  return diffs.map((d) => ({
    ...d,
    field: d.field.replace(/^snapshot\./, ""),
  }));
};
