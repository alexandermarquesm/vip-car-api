import crypto from "crypto";

export interface IUserProps {
  id?: string;
  tenantId: string;
  name: string;
  email: string;
  passwordHash: string; // The hashed password, NOT plaintext
  role?: "owner" | "admin" | "worker";
  status?: "active" | "inactive";
  createdAt?: Date;
}

export class User {
  public readonly id: string;
  public tenantId: string;
  public name: string;
  public email: string;
  public passwordHash: string;
  public role: "owner" | "admin" | "worker";
  public status: "active" | "inactive";
  public readonly createdAt: Date;

  constructor(props: IUserProps) {
    this.id = props.id || crypto.randomUUID();
    this.tenantId = props.tenantId;
    this.name = props.name;
    this.email = props.email.toLowerCase().trim();
    this.passwordHash = props.passwordHash;
    this.role = props.role || "worker";
    this.status = props.status || "active";
    this.createdAt = props.createdAt || new Date();
  }
}
