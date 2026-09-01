import { Response } from "express";
import { AuthenticatedRequest } from "../../infrastructure/webserver/express/middlewares/AuthMiddleware";
import { IUserRepository } from "../../application/repositories/IUserRepository";
import { AppError } from "../../infrastructure/errors/AppError";
import InviteModel from "../../infrastructure/database/mongoose-models/InviteModel";
import TenantModel from "../../infrastructure/database/mongoose-models/TenantModel";
import { Tenant } from "../../domain/entities/Tenant";
import crypto from "crypto";

export class TeamController {
  constructor(private userRepository: IUserRepository) {}

  async createInviteLink(req: AuthenticatedRequest, res: Response): Promise<void> {
    const tenantId = req.user!.tenantId;
    const tenant = await TenantModel.findById(tenantId);
    if (!tenant) {
      throw new AppError("Empresa não encontrada", 404);
    }

    const tenantEntity = new Tenant({
      id: tenant.id,
      name: tenant.name,
      document: tenant.document,
      status: tenant.status as any,
      plan: tenant.plan as any,
      subscriptionStatus: tenant.subscriptionStatus as any,
      trialEndsAt: tenant.trialEndsAt,
      createdAt: tenant.createdAt,
      externalCustomerId: tenant.externalCustomerId,
      externalSubscriptionId: tenant.externalSubscriptionId,
      variantId: tenant.variantId,
      currentPeriodEnd: tenant.currentPeriodEnd,
      creditCardFee: tenant.creditCardFee,
      debitCardFee: tenant.debitCardFee,
      inviteCode: tenant.inviteCode,
    });

    const members = await this.userRepository.findAllByTenantId(tenantId);
    const activeCount = members.filter(member =>
      member.status === "active" || member.status === "inactive"
    ).length;
    const availableSlots = tenantEntity.getMaxUsers() - activeCount;

    if (availableSlots <= 0) {
      throw new AppError(
        `Limite de usuários atingido para o seu plano (${tenantEntity.getMaxUsers()} usuário(s)).`,
        403,
      );
    }

    // Um único link por empresa reduz o risco de convites esquecidos. Gerar
    // um novo link revoga imediatamente qualquer link anterior ainda ativo.
    await InviteModel.updateMany(
      { tenantId, tokenHash: { $exists: true }, status: "pending" },
      { $set: { status: "revoked" } },
    );

    const rawToken = crypto.randomBytes(32).toString("base64url");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invite = await InviteModel.create({
      tenantId,
      tenantName: tenant.name,
      tokenHash,
      expiresAt,
      createdBy: req.user!.id,
      status: "pending",
    });

    // O fragmento não é enviado ao servidor web e evita que o token apareça
    // em logs HTTP. O token bruto nunca é salvo no banco de dados.
    const inviteUrl = `https://vipercar.com.br/convite#${rawToken}`;

    res.set("Cache-Control", "no-store");
    res.status(201).json({
      id: invite.id,
      inviteUrl,
      expiresAt,
    });
  }

  async revokeInviteLink(req: AuthenticatedRequest, res: Response): Promise<void> {
    const invite = await InviteModel.findOneAndUpdate(
      {
        _id: req.params.id,
        tenantId: req.user!.tenantId,
        tokenHash: { $exists: true },
        status: "pending",
      },
      { $set: { status: "revoked" } },
      { new: true },
    ).catch(() => null);

    if (!invite) {
      throw new AppError("Convite não encontrado ou já utilizado.", 404);
    }

    res.status(204).send();
  }

