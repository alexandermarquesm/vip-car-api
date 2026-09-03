import { SubscriptionController } from "../../../interface/controllers/SubscriptionController";
import { CreateCheckout } from "../../../application/use-cases/Subscription/CreateCheckout";
import { CreateCustomerPortal } from "../../../application/use-cases/Subscription/CreateCustomerPortal";
import { MongooseTenantRepository } from "../../../interface/repositories/MongooseTenantRepository";
import { makeGooglePlayBilling } from "../GooglePlayBillingFactory";

export const makeSubscriptionController = (): SubscriptionController => {
  const createCheckout = new CreateCheckout();
  const tenantRepository = new MongooseTenantRepository();
  const createCustomerPortal = new CreateCustomerPortal(tenantRepository);

  return new SubscriptionController(createCheckout, createCustomerPortal, makeGooglePlayBilling());
};
