import dns from "dns/promises";
import validator from "validator";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const disposableDomains = require("disposable-email-domains");

export function isDisposable(email) {
  const domain = email.split("@")[1].toLowerCase();
  return disposableDomains.includes(domain);
}
// 2. Check if the domain exists ( does it has ? A, AAAA, CNAME ou NS)
async function domainExists(domain) {
  try {
    // try resolve MX and, if fails, A e NS em paralelo
    const [mx, a, ns] = await Promise.allSettled([
      dns.resolveMx(domain),
      dns.resolve4(domain), // A
      dns.resolveNs(domain), // NS
    ]);

    // Return true if there is any valid record(MX ou A ou NS)
    return (
      (mx.status === "fulfilled" && mx.value.length > 0) ||
      (a.status === "fulfilled" && a.value.length > 0) ||
      (ns.status === "fulfilled" && ns.value.length > 0)
    );
  } catch (error) {
    // if Promise.allSettled fail completly return false
    return false;
  }
}

// 3. Valid MX (with no empty exchange)
async function emailDomainHasMX(email) {
  const domain = email.split("@")[1];

  try {
    const mxRecords = await dns.resolveMx(domain);

    if (!mxRecords || mxRecords.length === 0) return false;

    return mxRecords.some(
      (record) => record.exchange && record.exchange.length > 0
    );
  } catch (error) {
    console.log(`erro em emailDomainHasMX: ${error}`);
    return false;
  }
}

async function isValidEmailForSending(email) {
  //checks the basic format
  if (!validator.isEmail(email)) {
    console.log("formato de e-mail inválido");
    return false;
  }

  if (isDisposable(email)) {
    console.log("e-mail descartável");
    return false;
  }

  const domain = email.split("@")[1];

  if (!(await domainExists(domain))) {
    console.log("o domínio não existe");
    return false;
  }

  if (!(await emailDomainHasMX(email))) {
    console.log("O email não possui registro MX");
    return false;
  }

  return true;
}

export default {
  isValidEmailForSending,
};
