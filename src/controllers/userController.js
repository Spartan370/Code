const User = require('../models/User');
const Product = require('../models/Product');

exports.getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .select('-password')
            .populate('products')
            .populate('purchases');
        
        const stats = {
            totalProducts: user.products.length,
            totalPurchases: user.purchases.length,
            totalEarnings: await calculateEarnings(user._id),
            averageRating: await calculateAverageRating(user._id)
        };

        res.json({ user, stats });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const { username, email } = req.body;
        const user = await User.findByIdAndUpdate(
            req.user.id,
            { username, email },
            { new: true }
        ).select('-password');

        res.json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getUserProducts = async (req, res) => {
    try {
        const products = await Product.find({ author: req.user.id })
            .populate('ratings.user', 'username');
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getUserPurchases = async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .populate({
                path: 'purchases',
                populate: { path: 'author', select: 'username' }
            });
        res.json(user.purchases);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const calculateEarnings = async (userId) => {
    const products = await Product.find({ author: userId });
    return products.reduce((total, product) => total + (product.downloads * product.price), 0);
};

const calculateAverageRating = async (userId) => {
    const products = await Product.find({ author: userId });
    const ratings = products.flatMap(product => product.ratings.map(r => r.score));
    return ratings.length ? ratings.reduce((a, b) => a + b) / ratings.length : 0;
};
