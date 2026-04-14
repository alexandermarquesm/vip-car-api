import crypto from "crypto";

export interface IPayment {
  method: "money" | "card" | "pix" | "convenio" | "credit_card" | "debit_card";
  amount: number;
}

export interface IWashProps {
  _id?: any;
  tenantId: string;
  clientId: string;
  plate: string;
  carModel: string;
  price: number;
  netPrice?: number;
  entryTime?: Date;
  deliveryTime: Date;
  status?: "pending" | "completed" | "cancelled";
  paymentMethod?: string;
  payments?: IPayment[];
  createdAt?: Date;
}

export class Wash {
  public readonly _id?: any;
  public tenantId: string;
  public readonly clientId: string;
  public readonly plate: string;
  public readonly carModel: string;
  public price: number;
  public netPrice: number;
  public readonly entryTime: Date;
  public deliveryTime: Date;
  public status: "pending" | "completed" | "cancelled";
  public paymentMethod?: string;
  public payments: IPayment[];
  public readonly createdAt: Date;

  constructor(props: IWashProps) {
    this._id = props._id || crypto.randomUUID();
    this.tenantId = props.tenantId;
    this.clientId = props.clientId;
    this.plate = props.plate.toUpperCase().trim();
    this.carModel = props.carModel;
    this.price = props.price;
    this.netPrice = props.netPrice || props.price;
    this.entryTime = props.entryTime || new Date();
    this.deliveryTime = props.deliveryTime;
    this.status = props.status || "pending";
    this.paymentMethod = props.paymentMethod;
    this.payments = props.payments || [];
    this.createdAt = props.createdAt || new Date();
  }
}
