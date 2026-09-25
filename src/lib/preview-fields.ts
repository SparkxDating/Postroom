import type { Account } from "./types";
import type { MergeFields } from "./render";

export function sampleFields(user: Account): MergeFields {
  return {
    firstName: "Alex",
    lastName: "Morgan",
    email: "alex@example.com",
    unsubscribeUrl: "https://example.com/unsubscribe",
    companyName: user.companyName || "Your company",
    postalAddress: user.postalAddress || "Your postal address",
    unsubToken: "preview",
  };
}
