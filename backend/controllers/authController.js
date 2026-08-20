const jwt  = require("jsonwebtoken");
const User = require("../models/User");
const ActivityLog = require("../models/ActivityLog");
const { createdChanges, logActivity, toChanges } = require("../utils/auditLogger");

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });

const safeUser = (u) => ({
  id:          u._id,
  name:        u.name,
  username:    u.username,
  role:        u.role,
  isActive:    u.isActive,
  permissions: u.role === "admin" ? "all" : Object.fromEntries(u.permissions),
  createdAt:   u.createdAt,
});

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ success: false, message: "Username and password required" });

    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user || !user.isActive)
      return res.status(401).json({ success: false, message: "Invalid credentials or account disabled" });

    const match = await user.matchPassword(password);
    if (!match)
      return res.status(401).json({ success: false, message: "Invalid credentials" });

    const token = signToken(user._id);
    res.json({ success: true, token, user: safeUser(user) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/auth/me
exports.getMe = async (req, res) => {
  const u = await User.findById(req.user._id);
  res.json({ success: true, user: safeUser(u) });
};

// ── Staff Management (Admin only) ──────────────────────────────────────────────

// GET /api/auth/staff  — list all non-admin users
exports.getStaff = async (req, res) => {
  try {
    if (req.user.role !== "admin")
      return res.status(403).json({ success: false, message: "Admin access required" });
    const staff = await User.find({ role: "staff" }).sort({ createdAt: -1 });
    res.json({ success: true, data: staff.map(safeUser) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/auth/staff — create staff
exports.createStaff = async (req, res) => {
  try {
    if (req.user.role !== "admin")
      return res.status(403).json({ success: false, message: "Admin access required" });

    const { name, username, password, permissions } = req.body;
    if (!name || !username || !password)
      return res.status(400).json({ success: false, message: "Name, username, and password are required" });

    const existing = await User.findOne({ username: username.toLowerCase() });
    if (existing)
      return res.status(400).json({ success: false, message: "Username already taken" });

    const user = await User.create({
      name,
      username,
      password,
      role: "staff",
      permissions: permissions || {},
    });

    await logActivity(req, {
      action: "created",
      entityType: "Staff",
      entityId: user._id,
      entityLabel: user.name,
      summary: `Created staff member ${user.name}`,
      changes: createdChanges(safeUser(user), ["name", "username", "role", "isActive", "permissions"]),
    });

    res.status(201).json({ success: true, data: safeUser(user), message: "Staff member created" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/auth/staff/:id — update staff (name, password, permissions, isActive)
exports.updateStaff = async (req, res) => {
  try {
    if (req.user.role !== "admin")
      return res.status(403).json({ success: false, message: "Admin access required" });

    const user = await User.findOne({ _id: req.params.id, role: "staff" });
    if (!user)
      return res.status(404).json({ success: false, message: "Staff member not found" });

    const { name, password, permissions, isActive } = req.body;
    const before = safeUser(user);

    if (name)     user.name     = name;
    if (isActive !== undefined) user.isActive = isActive;
    if (password) user.password = password; // will be hashed by pre-save hook

    if (permissions && typeof permissions === "object") {
      Object.entries(permissions).forEach(([k, v]) => user.permissions.set(k, v));
    }

    await user.save();
    const changes = toChanges(before, safeUser(user), ["name", "isActive", "permissions"]);
    if (password) changes.push({ field: "password", before: "unchanged", after: "changed" });

    if (changes.length > 0) {
      await logActivity(req, {
        action: "updated",
        entityType: "Staff",
        entityId: user._id,
        entityLabel: user.name,
        summary: `Updated staff member ${user.name}`,
        changes,
      });
    }

    res.json({ success: true, data: safeUser(user), message: "Staff member updated" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/auth/staff/:id
exports.deleteStaff = async (req, res) => {
  try {
    if (req.user.role !== "admin")
      return res.status(403).json({ success: false, message: "Admin access required" });

    const user = await User.findOne({ _id: req.params.id, role: "staff" });
    if (!user)
      return res.status(404).json({ success: false, message: "Staff member not found" });

    const deleted = safeUser(user);
    await user.deleteOne();
    await logActivity(req, {
      action: "deleted",
      entityType: "Staff",
      entityId: user._id,
      entityLabel: user.name,
      summary: `Deleted staff member ${user.name}`,
      changes: Object.entries(deleted)
        .filter(([field]) => !["id", "createdAt"].includes(field))
        .map(([field, value]) => ({ field, before: value, after: null })),
    });

    res.json({ success: true, message: "Staff member deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/auth/activity-logs — admin audit trail
exports.getActivityLogs = async (req, res) => {
  try {
    if (req.user.role !== "admin")
      return res.status(403).json({ success: false, message: "Admin access required" });

    const { actor, action, entityType, from, to, limit = 200 } = req.query;
    const filter = {};
    if (actor) filter["actor.id"] = actor;
    if (action) filter.action = action;
    if (entityType) filter.entityType = entityType;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to + "T23:59:59");
    }

    const logs = await ActivityLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(Math.min(+limit || 200, 500));

    res.json({ success: true, data: logs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
