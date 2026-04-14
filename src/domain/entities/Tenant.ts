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
  }
}
