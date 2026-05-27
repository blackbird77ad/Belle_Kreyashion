import Customer from '../Models/Customer.mjs';
import { signCustomerToken } from '../Middlewares/auth.mjs';

const normalizeEmail = (value) => value?.trim().toLowerCase() || '';

export const identifyCustomer = async (req, res) => {
  try {
    const name = req.body.name?.trim() || '';
    const phone = req.body.phone?.trim() || '';
    const email = normalizeEmail(req.body.email);

    if (!phone && !email) {
      return res.status(400).json({ message: 'Phone or email is required' });
    }

    let customer = null;
    if (phone) customer = await Customer.findOne({ phone });
    if (!customer && email) customer = await Customer.findOne({ email });

    if (!customer) {
      if (!name || !phone || !email) {
        return res.status(400).json({ message: 'Name, phone and email are required for new customers' });
      }
      customer = await Customer.create({ name, phone, email });
    } else {
      if (phone && customer.phone !== phone) {
        const phoneOwner = await Customer.findOne({ phone });
        if (phoneOwner && String(phoneOwner._id) !== String(customer._id)) {
          return res.status(409).json({ message: 'That phone number is already linked to another customer' });
        }
        customer.phone = phone;
      }

      if (email && customer.email !== email) {
        const emailOwner = await Customer.findOne({ email });
        if (emailOwner && String(emailOwner._id) !== String(customer._id)) {
          return res.status(409).json({ message: 'That email is already linked to another customer' });
        }
        customer.email = email;
      }

      if (name && customer.name !== name && !/^\+?\d/.test(name)) {
        customer.name = name;
      }

      await customer.save();
    }

    res.json({
      customer,
      customerToken: signCustomerToken(customer),
    });
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

export const getAllCustomers = async (_, res) => {
  try {
    const customers = await Customer.find().sort({ createdAt: -1 });
    res.json(customers);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};
