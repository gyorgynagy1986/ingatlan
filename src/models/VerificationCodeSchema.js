import mongoose from 'mongoose';

const VerificationCodeSchema = new mongoose.Schema({
  identifier: {
    type: String,
    required: true,
  },
  token: {
    type: String,
    required: true,
  },
  expires: {
    type: Date,
    required: true,
  },
});

export default mongoose.models.VerificationCode || 
  mongoose.model('VerificationCode', VerificationCodeSchema);