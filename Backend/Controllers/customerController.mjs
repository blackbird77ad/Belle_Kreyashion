import Customer from '../Models/Customer.mjs';

export const identifyCustomer = async (req, res) => {
  try {
    const { name, phone } = req.body;
    if (!name || !phone) return res.status(400).json({ message: 'Name and phone required' });
    let customer = await Customer.findOne({ phone });
    if (!customer) customer = await Customer.create({ name, phone });
    res.json({ customer });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getOrderHistory = async (req, res) => {
  try {
    const { phone } = req.params;
    const customer = await Customer.findOne({ phone });
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    const Order = (await import('../Models/Order.mjs')).default;
    const orders = await Order.find({ 'customer.phone': phone }).sort({ createdAt: -1 });
    res.json({ customer, orders });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getAllCustomers = async (req, res) => {
  try {
    const customers = await Customer.find().sort({ createdAt: -1 });
    res.json(customers);
  } catch { res.status(500).json({ message: 'Server error' }); }
};
