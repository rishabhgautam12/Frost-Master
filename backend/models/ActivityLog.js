const mongoose = require("mongoose");

const changeSchema = new mongoose.Schema(
  {
    field: { type: String, required: true },
    before: { type: mongoose.Schema.Types.Mixed },
    after: { type: mongoose.Schema.Types.Mixed },
  },
  { _id: false }
);

const activityLogSchema = new mongoose.Schema(
  {
    actor: {
      id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      name: { type: String, required: true },
      username: { type: String, required: true },
      role: { type: String, enum: ["admin", "staff"], required: true },
    },
    action: {
      type: String,
      enum: ["created", "updated", "deleted", "cancelled", "payment", "stock"],
      required: true,
    },
    entityType: { type: String, required: true },
    entityId: { type: mongoose.Schema.Types.ObjectId },
    entityLabel: { type: String, default: "" },
    summary: { type: String, required: true },
    changes: { type: [changeSchema], default: [] },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ "actor.id": 1, createdAt: -1 });
activityLogSchema.index({ entityType: 1, createdAt: -1 });

module.exports = mongoose.model("ActivityLog", activityLogSchema);
