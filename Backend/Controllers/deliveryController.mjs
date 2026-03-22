import DeliveryZone from '../Models/DeliveryZone.mjs';

export const getPublicZones = async (req, res) => {
  try {
    const zones = await DeliveryZone.find({ active: true }).sort({ fee: 1 });
    res.json(zones);
  } catch { res.status(500).json({ message: 'Server error' }); }
};

export const getAllZones = async (req, res) => {
  try {
    const zones = await DeliveryZone.find().sort({ fee: 1 });
    res.json(zones);
  } catch { res.status(500).json({ message: 'Server error' }); }
};

export const createZone = async (req, res) => {
  try {
    const zone = await DeliveryZone.create(req.body);
    res.status(201).json(zone);
  } catch (err) { res.status(400).json({ message: err.message }); }
};

export const updateZone = async (req, res) => {
  try {
    const zone = await DeliveryZone.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(zone);
  } catch (err) { res.status(400).json({ message: err.message }); }
};

export const deleteZone = async (req, res) => {
  try {
    await DeliveryZone.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch { res.status(500).json({ message: 'Server error' }); }
};
