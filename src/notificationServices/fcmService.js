// fcmService.js
// Cloudflare Worker compatible Firebase Cloud Messaging service

// 🔑 Put your full service account JSON here
const serviceAccount = {
  type: "service_account",
  project_id: "cladbee-6554e",
  private_key_id: "e85043afb942185e7c396025b06bad550e8f1159",
  private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC2U5ju54Q+JJWO\nDoBsrwZfe5d5JnxnBYl0blEFu+PNJpekNTUQDp8GtZix38Ak6pWJyl9eRT31yzft\nJGXPLUxfATQEKE5nvpxgHyL+SlhjwN5bNf3H+AD7i7AfgeHecHBVhZlSUDoy8u46\nxLkNPxKRIiSHredIXjAebe89sNxXrwE9PQWcbZf12fkfHzls21ZaA8tJL4FkyjJJ\npVHo8u/Eei+NmMngIz2+mSrFPZV1+QpkvvMHhlMgHEMB1mujzbAHzM6kMSyTQkbP\nQNt+q1dd9vtZct2hP6aw/qFwnfbw/oqcilnlmJOGF3RgO8OZpGzPy8+WHw94X7rY\nK0Z/89+VAgMBAAECggEAEVa6qnpV3Y45GSNQtZ7UNx+K9IVJobp2RR5G+KNsZhJ1\n3uXSDM7djK1kWGlA3cHfqq58inu0CSKxFNo4D49TpFoTvXl5ZO0Zjej07CqoMTeJ\nB2Xt1nOqFEHg4+SQ7q7R3/z7Ua3TewwWX6+P/mFLI+yTsMHdYGJxc2z2kKIeS8nT\n9mz387LxvD6nHPU+47dy8B7pm/uu5Qoqognr+78Wf9WYR6jPoFvgpr3XgR/u3MRI\nwIda+kVAyf3ik67u9i7jDj5ExsJiStFGUBhJw+0qhGyxra+velTLi+tbawmhRpei\ngJ95yzkvF0KoY200L/JUdClNgr7F+p9BmPXNdGT6WQKBgQDoEWSbyKhP9K3L+mSK\n9xxN5aph78JW0+nl3Z+EV3o+aqkU/Ldgiy4DZxmsF/cjbk1ZCo4yCyhAN7UecbTp\nG2HQ7KSEq0fQWmZ59A+T+oL5RZGmjNZYbemZoK95HAqKDvNsow3IOhGypgQSxA4d\ny6/oUI8Gfs6qzH2bpfdJtLm6pwKBgQDJIQdjcPiyyQwZFOiYCtp6QHPCpNZqVb/U\nTusWI0/SEy3hfCZmDAtZ0CytGhl57+HAb0yGXI6lwnytDPBbXdcgb4nCvel/bp6q\ngo8zVMA/RcJjV0J74kZACK5qIkGW99u4V7947iC8Jt4cw4d0d2mARUxChnQAMTra\nS4v4kCznYwKBgGsI0qFzbAXssVg6NbNOhBR9kBc5sSXA+clWbaNpgW1WXoPah22U\n4/UX0WRpbUg/MJeX4bu9H6R2zSeshCdbxMLK0pqKMUYs28T1x1WWHmCAMMxjet0w\nXKTJ0wUF5OqGOMnrbojiF5WRMqHBIU2my4xX04/IXuOyC2EFrEenfl5TAoGBAJxU\nIsUFGxkDsXaRTNRYo0YgcJmau9m8urSPfqQfYDxdkezQLZxlwjDV4NPPFHw1mpeT\nKrzIlkt6pqNvCidKAhsA9ue56xKUbZkEj7+LIT5Mv3GtckyOLKI63S47YBWyo0Je\nWcHp/OGhqERdKhy5b/Q2aLbQgLthiGgCDlJt5akXAoGBANHxiVvQT5o+51Hp/yOa\n9cMCGiQ3x3JWZnmxSVzMiUhrpaCodCvAFfpPe37zBVhEeo4Bnf2hWp/HLTpV5Zbe\n7EmMMEHbHk2mfSBIq/fRDOc/6u4KoIHOhGk/Ed5YvsGwPymlqDtiueDHYSv6eGzk\n9+GifumuUQgj+34SstgGN30P\n-----END PRIVATE KEY-----\n",
  client_email: "firebase-adminsdk-7pk5m@cladbee-6554e.iam.gserviceaccount.com",
  client_id: "116268011976537423639",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-7pk5m%40cladbee-6554e.iam.gserviceaccount.com",
  universe_domain: "googleapis.com"
};

