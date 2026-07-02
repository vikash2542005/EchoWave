import User from '../models/user.model.js';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { StatusCodes } from 'http-status-codes';
import Meeting from '../models/mettings.model.js';


//login
const login = async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Username and password are required' });
    }

    try {
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(StatusCodes.NOT_FOUND).json({ message: 'User not found' });
        }

        let isPasswordValid = await bcrypt.compare(password, user.password);
        
        if (isPasswordValid) {
            const token = crypto.randomBytes(64).toString('hex');
            user.token = token;
            await user.save();

            return res.status(StatusCodes.OK).json({ message: 'Login successful', token });
        }else{
            return res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Invalid username or password' });
        }
    } catch (error) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Server error' });
    }
};

// signup
const signup = async (req, res) => {
    const { name, username, password } = req.body; 

    try {
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(StatusCodes.CONFLICT).json({ message: 'User already exists' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({
            name: name,
            username: username,
            password: hashedPassword
        });
        await newUser.save();
        res.status(StatusCodes.CREATED).json({ message: 'User registered successfully' });
    } catch (error) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Server error' });
    }


};

const getUserHistory = async (req, res) => {
    const { token } = req.query;

    try {
        const user = await User.findOne({ token });

        if (!user) {
            return res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Invalid or expired token' });
        }

        const meetings = await Meeting.find({ user_id: user.username }).sort({ date: -1 });
        return res.json(meetings);
    } catch (error) {
        console.error('getUserHistory error:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Server error' });
    }
}

const addUserHistory = async (req, res) => {
    const { token, meeting_id } = req.body;

    if (!token || !meeting_id) {
        return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Token and meeting ID are required' });
    }

    try {
        const user = await User.findOne({ token });

        if (!user) {
            return res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Invalid or expired token' });
        }

        const existingMeeting = await Meeting.findOne({
            user_id: user.username,
            meeting_id
        });

        if (existingMeeting) {
            return res.json({ message: 'Meeting already in history' });
        }

        const newMeeting = new Meeting({
            user_id: user.username,
            meeting_id
        });

        await newMeeting.save();
        return res.json({ message: 'Meeting history added successfully' });
    } catch (error) {
        console.error('addUserHistory error:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: error?.message || 'Server error',
        });
    }
}




export { login, signup, getUserHistory, addUserHistory };