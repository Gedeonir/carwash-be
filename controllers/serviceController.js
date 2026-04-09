const Service = require("../models/Service");
const { success, created, notFound } = require("../utils/response");
const { asyncHandler } = require("../middlewares/error");

// ══════════════════════════════════════════════════════════
// SERVICE CONTROLLER
// ══════════════════════════════════════════════════════════

const getServices = asyncHandler(async (req, res) => {
  const services = await Service.find({ isActive: true }).sort("sortOrder");
  success(res, { services });
});

const getService = asyncHandler(async (req, res) => {
  const service = await Service.findOne({ $or: [{ _id: req.params.id }, { slug: req.params.id }], isActive: true });
  if (!service) return notFound(res, "Service not found");
  success(res, { service });
});

const createService = asyncHandler(async (req, res) => {
  const service = await Service.create(req.body);
  created(res, { service }, "Service created");
});

const updateService = asyncHandler(async (req, res) => {
  const service = await Service.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!service) return notFound(res, "Service not found");
  success(res, { service }, "Service updated");
});

const deleteService = asyncHandler(async (req, res) => {
  const service = await Service.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!service) return notFound(res, "Service not found");
  success(res, {}, "Service deactivated");
});

module.exports = {
  // Services
  getServices, getService, createService, updateService, deleteService,
};