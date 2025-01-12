const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI);

const UserSchema = new mongoose.Schema({
    username: String,
    email: { type: String, unique: true },
    password: String,
    products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    purchases: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }]
});

const ProductSchema = new mongoose.Schema({
    title: String,
    description: String,
    price: Number,
    language: String,
    category: String,
    fileUrl: String,
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    ratings: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        score: Number,
        review: String
    }]
});

const User = mongoose.model('User', UserSchema);
const Product = mongoose.model('Product', ProductSchema);

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const authenticateToken = (req, res, next) => {
    const token = req.header('Authorization')?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Access denied' });

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        req.user = user;
        next();
    });
};

app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ username, email, password: hashedPassword });
        await user.save();
        
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
        res.json({ token, user: { id: user._id, username, email } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(400).json({ error: 'Invalid password' });

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
        res.json({ token, user: { id: user._id, username: user.username, email } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/products', authenticateToken, async (req, res) => {
    try {
        const { title, description, price, language, category, fileBase64 } = req.body;
        
        const uploadResponse = await cloudinary.uploader.upload(fileBase64, {
            resource_type: 'raw',
            folder: 'code_files'
        });

        const product = new Product({
            title,
            description,
            price,
            language,
            category,
            fileUrl: uploadResponse.secure_url,
            author: req.user.id
        });

        await product.save();
        await User.findByIdAndUpdate(req.user.id, { $push: { products: product._id } });
        res.json(product);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/products', async (req, res) => {
    try {
        const { page = 1, limit = 10, category, language, search } = req.query;
        let query = {};

        if (category) query.category = category;
        if (language) query.language = language;
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        const products = await Product.find(query)
            .populate('author', 'username')
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .sort({ createdAt: -1 });

        const total = await Product.countDocuments(query);
        res.json({ products, total, pages: Math.ceil(total / limit) });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/products/:id/purchase', authenticateToken, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ error: 'Product not found' });

        await User.findByIdAndUpdate(req.user.id, { $push: { purchases: product._id } });
        res.json({ message: 'Purchase successful', downloadUrl: product.fileUrl });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/products/:id/rate', authenticateToken, async (req, res) => {
    try {
        const { score, review } = req.body;
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ error: 'Product not found' });

        const rating = { user: req.user.id, score, review };
        product.ratings.push(rating);
        await product.save();
        res.json(product);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
