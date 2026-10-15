const dns = require('dns');
const mongoose = require('mongoose');

// Some networks / internet providers block the DNS lookup that "mongodb+srv://" links need
// (error: "querySrv ECONNREFUSED"). Asking public DNS servers instead fixes it.
dns.setServers(['8.8.8.8', '1.1.1.1']);

module.exports = async () => {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is missing. Copy .env.example to .env and fill it in.');
  mongoose.set('strictQuery', true);
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('MongoDB connected');
};
