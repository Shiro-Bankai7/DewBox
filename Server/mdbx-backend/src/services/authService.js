const jwt = require('jsonwebtoken');
const UserModel = require('../models/user');
const { hashPassword, validatePassword } = require('../utils/hash');

const userModel = new UserModel();

// SECURITY FIX: No fallback - JWT_SECRET must be set
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('CRITICAL SECURITY ERROR: JWT_SECRET is not set in environment variables!');
  console.error('Generate one with: openssl rand -base64 64');
  process.exit(1);
}

class AuthService {
  async createUser(userData) {
    if (!userData.mobile || !userData.password) {
      throw new Error('Mobile and password are required');
    }

    const existing = await userModel.getUserByMobile(userData.mobile);
    if (existing) {
      throw new Error('Mobile already registered');
    }

    userData.password = await hashPassword(userData.password);
    userData.fullName = userData.fullName
      || userData.name
      || `${userData.firstname || ''} ${userData.surname || ''}`.trim();

    const newUser = await userModel.create(userData);
    if (!newUser) throw new Error('Failed to create user');

    const token = jwt.sign(
      {
        id: newUser.id,
        mobile: newUser.mobile,
        iat: Math.floor(Date.now() / 1000)
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    if (!token) throw new Error('Failed to generate token');
    return { user: newUser, token };
  }

  buildMobileCandidates(rawMobile) {
    const input = String(rawMobile || '').trim();
    const digits = input.replace(/\D/g, '');
    const candidates = new Set();

    if (!digits) return [];

    candidates.add(digits);
    candidates.add(`+${digits}`);

    // Nigerian local <-> international variants.
    if (digits.startsWith('0') && digits.length === 11) {
      const local = digits;
      const intl = `234${digits.slice(1)}`;
      candidates.add(local);
      candidates.add(intl);
      candidates.add(`+${intl}`);
    }

    if (digits.startsWith('234') && digits.length === 13) {
      const intl = digits;
      const local = `0${digits.slice(3)}`;
      candidates.add(intl);
      candidates.add(local);
      candidates.add(`+${intl}`);
    }

    if (!digits.startsWith('234') && digits.length === 10) {
      const intl = `234${digits}`;
      candidates.add(intl);
      candidates.add(`+${intl}`);
    }

    return [...candidates].filter(Boolean);
  }

  isBcryptHash(value) {
    return /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(String(value || '').trim());
  }

  async verifyAndUpgradePassword(user, plainPassword) {
    const inputPassword = String(plainPassword ?? '');
    const storedPassword = String(user?.password ?? '').trim();

    if (!storedPassword) return false;

    if (this.isBcryptHash(storedPassword)) {
      const directMatch = await validatePassword(inputPassword, storedPassword);
      if (directMatch) return true;

      // Guard against accidental whitespace in pasted credentials.
      const trimmedInput = inputPassword.trim();
      if (trimmedInput !== inputPassword) {
        return await validatePassword(trimmedInput, storedPassword);
      }

      return false;
    }

    // Legacy plaintext fallback: authenticate once, then upgrade to bcrypt.
    if (storedPassword === inputPassword || storedPassword === inputPassword.trim()) {
      const upgradedHash = await hashPassword(inputPassword.trim());
      await userModel.updatePasswordById(user.id, upgradedHash);
      return true;
    }

    return false;
  }

  async loginUser(mobile, password) {
    if (!mobile || !password) return { user: null, token: null };

    const mobileCandidates = this.buildMobileCandidates(mobile);
    if (!mobileCandidates.length) return { user: null, token: null };

    const users = await userModel.getUsersByMobiles(mobileCandidates);
    if (!users.length) return { user: null, token: null };

    let authenticatedUser = null;
    for (const candidateUser of users) {
      const isMatch = await this.verifyAndUpgradePassword(candidateUser, password);
      if (isMatch) {
        authenticatedUser = candidateUser;
        break;
      }
    }

    if (!authenticatedUser) return { user: null, token: null };

    const token = jwt.sign(
      {
        id: authenticatedUser.id,
        mobile: authenticatedUser.mobile,
        iat: Math.floor(Date.now() / 1000)
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return { user: authenticatedUser, token };
  }
}

module.exports = new AuthService();
module.exports.userModel = userModel;