  async inviteMember(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { email } = req.body;
    const tenantId = req.user!.tenantId;

    if (!email) {
      throw new AppError("O e-mail é obrigatório", 400);
    }

    const cleanEmail = email.toLowerCase().trim();

    // Verify if user exists
    const userToInvite = await this.userRepository.findByEmail(cleanEmail);
    if (!userToInvite) {
      throw new AppError("Não existe uma conta registrada com este e-mail. Peça para o funcionário criar uma conta no app primeiro.", 404);
    }

    if (userToInvite.tenantId === tenantId) {
      throw new AppError("Este usuário já pertence à sua equipe.", 409);
    }

    // Get Tenant
    const tenant = await TenantModel.findById(tenantId);
    if (!tenant) {
      throw new AppError("Empresa não encontrada", 404);
    }

    const tenantEntity = new Tenant({
      id: tenant.id,
      name: tenant.name,
      document: tenant.document,
      status: tenant.status as any,
      plan: tenant.plan as any,
      subscriptionStatus: tenant.subscriptionStatus as any,
      trialEndsAt: tenant.trialEndsAt,
      createdAt: tenant.createdAt,
      externalCustomerId: tenant.externalCustomerId,
      externalSubscriptionId: tenant.externalSubscriptionId,
      variantId: tenant.variantId,
      currentPeriodEnd: tenant.currentPeriodEnd,
      creditCardFee: tenant.creditCardFee,
      debitCardFee: tenant.debitCardFee,
      inviteCode: tenant.inviteCode,
    });

    const members = await this.userRepository.findAllByTenantId(tenantId);
    const activeCount = members.filter(m => m.status === "active" || m.status === "inactive").length;

    if (!tenantEntity.canAddUser(activeCount)) {
      throw new AppError(
        `Limite de colaboradores atingido para o seu plano (${tenantEntity.getMaxUsers()} usuário(s)). Faça upgrade para o plano PRO para adicionar mais colaboradores.`,
        403
      );
    }

    // Check for existing pending invites
    const existingInvite = await InviteModel.findOne({ email: cleanEmail, tenantId, status: "pending" });
    if (existingInvite) {
      throw new AppError("Já existe um convite pendente para este usuário.", 409);
    }

    const invite = await InviteModel.create({
      email: cleanEmail,
      tenantId,
      tenantName: tenant.name,
      status: "pending",
    });

    res.status(201).json(invite);
  }

