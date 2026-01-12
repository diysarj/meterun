import mongoose from "mongoose";

const connectDB = async () => {
    try {
        // Skip if already connected
        if (mongoose.connection.readyState === 1) {
            console.log("MongoDB already connected");
            return;
        }

        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`MongoDB Connection Error: ${error.message}`);
        // Don't exit in serverless environment, throw instead
        throw error;
    }
};

export default connectDB;
