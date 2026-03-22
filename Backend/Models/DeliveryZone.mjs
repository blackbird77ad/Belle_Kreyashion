import mongoose from 'mongoose';

const deliveryZoneSchema = new mongoose.Schema({
  name:  { type: String, required: true, unique: true },
  fee:   { type: Number, required: true },
  active:{ type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model('DeliveryZone', deliveryZoneSchema);