  async listMembers(req: AuthenticatedRequest, res: Response): Promise<void> {
    const tenantId = req.user!.tenantId;
    
    // Pega todos os colaboradores associados a este tenant
    const members = await this.userRepository.findAllByTenantId(tenantId);
    
    const activeMembers = members
      .filter(m => m.status === "active" || m.status === "inactive")
      .map(m => ({
        id: m.id,
        name: m.name,
        email: m.email,
        role: m.role,
        status: m.status,
      }));

    const pendingRequests = members
      .filter(m => m.status === "pending")
      .map(m => ({
        id: m.id,
        name: m.name,
        email: m.email,
        role: m.role,
        status: m.status,
      }));

    // Pega os convites pendentes que o dono enviou
    await InviteModel.updateMany(
      { tenantId, status: "pending", expiresAt: { $lte: new Date() } },
      { $set: { status: "revoked" } },
    );
    const pendingInvites = await InviteModel.find({ tenantId, status: "pending" })
      .select("email tenantId tenantName status expiresAt createdAt");

    // Busca o Tenant para pegar o código de convite
    const tenant = await TenantModel.findById(tenantId);

    if (tenant && !tenant.inviteCode) {
      tenant.inviteCode = `VIP-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
      await tenant.save();
    }

    res.json({ 
      members: activeMembers, 
      pendingRequests,
      invites: pendingInvites, 
      inviteCode: tenant?.inviteCode || "",
    });
  }

  async approveRequest(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;

    const worker = await this.userRepository.findById(id);
    if (!worker || worker.tenantId !== tenantId || worker.status !== "pending") {
      throw new AppError("Solicitação de colaborador não encontrada ou já processada.", 404);
    }

    const tenant = await TenantModel.findById(tenantId);
    if (!tenant) {
      throw new AppError("Empresa não encontrada", 404);
    }

    const tenantEntity = new Tenant({
      id: tenant.id,
      name: tenant.name,
      document: tenant.document,
      status: tenant.status as any,
      plan: tenant.plan as any,
      subscriptionStatus: tenant.subscriptionStatus as any,
      trialEndsAt: tenant.trialEndsAt,
      createdAt: tenant.createdAt,
      externalCustomerId: tenant.externalCustomerId,
      externalSubscriptionId: tenant.externalSubscriptionId,
      variantId: tenant.variantId,
      currentPeriodEnd: tenant.currentPeriodEnd,
      creditCardFee: tenant.creditCardFee,
      debitCardFee: tenant.debitCardFee,
      inviteCode: tenant.inviteCode,
    });

    const members = await this.userRepository.findAllByTenantId(tenantId);
    const activeCount = members.filter(m => m.status === "active" || m.status === "inactive").length;

    if (!tenantEntity.canAddUser(activeCount)) {
      throw new AppError(
        `Limite de colaboradores atingido para o seu plano (${tenantEntity.getMaxUsers()} usuário(s)). Faça upgrade para o plano PRO para adicionar mais colaboradores.`,
        403
      );
    }

    worker.status = "active";
    await this.userRepository.save(worker);

    res.json({ success: true, message: "Colaborador aprovado com sucesso!" });
  }

  async rejectRequest(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;

    const worker = await this.userRepository.findById(id);
    if (!worker || worker.tenantId !== tenantId || worker.status !== "pending") {
      throw new AppError("Solicitação de colaborador não encontrada ou já processada.", 404);
    }

    await this.userRepository.delete(id);

    res.json({ success: true, message: "Solicitação recusada com sucesso!" });
  }

  async removeMember(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;

    if (id === req.user!.id) {
      throw new AppError("Você não pode remover a si mesmo", 400);
    }

    const member = await this.userRepository.findById(id);
    if (!member || member.tenantId !== tenantId) {
      throw new AppError("Membro não encontrado na sua equipe", 404);
    }

    // Deleção Completa do Funcionário: Como colaboradores não possuem dados ou histórico
    // próprio (as lavagens e histórico pertencem ao lava-rápido/tenant), ao serem excluídos
    // da equipe, a conta dele é completamente apagada do banco de dados para liberar seu e-mail
    // e evitar contas fantasmas ocupando espaço.
    await this.userRepository.delete(id);

    res.status(204).send();
  }

  // --- Worker Actions --- //

  async getMyInvites(req: AuthenticatedRequest, res: Response): Promise<void> {
    const invites = await InviteModel.find({ email: req.user!.email, status: "pending" });
    res.json(invites);
  }

  async acceptInvite(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    
    const user = await this.userRepository.findById(req.user!.id);
    if (!user) throw new AppError("Usuário não encontrado", 404);

    const invite = await InviteModel.findOne({ _id: id, email: user.email, status: "pending" });
    if (!invite) {
      throw new AppError("Convite não encontrado ou já expirado", 404);
    }

    const tenant = await TenantModel.findById(invite.tenantId);
    if (!tenant) {
      throw new AppError("Empresa associada ao convite não foi encontrada", 404);
    }

    const tenantEntity = new Tenant({
      id: tenant.id,
      name: tenant.name,
      document: tenant.document,
      status: tenant.status as any,
      plan: tenant.plan as any,
      subscriptionStatus: tenant.subscriptionStatus as any,
      trialEndsAt: tenant.trialEndsAt,
      createdAt: tenant.createdAt,
      externalCustomerId: tenant.externalCustomerId,
      externalSubscriptionId: tenant.externalSubscriptionId,
      variantId: tenant.variantId,
      currentPeriodEnd: tenant.currentPeriodEnd,
      creditCardFee: tenant.creditCardFee,
      debitCardFee: tenant.debitCardFee,
      inviteCode: tenant.inviteCode,
    });

    const members = await this.userRepository.findAllByTenantId(invite.tenantId.toString());
    const activeCount = members.filter(m => m.status === "active" || m.status === "inactive").length;

    if (!tenantEntity.canAddUser(activeCount)) {
      throw new AppError(
        `Esta empresa já atingiu o limite de colaboradores do plano atual (${tenantEntity.getMaxUsers()} usuário(s)).`,
        403
      );
    }

    // Accept invite
    invite.status = "accepted";
    await invite.save();

    // Update user to point to new tenant and set role to worker
    user.tenantId = invite.tenantId.toString();
    user.role = "worker";
    user.status = "active";
    await this.userRepository.save(user);

    // Cancelar outros convites pendentes do mesmo email (opcional, mas boa pratica)
    await InviteModel.updateMany({ email: user.email, status: "pending" }, { status: "rejected" });

    res.json({ success: true, message: "Bem-vindo à nova equipe!", newTenantId: user.tenantId });
  }

  async rejectInvite(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    
    const invite = await InviteModel.findOne({ _id: id, email: req.user!.email, status: "pending" });
    if (!invite) {
      throw new AppError("Convite não encontrado", 404);
    }

    invite.status = "rejected";
    await invite.save();

    res.status(204).send();
  }
}
