/**
 * bns-resolver.js
 *
 * Vanilla JavaScript BNS name resolver for Stacks.
 *
 * WHY THIS EXISTS
 * ---------------
 * Hiro deprecated all REST BNS endpoints (/v1/names/, /v2/bns/names/, etc.)
 * in late 2026. The only reliable way to resolve BNS names is calling the
 * on-chain Clarity contract directly via /v2/contracts/call-read/.
 *
 * That endpoint is PUBLIC (no API key needed) because it's used by every
 * Stacks dapp from the browser. It will not disappear — the contract is
 * immutable on the blockchain.
 *
 * USAGE
 * -----
 *   import { resolveBnsName } from './bns-resolver.js';
 *   // or load as <script> and use the global window.resolveBnsName
 *
 *   const address = await resolveBnsName('flor.btc');
 *   // => "SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKQ9H6DPR"
 *
 * RETURNS
 * -------
 *   String SP... / SM... address on success
 *   Throws Error on failure (invalid name, not registered, network error)
 */

(function (global) {
  'use strict';

  const HIRO_BASE         = 'https://api.hiro.so';
  const BNS_CONTRACT_ADDR = 'SP000000000000000000002Q6VF78';
  const BNS_CONTRACT_NAME = 'bns';
  const BNS_FUNCTION      = 'name-resolve';
  const DUMMY_CALLER      = 'SP000000000000000000002Q6VF78';

  // ─── Clarity argument encoding ────────────────────────────────────────────
  //
  // The contract expects two (buff) arguments: namespace and name.
  // Clarity serialization for a buffer:
  //   0x02 (type byte) + 4-byte big-endian length + bytes

  function stringToClarityBuffHex(s) {
    const bytes = new TextEncoder().encode(s);
    const len = bytes.length;
    const lenHex = len.toString(16).padStart(8, '0');
    let dataHex = '';
    for (const b of bytes) dataHex += b.toString(16).padStart(2, '0');
    return '0x02' + lenHex + dataHex;
  }

  // ─── Hex → bytes ──────────────────────────────────────────────────────────

  function hexToBytes(hex) {
    const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
    const bytes = new Uint8Array(clean.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(clean.substr(i * 2, 2), 16);
    }
    return bytes;
  }

  // ─── C32 (Crockford base32) encoding, used by Stacks addresses ───────────

  const C32_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

  // SHA-256 using the Web Crypto API (available in modern browsers).
  async function sha256(bytes) {
    const buf = await crypto.subtle.digest('SHA-256', bytes);
    return new Uint8Array(buf);
  }

  async function c32checksum(versionByte, hash160) {
    const data = new Uint8Array(1 + hash160.length);
    data[0] = versionByte;
    data.set(hash160, 1);
    const once  = await sha256(data);
    const twice = await sha256(once);
    return twice.slice(0, 4);
  }

  function c32encodeBytes(bytes) {
    let result = '';
    let carry = 0;
    let carryBits = 0;
    for (let i = bytes.length - 1; i >= 0; i--) {
      const current = (bytes[i] << carryBits) | carry;
      result = C32_ALPHABET[current & 0x1f] + result;
      carry = current >> 5;
      carryBits = carryBits + 8 - 5;
      if (carryBits >= 5) {
        result = C32_ALPHABET[carry & 0x1f] + result;
        carry = carry >> 5;
        carryBits -= 5;
      }
    }
    if (carryBits > 0) {
      result = C32_ALPHABET[carry & 0x1f] + result;
    }
    // Preserve leading zero-bytes as leading zero-chars
    let numLeadingZeroBytes = 0;
    for (const b of bytes) {
      if (b === 0) numLeadingZeroBytes++;
      else break;
    }
    result = result.replace(/^0+/, '');
    for (let i = 0; i < numLeadingZeroBytes; i++) result = '0' + result;
    return result;
  }

  async function c32address(versionByte, hash160) {
    const checksum = await c32checksum(versionByte, hash160);
    const combined = new Uint8Array(hash160.length + checksum.length);
    combined.set(hash160, 0);
    combined.set(checksum, hash160.length);
    return 'S' + C32_ALPHABET[versionByte] + c32encodeBytes(combined);
  }

  // ─── Parse the Clarity response to extract a principal ───────────────────
  //
  // A standard principal in Clarity binary format:
  //   0x05 (type tag) + 1 version byte + 20 hash160 bytes

  async function parseClarityPrincipalFromResponse(hex) {
    const bytes = hexToBytes(hex);
    for (let i = 0; i < bytes.length - 21; i++) {
      if (bytes[i] === 0x05) {
        const version = bytes[i + 1];
        // Valid version bytes: 22 (SP), 20 (SM) mainnet; 26 (ST), 21 (SN) testnet
        if (version === 22 || version === 20 || version === 26 || version === 21) {
          const hash160 = bytes.slice(i + 2, i + 22);
          if (hash160.length === 20) {
            return await c32address(version, hash160);
          }
        }
      }
    }
    return null;
  }

  // ─── Public API ──────────────────────────────────────────────────────────

  async function resolveBnsName(name) {
    const lower = String(name).toLowerCase().trim();
    const parts = lower.split('.');
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      throw new Error(`Invalid BNS name format: "${name}". Expected name.namespace (e.g. flor.btc)`);
    }
    const [bnsName, bnsNamespace] = parts;

    const url = `${HIRO_BASE}/v2/contracts/call-read/${BNS_CONTRACT_ADDR}/${BNS_CONTRACT_NAME}/${BNS_FUNCTION}`;
    const body = {
      sender: DUMMY_CALLER,
      arguments: [
        stringToClarityBuffHex(bnsNamespace), // namespace first (btc)
        stringToClarityBuffHex(bnsName),      // then name (flor)
      ],
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`BNS resolution failed: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    if (!data.okay || !data.result) {
      throw new Error(`BNS name "${name}" is not registered.`);
    }

    const resultHex = typeof data.result === 'string'
      ? (data.result.startsWith('0x') ? data.result.slice(2) : data.result)
      : '';

    const address = await parseClarityPrincipalFromResponse(resultHex);
    if (!address) {
      throw new Error(`BNS name "${name}" exists but has no associated Stacks address.`);
    }
    return address;
  }

  // ─── Export: UMD-style ───────────────────────────────────────────────────

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { resolveBnsName };
  } else {
    global.resolveBnsName = resolveBnsName;
  }
})(typeof window !== 'undefined' ? window : globalThis);
