import mongoose from "mongoose";

export const VerificationTokenSchema = new mongoose.Schema({
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

export const VerificationToken = mongoose.models.VerificationToken || 
  mongoose.model("VerificationToken", VerificationTokenSchema);