const db = require('../db');

class Subscriber {
  static async create(subscriberData) {
    const {
      firstname, surname, othername, address1, city, state, country,
      dob, gender, mobile, alternatePhone, currency, password,
      referral, referralPhone, nextOfKinName, nextOfKinContact, userId, lga
    } = subscriberData;

    const [result] = await db.query(
      `INSERT INTO subscribers 
       (firstname, surname, othername, address1, city, state, country, dob, gender, 
        mobile, alternatePhone, currency, password, referral, referralPhone, 
        nextOfKinName, nextOfKinContact, userId, lga)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [firstname, surname, othername, address1, city, state, country, dob, gender,
       mobile, alternatePhone, currency, password, referral, referralPhone,
       nextOfKinName, nextOfKinContact, userId, lga || null]
    );

    return result.insertId;
  }

  static async findById(id) {
    const [rows] = await db.query('SELECT * FROM subscribers WHERE id = ?', [id]);
    return rows[0];
  }

  static async findByMobile(mobile) {
    const [rows] = await db.query('SELECT * FROM subscribers WHERE mobile = ?', [mobile]);
    return rows[0];
  }

  static async findByUserId(userId) {
    const [rows] = await db.query('SELECT * FROM subscribers WHERE userId = ?', [userId]);
    return rows[0];
  }

  static async update(id, updateData) {
    const fields = Object.keys(updateData);
    const values = Object.values(updateData);
    const setClause = fields.map(field => `${field} = ?`).join(', ');

    await db.query(
      `UPDATE subscribers SET ${setClause} WHERE id = ?`,
      [...values, id]
    );

    return this.findById(id);
  }

  static async delete(id) {
    await db.query('DELETE FROM subscribers WHERE id = ?', [id]);
  }

  static async getAll(limit = 100, offset = 0) {
    const [rows] = await db.query(
      'SELECT * FROM subscribers LIMIT ? OFFSET ?',
      [limit, offset]
    );
    return rows;
  }
}

module.exports = Subscriber;
