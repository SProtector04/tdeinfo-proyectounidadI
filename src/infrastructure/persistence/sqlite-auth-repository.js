import { AuthRepository } from '../../domain/repositories/auth-repository.js';
import { User } from '../../domain/entities/user.js';

export class SqliteAuthRepository extends AuthRepository {
  constructor(db) {
    super();
    this.db = db;
  }

  #toUser(row) {
    if (!row) return null;
    return new User({
      id: row.id,
      name: row.name,
      username: row.username,
      passwordHash: row.password_hash,
      role: row.role,
      active: Boolean(row.active),
    });
  }

  findUserByUsername(username) {
    return this.#toUser(this.db.prepare('SELECT * FROM users WHERE username = ?').get(username));
  }

  findUserById(id) {
    return this.#toUser(this.db.prepare('SELECT * FROM users WHERE id = ?').get(id));
  }

  listUsers() {
    return this.db
      .prepare('SELECT * FROM users ORDER BY id')
      .all()
      .map((r) => this.#toUser(r))
      .map((u) => ({
        id: u.id,
        name: u.name,
        username: u.username,
        role: u.role,
        active: u.active,
      }));
  }

  createUser({ name, username, passwordHash, role }) {
    const info = this.db
      .prepare('INSERT INTO users (name, username, password_hash, role) VALUES (?, ?, ?, ?)')
      .run(name, username, passwordHash, role);
    return Number(info.lastInsertRowid);
  }

  createSession(tokenHash, userId, expiresAt) {
    this.db
      .prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
      .run(tokenHash, userId, expiresAt);
  }

  findUserBySessionTokenHash(tokenHash) {
    const row = this.db
      .prepare(
        `SELECT u.* FROM sessions s
         JOIN users u ON u.id = s.user_id
         WHERE s.token_hash = ? AND s.expires_at > datetime('now')`,
      )
      .get(tokenHash);
    return this.#toUser(row);
  }

  deleteSession(tokenHash) {
    this.db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
  }
}
