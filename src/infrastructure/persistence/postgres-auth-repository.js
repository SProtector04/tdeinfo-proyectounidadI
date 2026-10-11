import { AuthRepository } from '../../domain/repositories/auth-repository.js';
import { User } from '../../domain/entities/user.js';

export class PostgresAuthRepository extends AuthRepository {
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

  async findUserByUsername(username) {
    const rows = await this.db.query('SELECT * FROM users WHERE username = $1', [username]);
    return this.#toUser(rows[0]);
  }

  async findUserById(id) {
    const rows = await this.db.query('SELECT * FROM users WHERE id = $1', [id]);
    return this.#toUser(rows[0]);
  }

  async listUsers() {
    const rows = await this.db.query('SELECT * FROM users ORDER BY id');
    return rows
      .map((r) => this.#toUser(r))
      .map((u) => ({
        id: u.id,
        name: u.name,
        username: u.username,
        role: u.role,
        active: u.active,
      }));
  }

  async createUser({ name, username, passwordHash, role }) {
    const rows = await this.db.query(
      'INSERT INTO users (name, username, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id',
      [name, username, passwordHash, role],
    );
    return rows[0].id;
  }

  async createSession(tokenHash, userId, expiresAt) {
    await this.db.query(
      'INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)',
      [tokenHash, userId, expiresAt],
    );
  }

  async findUserBySessionTokenHash(tokenHash) {
    const rows = await this.db.query(
      `SELECT u.* FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = $1 AND s.expires_at > NOW()`,
      [tokenHash],
    );
    return this.#toUser(rows[0]);
  }

  async deleteSession(tokenHash) {
    await this.db.query('DELETE FROM sessions WHERE token_hash = $1', [tokenHash]);
  }
}