function pemToArrayBuffer(pem) {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const raw = atob(b64);  
  const buffer = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    buffer[i] = raw.charCodeAt(i);
  }
  return buffer.buffer;
}

function base64urlEncode(uint8Array) {
  let binary = "";
  const len = uint8Array.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  return btoa(binary).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

export async function getAccessToken(env) {
  const serviceAccount = JSON.parse(env.SERVICE_ACCOUNT_KEY || '{}');

  if (!serviceAccount.client_email) {
    throw new NonRetryableError('Missing serviceAccount.client_email');
  }
  if (!serviceAccount.private_key) {
    throw new NonRetryableError('Missing serviceAccount.private_key');
  }

  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 3600;

  const header = { alg: "RS256", typ: "JWT" };
  const claimSet = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat,
    exp,
  };

  const encoder = new TextEncoder();
  const headerBase64 = base64urlEncode(encoder.encode(JSON.stringify(header)));
  const claimBase64 = base64urlEncode(encoder.encode(JSON.stringify(claimSet)));
  const unsignedToken = `${headerBase64}.${claimBase64}`;

  const keyData = pemToArrayBuffer(serviceAccount.private_key);

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    keyData,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    encoder.encode(unsignedToken)
  );

  const jwt = `${unsignedToken}.${base64urlEncode(new Uint8Array(signature))}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(`Failed to fetch access token: ${JSON.stringify(json)}`);
  }
  return json.access_token;
}
// src/notificationServices/fcmService.js
export async function sendMessage(accessToken, deviceToken, payload, env) {
  console.log("➡️ Sending FCM message:", {accessToken, deviceToken, payload });

  const url = `https://fcm.googleapis.com/v1/projects/${env.FCM_PROJECT_ID}/messages:send`;

  const body = {
    message: {
      token: deviceToken,
      notification: {
        title: payload.title,
        body: payload.body
      }
    }
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  // ✅ Always consume response body
  const text = await res.text();

  console.log("⬅️ FCM response status:", res.status);
  console.log("⬅️ FCM response body:", text);

  if (!res.ok) {
    throw new Error(`FCM send failed (${res.status}): ${text}`);
  }

  return JSON.parse(text);
}

// export async function sendMessage(accessToken, deviceToken, payload, env) {
//   try {

//     console.log("sendMessage called with: 11", {accessToken,  deviceToken, payload });
//     const serviceAccount = JSON.parse(env.SERVICE_ACCOUNT_KEY || '{}');
//     if (!serviceAccount.project_id) {
//       throw new NonRetryableError("Missing serviceAccount.project_id");
//     }

//     const message = {
//       message: {
//         token: deviceToken,
//         notification: {
//           title: payload.title,
//           body: payload.body
//         }
//       }
//     };

//       console.log("sendMessage called with:22", {message});
//     const res = await fetch(
//       `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`,
//       {
//         method: "POST",
//         headers: {
//           "Authorization": `Bearer ${accessToken}`,
//           "Content-Type": "application/json"
//         },
//         body: JSON.stringify(message)
//       }
//     );

//     const json = await res.json();
//     if (!res.ok) {
//       console.error("❌ FCM error:", json);
//       throw new Error(`FCM send failed: ${JSON.stringify(json)}`);
//     }

//     console.log("Notification sent:", json);
//     return json;
//   } catch (err) {
//     console.error("sendMessage error:", err.message);
//     throw err;
//   }
// }