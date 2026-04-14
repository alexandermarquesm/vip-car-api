import crypto from "crypto";

export interface IVehicle {
  plate: string;
  carModel: string;
}

export interface IClientProps {
  id?: string;
  tenantId: string;
  name: string;
  phone: string;
  vehicles?: IVehicle[];
  createdAt?: Date;
}

export class Client {
  public readonly id: string;
  public tenantId: string;
  public name: string;
  public phone: string;
  public vehicles: IVehicle[];
  public readonly createdAt: Date;

  constructor(props: IClientProps) {
    this.id = props.id || crypto.randomUUID();
    this.tenantId = props.tenantId;
    this.name = props.name;
    this.phone = props.phone;
    this.vehicles = props.vehicles || [];
    this.createdAt = props.createdAt || new Date();
  }

  addVehicle(plate: string, carModel: string): void {
    const standardizedPlate = plate.toUpperCase().trim();
    const exists = this.vehicles.some(v => v.plate.toUpperCase() === standardizedPlate);
    if (!exists) {
      this.vehicles.push({ plate: standardizedPlate, carModel });
    }
  }
}
