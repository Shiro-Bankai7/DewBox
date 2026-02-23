const pool = require('../db');
const { hashPassword, validatePassword } = require('../utils/hash');
const { generateToken } = require('../utils/token');

class UserModel {
    async create(userData) {
        // Check if mobile is already registered in user table
        const [existingUser] = await pool.query('SELECT id FROM user WHERE mobile = ?', [userData.mobile]);
        if (existingUser.length > 0) {
            throw new Error('Mobile already registered');
        }
        // Insert into subscribers
        const dobFormatted = userData.dob ? new Date(userData.dob).toISOString().slice(0, 10) : null;
        const [subscriberResult] = await pool.query(
            `INSERT INTO subscribers (firstname, address1, country, state, dob, mobile, alternatePhone, currency, referral, referralPhone, nextOfKinName, nextOfKinContact, surname, city, gender, password, othername, lga, joinEsusu) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                userData.firstname,
                userData.address1,
                userData.country,
                userData.state,
                dobFormatted,
                userData.mobile,
                userData.alternatePhone,
                userData.currency,
                userData.referral,
                userData.referralPhone,
                userData.nextOfKinName,
                userData.nextOfKinContact,
                userData.surname,
                userData.city,
                userData.gender,
                userData.password,
                userData.othername || null,
                userData.lga || null,
                userData.joinEsusu || 'no'
            ]
        );
        const subscriberId = subscriberResult.insertId;
        // Insert into user (use 'firstname' + 'surname' for 'name')
        const fullName = `${userData.firstname || ''} ${userData.surname || ''}`.trim();
        await pool.query(
            `INSERT INTO user (id, name, email, mobile, password, balance, subscriber_id) VALUES (UUID(), ?, ?, ?, ?, ?, ?)`,
            [fullName, userData.email, userData.mobile, userData.password, userData.balance || 0, subscriberId]
        );
        // Fetch the UUID of the user just inserted
        const [userRows] = await pool.query('SELECT id, name, email, mobile, password, balance FROM user WHERE mobile = ?', [userData.mobile]);
        const userId = userRows[0]?.id;
        // Insert into users table for validation (only use fields that exist)
        const [existingUsers] = await pool.query('SELECT id FROM users WHERE mobile = ?', [userData.mobile]);
        if (existingUsers.length === 0) {
            await pool.query(
                `INSERT INTO users (email, password, mobile, random_number) VALUES (?, ?, ?, ?)`,
                [userData.email, userData.password, userData.mobile, Math.floor(100000 + Math.random() * 900000).toString()]
            );
        }
        // Update subscriber with userId
        await pool.query('UPDATE subscribers SET userId = ? WHERE id = ?', [userId, subscriberId]);
        return { ...userRows[0], subscriberId };
    }

    async getUserByEmail(email) {
        const [rows] = await pool.query('SELECT * FROM user WHERE email = ?', [email]);
        return rows[0] || null;
    }

    async getUserByMobile(mobile) {
        const [rows] = await pool.query('SELECT * FROM user WHERE mobile = ?', [mobile]);
        return rows[0] || null;
    }

    async getUsersByMobiles(mobiles = []) {
        const uniqueMobiles = [...new Set(
            (mobiles || [])
                .map((m) => String(m || '').trim())
                .filter(Boolean)
        )];

        if (!uniqueMobiles.length) return [];

        const placeholders = uniqueMobiles.map(() => '?').join(', ');
        const [rows] = await pool.query(
            `SELECT * FROM user WHERE mobile IN (${placeholders})`,
            uniqueMobiles
        );
        return rows;
    }

    async findById(id) {
        const [rows] = await pool.query('SELECT * FROM user WHERE id = ?', [id]);
        return rows[0] || null;
    }

    async updatePasswordById(id, hashedPassword) {
        await pool.query('UPDATE user SET password = ? WHERE id = ?', [hashedPassword, id]);
    }

    async updateProfile({ id, email, mobile, firstname, surname, city, state, country, address1, gender, dob, alternatePhone, currency, referral, referralPhone, nextOfKinName, nextOfKinContact, lga }) {
        // Get current user + subscriber_id so partial updates don't clear existing values.
        const [userRows] = await pool.query('SELECT subscriber_id, email, mobile FROM user WHERE id = ?', [id]);
        if (userRows.length === 0) {
            throw new Error('User not found');
        }
        const subscriberId = userRows[0].subscriber_id;
        const currentEmail = userRows[0].email;
        const currentMobile = userRows[0].mobile;

        await pool.query('UPDATE user SET email = ?, mobile = ? WHERE id = ?', [email ?? currentEmail, mobile ?? currentMobile, id]);

        const [subscriberRows] = await pool.query('SELECT * FROM subscribers WHERE id = ?', [subscriberId]);
        const currentSubscriber = subscriberRows[0] || {};
        
        // Update subscribers table with all profile fields
        const dobFormatted = dob ? new Date(dob).toISOString().slice(0, 10) : null;
        await pool.query(
            `UPDATE subscribers SET 
                firstname = ?, 
                surname = ?, 
                city = ?, 
                state = ?, 
                lga = ?,
                country = ?, 
                address1 = ?, 
                gender = ?,
                dob = ?,
                alternatePhone = ?,
                currency = ?,
                referral = ?,
                referralPhone = ?,
                nextOfKinName = ?,
                nextOfKinContact = ?
            WHERE id = ?`,
            [
                firstname ?? currentSubscriber.firstname ?? '',
                surname ?? currentSubscriber.surname ?? '',
                city ?? currentSubscriber.city ?? '',
                state ?? currentSubscriber.state ?? '',
                lga ?? currentSubscriber.lga ?? '',
                country ?? currentSubscriber.country ?? '',
                address1 ?? currentSubscriber.address1 ?? '',
                gender ?? currentSubscriber.gender ?? '',
                dobFormatted ?? currentSubscriber.dob ?? null,
                alternatePhone ?? currentSubscriber.alternatePhone ?? '',
                currency ?? currentSubscriber.currency ?? '',
                referral ?? currentSubscriber.referral ?? '',
                referralPhone ?? currentSubscriber.referralPhone ?? '',
                nextOfKinName ?? currentSubscriber.nextOfKinName ?? '',
                nextOfKinContact ?? currentSubscriber.nextOfKinContact ?? '',
                subscriberId
            ]
        );
    }
}

module.exports = UserModel;
