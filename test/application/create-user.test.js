import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CreateUser } from '../../src/application/use-cases/users.js';
import { ValidationError, ConflictError } from '../../src/domain/errors.js';
import {
  makeFakeAuthRepository,
  makeFakeInventoryRepository,
  makeFakePasswordService,
  fakeTransaction,
} from '../helpers/fake-repos.js';

function makeSut({ users = [] } = {}) {
  const authRepository = makeFakeAuthRepository({ users });
  const inventoryRepository = makeFakeInventoryRepository();
  const createUser = new CreateUser({
    authRepository,
    passwordService: makeFakePasswordService(),
    inventoryRepository,
    transaction: fakeTransaction,
  });
  return { createUser, authRepository, inventoryRepository };
}

test('CreateUser: crea usuario con hash y auditoria', async () => {
  const sut = makeSut();
  const result = await sut.createUser.execute({
    name: 'Ana Perez',
    username: 'ana',
    password: 'secreta123',
    role: 'CAJERO',
    actorUserId: 1,
  });

  assert.ok(result.id >= 1);
  const created = sut.authRepository.calls.createUser[0];
  assert.equal(created.username, 'ana');
  assert.equal(created.passwordHash, 'hashed:secreta123');
  assert.equal(created.role, 'CAJERO');
  assert.equal(sut.inventoryRepository.calls.addAudit[0].action, 'CREATE');
});

test('CreateUser: rechaza username duplicado', async () => {
  const sut = makeSut({ users: [{ id: 1, username: 'admin', role: 'ADMIN' }] });
  await assert.rejects(
    () => sut.createUser.execute({ name: 'Otro', username: 'admin', password: 'secreta123', role: 'CAJERO' }),
    ConflictError,
  );
  assert.equal(sut.authRepository.calls.createUser.length, 0);
});

test('CreateUser: rechaza contrase corta', async () => {
  const sut = makeSut();
  await assert.rejects(
    () => sut.createUser.execute({ name: 'Ana', username: 'ana', password: '123', role: 'CAJERO' }),
    ValidationError,
  );
  assert.equal(sut.authRepository.calls.createUser.length, 0);
});
