import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Admin from '../Models/Admin.mjs';

const sign = () => jwt.sign({ admin: true }, process.env.JWT_SECRET, { expiresIn: '30d' });

export const getStatus = async (req, res) => {
  try {
    const admin = await Admin.findOne();
    res.json({ setup: !!admin });
  } catch { res.status(500).json({ message: 'Server error' }); }
};

export const setup = async (req, res) => {
  try {
    const existing = await Admin.findOne();
    if (existing) return res.status(400).json({ message: 'Admin already set up' });
    const { pin } = req.body;
    if (!pin || pin.length < 4) return res.status(400).json({ message: 'PIN must be at least 4 digits' });
    const pinHash = await bcrypt.hash(pin, 10);
    await Admin.create({ pinHash });
    res.json({ token: sign() });
  } catch { res.status(500).json({ message: 'Server error' }); }
};

export const login = async (req, res) => {
  try {
    const { pin } = req.body;
    const admin = await Admin.findOne();
    if (!admin) return res.status(404).json({ message: 'Admin not set up' });
    const match = await bcrypt.compare(pin, admin.pinHash);
    if (!match) return res.status(401).json({ message: 'Incorrect PIN' });
    res.json({ token: sign() });
  } catch { res.status(500).json({ message: 'Server error' }); }
};

export const resetPin = async (req, res) => {
  try {
    const { masterPin, newPin } = req.body;
    if (masterPin !== process.env.MASTER_RESET_PIN) return res.status(401).json({ message: 'Invalid master PIN' });
    if (!newPin || newPin.length < 4) return res.status(400).json({ message: 'PIN must be at least 4 digits' });
    const pinHash = await bcrypt.hash(newPin, 10);
    await Admin.findOneAndUpdate({}, { pinHash }, { upsert: true });
    res.json({ token: sign() });
  } catch { res.status(500).json({ message: 'Server error' }); }
};
