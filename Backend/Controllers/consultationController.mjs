import ConsultationSettings from '../Models/ConsultationSettings.mjs';

export const getSettings = async (req, res) => {
  try {
    let settings = await ConsultationSettings.findOne();
    if (!settings) settings = await ConsultationSettings.create({ paidFee: 0 });
    res.json(settings);
  } catch { res.status(500).json({ message: 'Server error' }); }
};

export const updateSettings = async (req, res) => {
  try {
    let settings = await ConsultationSettings.findOne();
    if (!settings) settings = await ConsultationSettings.create(req.body);
    else { settings.paidFee = req.body.paidFee; settings.active = req.body.active; await settings.save(); }
    res.json(settings);
  } catch { res.status(500).json({ message: 'Server error' }); }
};
