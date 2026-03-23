import Consultation from '../Models/Consultation.mjs';

export const getPublicConsultations = async (req, res) => {
  try {
    const items = await Consultation.find({ active: true }).sort({ createdAt: 1 });
    res.json(items);
  } catch { res.status(500).json({ message: 'Server error' }); }
};

export const getAllConsultations = async (req, res) => {
  try {
    res.json(await Consultation.find().sort({ createdAt: 1 }));
  } catch { res.status(500).json({ message: 'Server error' }); }
};

export const createConsultation = async (req, res) => {
  try {
    res.status(201).json(await Consultation.create(req.body));
  } catch (err) { res.status(400).json({ message: err.message }); }
};

export const updateConsultation = async (req, res) => {
  try {
    const item = await Consultation.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!item) return res.status(404).json({ message: 'Not found' });
    res.json(item);
  } catch (err) { res.status(400).json({ message: err.message }); }
};

export const deleteConsultation = async (req, res) => {
  try {
    await Consultation.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch { res.status(500).json({ message: 'Server error' }); }
};

export const toggleConsultation = async (req, res) => {
  try {
    const item = await Consultation.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Not found' });
    item.active = !item.active;
    await item.save();
    res.json(item);
  } catch { res.status(500).json({ message: 'Server error' }); }
};
