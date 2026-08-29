/**
 * Server-only backend wiring. Do not import from client components.
 * Product names stay Identity / Cinema / Continuity / Drive in the UI.
 */
export const backend = {
  identity: process.env.IDENTITY_API_URL || process.env.LOCAL_QUEUE_URL || "",
  cinema: process.env.CINEMA_API_URL || process.env.LOCAL_QUEUE_URL || "",
  continuity: process.env.CONTINUITY_API_URL || process.env.LOCAL_QUEUE_URL || "",
  drive: process.env.DRIVE_API_URL || process.env.LOCAL_QUEUE_URL || "",
  workflows: {
    identity: "workflows/identity_i2v.json",
    cinema: "workflows/cinema_i2v.json",
    continuity: "workflows/continuity_flf.json",
    drive: "workflows/drive_motion.json",
  },
};
