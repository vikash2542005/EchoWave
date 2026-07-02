import mongoose, { Schema } from "mongoose";

const meetingSchema = new Schema({
    user_id: { type: String, required: true, index: true },
    meeting_id: { type: String, required: true },
    date: { type: Date, default: Date.now }
});

meetingSchema.index({ user_id: 1, meeting_id: 1 }, { unique: true });

const meeting = mongoose.model('Meeting', meetingSchema);

export default meeting;