import crypto from "crypto";

export interface ITenantProps {
  id?: string;
  name: string;
  document?: string; // CNPJ ou CPF
  status?: "active" | "inactive" | "suspended";
  plan?: "trial" | "monthly";
  subscriptionStatus?: "active" | "past_due" | "canceled";
  trialEndsAt?: Date;
  createdAt?: Date;
  externalCustomerId?: string;
  externalSubscriptionId?: string;
  billingProvider?: "stripe" | "google_play" | "courtesy";
  googlePlayPurchaseTokenHash?: string;
  googlePlayObfuscatedAccountId?: string;
  googlePlayProductId?: string;
  googlePlayLatestOrderId?: string;
  variantId?: string;
  currentPeriodEnd?: Date;
  creditCardFee?: number;
  debitCardFee?: number;
  inviteCode?: string;
}

export class Tenant {
  public readonly id: string;
  public name: string;
  public document?: string;
  public status: "active" | "inactive" | "suspended";
  public plan: "trial" | "monthly";
  public subscriptionStatus: "active" | "past_due" | "canceled";
  public trialEndsAt: Date;
  public readonly createdAt: Date;
  public externalCustomerId?: string;
  public externalSubscriptionId?: string;
  public billingProvider?: "stripe" | "google_play" | "courtesy";
  public googlePlayPurchaseTokenHash?: string;
  public googlePlayObfuscatedAccountId?: string;
  public googlePlayProductId?: string;
  public googlePlayLatestOrderId?: string;
  public variantId?: string;
  public currentPeriodEnd?: Date;
  public creditCardFee: number;
  public debitCardFee: number;
  public inviteCode: string;

  constructor(props: ITenantProps) {
    this.id = props.id || crypto.randomUUID();
    this.name = props.name;
    this.document = props.document;
    this.status = props.status || "active";
    this.plan = props.plan || "trial";
    this.subscriptionStatus = props.subscriptionStatus || "active";
    
    // Default trial: 7 days from now if not provided
    if (props.trialEndsAt) {
      this.trialEndsAt = props.trialEndsAt;
    } else {
      const date = new Date();
      date.setDate(date.getDate() + 7);
      this.trialEndsAt = date;
    }

    this.createdAt = props.createdAt || new Date();
    this.externalCustomerId = props.externalCustomerId;
    this.externalSubscriptionId = props.externalSubscriptionId;
    this.billingProvider = props.billingProvider;
    this.googlePlayPurchaseTokenHash = props.googlePlayPurchaseTokenHash;
    this.googlePlayObfuscatedAccountId = props.googlePlayObfuscatedAccountId;
    this.googlePlayProductId = props.googlePlayProductId;
    this.googlePlayLatestOrderId = props.googlePlayLatestOrderId;
    this.variantId = props.variantId;
    this.currentPeriodEnd = props.currentPeriodEnd;
    this.creditCardFee = props.creditCardFee !== undefined ? props.creditCardFee : 3.09;
    this.debitCardFee = props.debitCardFee !== undefined ? props.debitCardFee : 0.89;
    this.inviteCode = props.inviteCode || `VIP-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
  }

  public isProOrTrial(): boolean {
    // If the plan is monthly, we must have variantId === "pro".
    // If the plan is trial, it acts as a test of the PRO plan (full features).
    if (this.plan === "trial") return true;
    return this.variantId === "pro";
  }

  public canAccessReports(): boolean {
    return this.isProOrTrial();
  }

  public canAccessExpenses(): boolean {
    return this.isProOrTrial();
  }

  public canAccessOCR(): boolean {
    return this.isProOrTrial();
  }

  public getMaxUsers(): number {
    return this.isProOrTrial() ? 5 : 1;
  }

  public canAddUser(currentActiveUsersCount: number): boolean {
    return currentActiveUsersCount < this.getMaxUsers();
  }
}
