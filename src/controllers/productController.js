const Product = require('../models/Product');
const cloudinary = require('cloudinary').v2;

exports.createProduct = async (req, res) => {
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
        res.status(201).json(product);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getProducts = async (req, res) => {
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
        res.json({
            products,
            total,
            pages: Math.ceil(total / limit)
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id)
            .populate('author', 'username')
            .populate('ratings.user', 'username');
            
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        
        res.json(product);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
