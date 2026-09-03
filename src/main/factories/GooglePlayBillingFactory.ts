import { GooglePlayBilling } from "../../application/use-cases/Subscription/GooglePlayBilling";
import { MongooseTenantRepository } from "../../interface/repositories/MongooseTenantRepository";
import { loadEnv } from "../config/env";

export const makeGooglePlayBilling = (): GooglePlayBilling => {
  const env = loadEnv();
  return new GooglePlayBilling(new MongooseTenantRepository(), {
    packageName: env.GOOGLE_PLAY_PACKAGE_NAME,
    basicProductId: env.GOOGLE_PLAY_BASIC_PRODUCT_ID,
    proProductId: env.GOOGLE_PLAY_PRO_PRODUCT_ID,
    serviceAccountJson: env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON,
    serviceAccountBase64: env.GOOGLE_PLAY_SERVICE_ACCOUNT_BASE64,
    pubsubAudience: env.GOOGLE_PLAY_PUBSUB_AUDIENCE,
    pubsubServiceAccountEmail: env.GOOGLE_PLAY_PUBSUB_SERVICE_ACCOUNT_EMAIL,
  });
};
