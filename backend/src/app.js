import express from 'express';
import {createServer} from 'http';
import {Server} from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import { connectToSocket } from './controllers/socketManager.js';
import userRoutes from './routes/users.routes.js';
import Meeting from './models/mettings.model.js';
const PORT = process.env.PORT || 3001;



const app = express();

// MongoDB Connection
const MONGO_URI = process.env.MongoURL || 'mongodb+srv://heyvikash2005_db_user:vikash9569@echowave.j9ieb4e.mongodb.net/?appName=EchoWave';

// MongoDB Connection with proper async handling
const connectDB = async () => {
    try {
        await mongoose.connect(MONGO_URI);

        try {
            await Meeting.collection.dropIndex('user_id_1');
            console.log('Dropped legacy unique index on meetings.user_id');
        } catch (indexError) {
            if (indexError?.code !== 27) {
                console.warn('Could not drop legacy meetings index:', indexError?.message || indexError);
            }
        }

        await mongoose.connection.syncIndexes();
        console.log('MongoDB connected successfully');
        
        // Start server after DB connection is established
        server.listen(PORT, () => {
            console.log(`app is running on port ${PORT}`);
        });
    } catch (err) {
        console.error('MongoDB connection error:', err);
        process.exit(1); // Exit if DB connection fails
    }
};

// Create server
const server = createServer(app);
const io = connectToSocket(server,{
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        allowedHeaders: ['*'],
        credentials: true,
    }
});

app.set("port", process.env.PORT || 3001);

// middlewares
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://echowavefrontend-j0yz.onrender.com',
];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(null, true);
        }
    },
    credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/users', userRoutes);

// Routes
app.get('/', (req, res) => {
    res.send('Hello World!');
});

// Connect to MongoDB and start server
connectDB();
