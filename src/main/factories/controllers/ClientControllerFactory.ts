import { MongooseClientRepository } from "../../../interface/repositories/MongooseClientRepository";
import { SearchClients } from "../../../application/use-cases/SearchClients";
import { UpdateClient } from "../../../application/use-cases/UpdateClient";
import { RegisterClient } from "../../../application/use-cases/RegisterClient";
import { DeleteClient } from "../../../application/use-cases/DeleteClient";
import { ClientController } from "../../../interface/controllers/ClientController";

export const makeClientController = (): ClientController => {
  const clientRepository = new MongooseClientRepository();

  const searchClients = new SearchClients(clientRepository);
  const updateClient = new UpdateClient(clientRepository);
  const registerClient = new RegisterClient(clientRepository);
  const deleteClient = new DeleteClient(clientRepository);

  return new ClientController(
    searchClients,
    updateClient,
    registerClient,
    deleteClient,
    clientRepository
  );
};
