import { User } from '../../domain/entities/user.js';
import { ConflictError, ValidationError } from '../../domain/errors.js';

export class ListUsers {
  constructor({ authRepository }) {
    this.authRepository = authRepository;
  }

  async execute() {
    return this.authRepository.listUsers();
  }
}

export class CreateUser {
  constructor({ authRepository, passwordService, inventoryRepository, transaction }) {
    this.authRepository = authRepository;
    this.passwordService = passwordService;
    this.inventoryRepository = inventoryRepository;
    this.transaction = transaction;
  }

  async execute({ name, username, password, role, actorUserId }) {
    if (!password || String(password).length < 6) {
      throw new ValidationError('La contrasena debe tener al menos 6 caracteres');
    }
    const user = new User({ name, username, passwordHash: null, role });
    const passwordHash = this.passwordService.hash(password);

    let id;
    await this.transaction(async () => {
      const existing = await this.authRepository.findUserByUsername(user.username);
      if (existing) throw new ConflictError(`El usuario "${user.username}" ya existe`);
      id = await this.authRepository.createUser({
        name: user.name,
        username: user.username,
        passwordHash,
        role: user.role,
      });
      await this.inventoryRepository.addAudit({
        userId: actorUserId,
        action: 'CREATE',
        entity: 'user',
        entityId: id,
        result: `Usuario "${user.username}" (${user.role}) creado`,
      });
    });
    return { id };
  }
}
