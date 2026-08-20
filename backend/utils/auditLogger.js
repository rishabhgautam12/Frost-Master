const ActivityLog = require("../models/ActivityLog");

const HIDDEN_FIELDS = new Set(["password", "__v", "updatedAt", "createdAt"]);

function normalize(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (value instanceof Map) return Object.fromEntries(value);
  if (value && typeof value.toObject === "function") return normalize(value.toObject());
  if (Array.isArray(value)) return value.map(normalize);
  if (value instanceof Date) return value.toISOString();
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !HIDDEN_FIELDS.has(key))
        .map(([key, val]) => [key, normalize(val)])
    );
  }
  return value;
}

function getPath(obj, path) {
  return path.split(".").reduce((acc, part) => {
    if (acc === undefined || acc === null) return undefined;
    return acc instanceof Map ? acc.get(part) : acc[part];
  }, obj);
}

function isEqual(a, b) {
  return JSON.stringify(normalize(a)) === JSON.stringify(normalize(b));
}

function toChanges(before, after, fields) {
  return fields
    .filter((field) => !HIDDEN_FIELDS.has(field))
    .map((field) => ({
      field,
      before: normalize(getPath(before, field)),
      after: normalize(getPath(after, field)),
    }))
    .filter((change) => !isEqual(change.before, change.after));
}

function createdChanges(doc, fields) {
  const source = normalize(doc);
  const keys = fields || Object.keys(source || {});
  return keys
    .filter((field) => !HIDDEN_FIELDS.has(field) && source[field] !== undefined)
    .map((field) => ({ field, before: null, after: source[field] }));
}

async function logActivity(req, details) {
  try {
    if (!req.user) return;
    await ActivityLog.create({
      actor: {
        id: req.user._id,
        name: req.user.name,
        username: req.user.username,
        role: req.user.role,
      },
      ...details,
      changes: details.changes || [],
      metadata: details.metadata || {},
    });
  } catch (err) {
    console.error("Failed to write activity log:", err.message);
  }
}

module.exports = {
  createdChanges,
  logActivity,
  normalize,
  toChanges,
};
