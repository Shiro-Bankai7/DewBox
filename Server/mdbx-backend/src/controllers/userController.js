const pool = require('../db');
const UserModel = require('../models/user');
const { toPublicId } = require('../utils/publicId');

const userModel = new UserModel();

const UserController = {
    // Get current user profile
    async getMe(req, res) {
        console.log('[GET /users/me] Request received. User ID:', req.user.id);
        try {
            const userId = req.user.id;
            const user = await userModel.findById(userId);
            if (!user) {
                console.log('[GET /users/me] User not found:', userId);
                return res.status(404).json({ message: 'User not found.' });
            }
            const formattedUser = {
                name: user.name || `${user.firstname || ''} ${user.surname || ''}`.trim(),
                email: user.email,
                mobile: user.mobile,
                balance: user.balance,
            };
            console.log('[GET /users/me] User found:', formattedUser);
            res.status(200).json({ user: formattedUser });
        } catch (error) {
            console.error('[GET /users/me] Error:', error);
            res.status(500).json({ message: 'Server error fetching profile.' });
        }
    },

    // Get subscriber info for Profile.jsx (requires token)
    async getSubscriber(req, res) {
        console.log('[GET /users/subscriber] Request received. User ID:', req.user.id);
        try {
            const [rows] = await pool.query(
                `SELECT 
                    s.id, s.firstname, s.surname, s.address1, s.country, s.state, s.lga, s.dob,
                    s.mobile, s.alternatePhone, s.currency, s.referral, s.referralPhone,
                    s.nextOfKinName, s.nextOfKinContact, s.city, s.gender, s.userId, s.joinEsusu,
                    s.contribution_mode, s.ica_balance, s.piggy_balance, s.createdAt,
                    u.email, u.balance
                 FROM user u
                 LEFT JOIN subscribers s ON u.subscriber_id = s.id
                 WHERE u.id = ?`,
                [req.user.id]
            );
            if (!rows.length) {
                return res.status(404).json({ message: 'Subscriber not found.' });
            }
            if (!rows[0].id) {
                return res.status(404).json({ message: 'Subscriber not linked to this user.' });
            }
            const subscriber = {
                ...rows[0],
                publicId: toPublicId(`${req.user.id}:${rows[0].id}`),
            };
            res.status(200).json({ subscriber });
        } catch (error) {
            console.error('[GET /users/subscriber] Error:', error);
            res.status(500).json({ message: 'Server error fetching subscriber info.' });
        }
    },

    // Update user profile
    async updateProfile(req, res) {
        console.log('[PATCH /users/profile] Request received. User ID:', req.user.id, 'Body:', req.body);
        try {
            await userModel.updateProfile({
                id: req.user.id,
                ...req.body
            });
            console.log('[PATCH /users/profile] Profile updated for user:', req.user.id);
            
            // Fetch updated subscriber info
            const [userRows] = await pool.query('SELECT subscriber_id FROM user WHERE id = ?', [req.user.id]);
            const subscriberId = userRows[0]?.subscriber_id;
            const [subscriberRows] = await pool.query(
                `SELECT s.*, u.email, u.balance
                 FROM subscribers s
                 LEFT JOIN user u ON u.subscriber_id = s.id
                 WHERE s.id = ?`,
                [subscriberId]
            );
            const subscriber = subscriberRows[0]
                ? {
                    ...subscriberRows[0],
                    publicId: toPublicId(`${req.user.id}:${subscriberRows[0].id}`),
                }
                : null;
            
            res.json({ 
                message: 'Profile updated successfully',
                subscriber
            });
        } catch (err) {
            console.error('[PATCH /users/profile] Error:', err);
            res.status(500).json({ message: 'Failed to update profile', error: err.message });
        }
    }
};

module.exports = UserController;
