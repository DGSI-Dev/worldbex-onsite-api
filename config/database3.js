import mysql from "mysql2/promise";

class Database {
  constructor() {
    this.conn = mysql.createPool({
      host: process.env.DBA_HOST,
      user: process.env.DBA_USER,
      password: process.env.DBA_PASS,
      database: process.env.DBA_DATABASE,
      multipleStatements: false,
      connectionLimit: 500,
      waitForConnections: true,
      queueLimit: 0,
    });
  }
  async query(sql, args) {
    let [rows, fields] = await this.conn.query(sql, args);
    return rows;
  }

  async beginTransaction() {
    const conn = await this.conn.getConnection();
    await conn.beginTransaction();
    return conn;
  }

  async commit(conn) {
    await conn.commit();
    conn.release();
  }

  async rollback(conn) {
    await conn.rollback();
    conn.release();
  }

  getConnection() {
    return this.conn.getConnection();
  }
}
export default Database;
